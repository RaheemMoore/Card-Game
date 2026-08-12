#!/usr/bin/env node
// Sanitized AI project snapshot exporter.
// Walks the repo, excludes secrets/generated art/build output, stages a sanitized
// copy, generates machine- and human-readable manifests, zips it, and verifies
// the zip before declaring success. See docs/AI_SNAPSHOT_WORKFLOW.md.

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_BINARY_BYTES = 500 * 1024;
const MAX_ZIP_BYTES = 100 * 1024 * 1024;

const EXCLUDE_DIR_NAMES = new Set([
  'node_modules', '.git', 'dist', 'build', 'out',
  '.next', '.nuxt', '.svelte-kit', '.turbo', '.vercel',
  'coverage', '.cache', '.parcel-cache', '.pnpm-store', '.yarn',
  'ai-snapshot-output',
]);

// Path prefixes (relative to repo root, POSIX separators) excluded wholesale.
const EXCLUDE_PATH_PREFIXES = [
  '.claude/worktrees/',
  'scratchpad/',
];

// .claude/ is otherwise noisy (local settings, stale worktrees); only these
// sub-paths are studio scaffolding worth keeping, mirroring the project's own
// .gitignore allowlist for .claude/*.
const CLAUDE_ALLOW_PREFIXES = [
  '.claude/agents/', '.claude/skills/', '.claude/verify/', '.claude/hooks/',
  '.claude/process-logs/', '.claude/launch.json',
];

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts',
  '.json', '.md', '.mdx', '.txt', '.rtf',
  '.css', '.scss', '.sass', '.less', '.html', '.htm',
  '.sql', '.yml', '.yaml', '.toml', '.sh', '.bash', '.zsh', '.py',
]);
const TEXT_FILENAMES = new Set([
  'README', 'LICENSE', 'Dockerfile', '.gitignore', '.npmrc', '.editorconfig',
  '.oxlintrc.json', '.env.example',
]);

// Filename/extension patterns that are always excluded outright, regardless
// of size. Secrets are never redacted-and-kept — the whole file is dropped.
const HARD_EXCLUDE_RULES = [
  { re: /^\.env(\..*)?$/, allow: (n) => n === '.env.example', reason: 'environment file (potential secrets)' },
  { re: /\.(pem|key|p12|pfx)$/i, reason: 'credential / certificate file' },
  { re: /\.(zip|tar|tgz|rar|7z)$/i, reason: 'archive file' },
  { re: /\.(docx|doc|pptx|xlsx|xls)$/i, reason: 'binary office document, low review value' },
  { re: /^\.DS_Store$/, reason: 'OS metadata' },
  { re: /\.(mp4|mov|webm|avi|mkv)$/i, reason: 'video file' },
  { re: /\.(mp3|wav|ogg|flac|m4a)$/i, reason: 'audio file' },
  { re: /\.(ttf|otf|woff2?|eot)$/i, reason: 'font binary' },
  { re: /\.(psd|ai|sketch|fig)$/i, reason: 'design source binary' },
  { re: /\.(db|sqlite3?)$/i, reason: 'local database file' },
  { re: /\.map$/i, reason: 'generated build sourcemap' },
  { re: /\.tsbuildinfo$/i, reason: 'build cache' },
];

// Binary asset path-prefix rules: category + forced include/exclude decision.
// Order matters — first match wins. Prefixes are relative to repo root.
const ASSET_PREFIX_RULES = [
  { prefix: 'card-engine/public/assets/icons/', category: 'ui-icon', force: 'include' },
  { prefix: 'card-engine/public/assets/badges/', category: 'ui-badge', force: 'include' },
  { prefix: 'card-engine/public/assets/economy/', category: 'ui-economy-icon', force: 'include' },
  { prefix: 'card-engine/public/assets/elements/', category: 'ui-element-swatch', force: 'include' },
  { prefix: 'card-engine/public/assets/borders/', category: 'card-frame', force: 'exclude' },
  { prefix: 'card-engine/public/assets/archetype-emblems/', category: 'archetype-emblem', force: 'exclude' },
  { prefix: 'card-engine/public/assets/backgrounds/', category: 'background', force: 'exclude' },
  { prefix: 'card-engine/public/assets/combat/', category: 'combat-sprite', force: 'exclude' },
  { prefix: 'card-engine/public/assets/portraits/', category: 'portrait', force: 'exclude' },
  { prefix: 'card-engine/public/assets/dev-portraits/', category: 'dev-portrait', force: 'exclude' },
  { prefix: 'card-engine/public/assets/abilities/', category: 'ability-art', force: 'exclude' },
  { prefix: 'card-engine/public/portraits/', category: 'portrait-sample', force: 'exclude' },
  { prefix: 'Card Images/', category: 'reference-art', force: 'exclude' },
  { prefix: 'Card Game Architype Symbols & Prompts/', category: 'reference-art', force: 'exclude' },
  { prefix: 'Classes and Boss Battles/', category: 'reference-art', force: 'exclude' },
];

// Never printed — only pattern name + file path are reported.
const SECRET_PATTERNS = [
  { name: 'anthropic-api-key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'openai-api-key', re: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { name: 'generic-bearer-token', re: /\bBearer\s+[A-Za-z0-9._-]{24,}\b/ },
  { name: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { name: 'private-key-block', re: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  { name: 'aws-access-key-id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'postgres-connection-string', re: /\bpostgres(?:ql)?:\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/ },
  { name: 'generic-quoted-secret-assignment', re: /(?:api[_-]?key|secret|access[_-]?token|password)\s*[:=]\s*['"][A-Za-z0-9\-_.]{16,}['"]/i },
  { name: 'vercel-token', re: /\bvercel_[A-Za-z0-9]{20,}\b/i },
  { name: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
];

const DEPENDENCY_PURPOSE = {
  '@fontsource/dm-sans': 'bundled webfont',
  '@supabase/supabase-js': 'Supabase client SDK (db/auth/storage)',
  idb: 'IndexedDB wrapper (legacy localStorage-era fallback)',
  'lucide-react': 'icon set',
  react: 'UI framework',
  'react-dom': 'React DOM renderer',
  'react-router-dom': 'client-side routing',
  '@tailwindcss/vite': 'Tailwind v4 Vite plugin',
  '@types/jsdom': 'TS types for jsdom (tests)',
  '@types/node': 'TS types for Node',
  '@types/react': 'TS types for React',
  '@types/react-dom': 'TS types for React DOM',
  '@vercel/node': 'Vercel serverless function runtime types',
  '@vitejs/plugin-react': 'Vite React plugin',
  '@vitest/ui': 'Vitest UI runner',
  jsdom: 'DOM environment for tests',
  oxlint: 'linter',
  tailwindcss: 'utility-first CSS framework',
  typescript: 'language / compiler',
  vite: 'dev server + bundler',
  vitest: 'test runner',
};

const GAME_SYSTEM_DESCRIPTIONS = {
  combat: 'Boss battle turn-based combat: deterministic reducer, seeded RNG, formulas, presentation layer.',
  abilities: 'Ability system: registry, seeding, proposals, duplicate detection, validation, discovery ledger, moderation, art pipeline.',
  bosses: 'Boss registry and seed data for boss battle encounters.',
  economy: 'Two-currency wallet/ledger: reserve-commit-refund transactions, pricing calculator, validation.',
  minigames: 'Mini-game services (e.g. forge-strike) driving card leveling/progression.',
  forge: 'Card forge flow services supporting the archetype -> pillars -> element -> generation pipeline.',
  persistence: 'Supabase-backed stores (cards, ledger, abilities, bosses) plus sync queue and migration helpers.',
  imageEngine: 'Portrait/emblem prompt assembly and Leonardo integration services.',
  loreEngine: 'Claude-driven lore/text generation pipeline services.',
  narrativeAxes: 'Narrative axis data (e.g. Seraph alignment) driving tier-up transmutation logic.',
  archetypeBible: 'Per-archetype Bible chapters (identity, tensions, prestige, visual language) consumed by the generation pipeline.',
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextFile(basename, ext) {
  if (TEXT_FILENAMES.has(basename)) return true;
  if (basename.startsWith('.env')) return basename === '.env.example';
  return TEXT_EXTENSIONS.has(ext);
}

function matchHardExclude(basename) {
  for (const rule of HARD_EXCLUDE_RULES) {
    if (rule.re.test(basename)) {
      if (rule.allow && rule.allow(basename)) continue;
      return rule.reason;
    }
  }
  return null;
}

function matchAssetPrefixRule(relPosixPath) {
  for (const rule of ASSET_PREFIX_RULES) {
    if (relPosixPath.startsWith(rule.prefix)) return rule;
  }
  return null;
}

function isExcludedPath(relPosixPath) {
  for (const prefix of EXCLUDE_PATH_PREFIXES) {
    if (relPosixPath === prefix.replace(/\/$/, '') || relPosixPath.startsWith(prefix)) return true;
  }
  if (relPosixPath.startsWith('.claude/')) {
    return !CLAUDE_ALLOW_PREFIXES.some((p) => relPosixPath === p || relPosixPath.startsWith(p));
  }
  return false;
}

// ---------------------------------------------------------------------------
// Archiving
// ---------------------------------------------------------------------------

// Info-ZIP's `zip` ships with macOS and most Linux distros but not with
// Windows. PowerShell's Compress-Archive is not a usable substitute here —
// it fails outright on this repo's longest staged paths (bg-harness reference
// art names run past MAX_PATH). So the fallback writes the archive directly
// with zlib, which goes through Node's fs and has no such limit.
// `unzip` (used for verification) is present on all three platforms via Git
// for Windows.

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function listFilesRecursive(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(abs, base));
    else if (entry.isFile()) out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
  return out;
}

function writeZipWithZlib(zipPath, stagingDir) {
  const local = [];
  const central = [];
  let offset = 0;

  for (const rel of listFilesRecursive(stagingDir)) {
    const data = fs.readFileSync(path.join(stagingDir, rel));
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;
    const name = Buffer.from(rel, 'utf8');
    const crc = crc32(data);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);          // version needed
    lh.writeUInt16LE(0x0800, 6);      // UTF-8 filename flag
    lh.writeUInt16LE(method, 8);
    lh.writeUInt32LE(0, 10);          // dos time/date — zeroed, like `zip -X`
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(body.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    local.push(lh, name, body);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);          // version made by
    ch.writeUInt16LE(20, 6);          // version needed
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(method, 10);
    ch.writeUInt32LE(0, 12);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(body.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE((0o100644 << 16) >>> 0, 38); // external attrs: regular file 0644
    ch.writeUInt32LE(offset, 42);
    central.push(ch, name);

    offset += 30 + name.length + body.length;
  }

  const centralBuf = Buffer.concat(central);
  const count = central.length / 2;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(count, 8);
  eocd.writeUInt16LE(count, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  fs.writeFileSync(zipPath, Buffer.concat([...local, centralBuf, eocd]));
}

function zipStaging(zipPath, stagingDir) {
  try {
    execFileSync('zip', ['-rXq', zipPath, '.'], { cwd: stagingDir });
    return;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  fs.rmSync(zipPath, { force: true });
  writeZipWithZlib(zipPath, stagingDir);
}

// ---------------------------------------------------------------------------
// Repo root + output dir
// ---------------------------------------------------------------------------

function resolveRepoRoot() {
  let root;
  try {
    root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch {
    console.error('FATAL: not inside a git repository. Refusing to run.');
    process.exit(1);
  }
  return root;
}

const repoRoot = resolveRepoRoot();
const outputDir = path.join(repoRoot, 'ai-snapshot-output');
const stagingDir = path.join(outputDir, 'staging');
const manifestDirRel = 'ai-project-manifest';
const manifestDir = path.join(stagingDir, manifestDirRel);

// ---------------------------------------------------------------------------
// Walk
// ---------------------------------------------------------------------------

const included = []; // { rel, ext, bytes, sha256, mtime, category }
const excludedAssets = []; // binary/media assets, included or excluded
const excludedOther = []; // env/secrets/archives/office docs/etc.
const warnings = [];
const secretHits = []; // { rel, pattern } — files removed before zipping

function walk(dirAbs) {
  let entries;
  try {
    entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  } catch (err) {
    warnings.push(`Could not read directory ${dirAbs}: ${err.message}`);
    return;
  }
  for (const entry of entries) {
    const abs = path.join(dirAbs, entry.name);
    const relPosix = toPosix(path.relative(repoRoot, abs));

    if (entry.isSymbolicLink()) {
      try {
        const real = fs.realpathSync(abs);
        if (!real.startsWith(repoRoot + path.sep)) {
          warnings.push(`Skipped symlink outside repo: ${relPosix}`);
          continue;
        }
      } catch {
        warnings.push(`Skipped broken symlink: ${relPosix}`);
        continue;
      }
      warnings.push(`Skipped symlink (not followed): ${relPosix}`);
      continue;
    }

    if (entry.isDirectory()) {
      if (EXCLUDE_DIR_NAMES.has(entry.name)) continue;
      if (isExcludedPath(relPosix + '/')) continue;
      walk(abs);
      continue;
    }

    if (!entry.isFile()) continue;
    if (isExcludedPath(relPosix)) continue;
    processFile(abs, relPosix, entry.name);
  }
}

function processFile(abs, relPosix, basename) {
  const hardReason = matchHardExclude(basename);
  if (hardReason) {
    const stat = fs.statSync(abs);
    excludedOther.push({ rel: relPosix, bytes: stat.size, reason: hardReason });
    return;
  }

  const ext = path.extname(basename).toLowerCase();
  const stat = fs.statSync(abs);

  if (ext === '.svg') {
    if (stat.size <= MAX_BINARY_BYTES) {
      includeFile(abs, relPosix, ext, stat);
    } else {
      excludedAssets.push({ rel: relPosix, type: 'svg', bytes: stat.size, status: 'excluded', reason: 'oversized SVG (likely embeds raster data)', category: 'ui-icon' });
    }
    return;
  }

  if (isTextFile(basename, ext)) {
    includeFile(abs, relPosix, ext, stat);
    return;
  }

  // Binary asset: apply category rules, then generic threshold.
  const rule = matchAssetPrefixRule(relPosix);
  const category = rule ? rule.category : 'binary-other';
  if (rule && rule.force === 'include') {
    if (stat.size <= MAX_BINARY_BYTES) {
      includeFile(abs, relPosix, ext, stat);
      excludedAssets.push({ rel: relPosix, type: ext.replace('.', ''), bytes: stat.size, status: 'included', reason: 'structural UI asset under size threshold', category });
    } else {
      excludedAssets.push({ rel: relPosix, type: ext.replace('.', ''), bytes: stat.size, status: 'excluded', reason: 'exceeds 500KB threshold despite UI category', category });
    }
    return;
  }
  if (rule && rule.force === 'exclude') {
    excludedAssets.push({ rel: relPosix, type: ext.replace('.', ''), bytes: stat.size, status: 'excluded', reason: 'generated/replaceable art — manifest only', category });
    return;
  }
  // Generic fallback binary.
  if (stat.size <= MAX_BINARY_BYTES) {
    includeFile(abs, relPosix, ext, stat);
    excludedAssets.push({ rel: relPosix, type: ext.replace('.', '') || 'unknown', bytes: stat.size, status: 'included', reason: 'binary under 500KB threshold', category });
  } else {
    excludedAssets.push({ rel: relPosix, type: ext.replace('.', '') || 'unknown', bytes: stat.size, status: 'excluded', reason: 'exceeds 500KB size threshold', category });
  }
}

function includeFile(abs, relPosix, ext, stat) {
  const destAbs = path.join(stagingDir, relPosix);
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.copyFileSync(abs, destAbs);
  const buf = fs.readFileSync(abs);
  included.push({
    rel: relPosix,
    ext: ext || '(none)',
    bytes: stat.size,
    sha256: sha256(buf),
    mtime: stat.mtime.toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Secret scan (staged text files only)
// ---------------------------------------------------------------------------

function scanForSecrets() {
  const textExtSet = new Set([...TEXT_EXTENSIONS, '.svg']);
  let removedAny = false;
  for (const file of [...included]) {
    const isTextLike = textExtSet.has(path.extname(file.rel).toLowerCase()) || TEXT_FILENAMES.has(path.basename(file.rel));
    if (!isTextLike) continue;
    // .env.example is verified placeholder-only (spec explicitly allows this)
    // and its own placeholder values (e.g. "sk-ant-server-only-key") are long
    // enough to trip the generic key-shaped patterns below as a false positive.
    if (path.basename(file.rel) === '.env.example') continue;
    const abs = path.join(stagingDir, file.rel);
    let content;
    try {
      content = fs.readFileSync(abs, 'utf8');
    } catch {
      continue; // not valid utf8 text; skip scan
    }
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.re.test(content)) {
        secretHits.push({ rel: file.rel, pattern: pattern.name });
        fs.rmSync(abs);
        const idx = included.findIndex((f) => f.rel === file.rel);
        if (idx !== -1) included.splice(idx, 1);
        excludedOther.push({ rel: file.rel, bytes: file.bytes, reason: `removed by secret scan (pattern: ${pattern.name})` });
        removedAny = true;
        break;
      }
    }
  }
  return removedAny;
}

// ---------------------------------------------------------------------------
// Manifest generation
// ---------------------------------------------------------------------------

function buildFileTree() {
  const lines = [];
  const excludedTop = [];
  for (const name of EXCLUDE_DIR_NAMES) {
    if (fs.existsSync(path.join(repoRoot, name))) excludedTop.push(name);
  }
  for (const prefix of EXCLUDE_PATH_PREFIXES) {
    if (fs.existsSync(path.join(repoRoot, prefix))) excludedTop.push(prefix);
  }

  function addDir(relDir, depth) {
    const abs = path.join(stagingDir, relDir);
    let entries;
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      lines.push(`${'  '.repeat(depth)}${entry.isDirectory() ? entry.name + '/' : entry.name}`);
      if (entry.isDirectory()) addDir(rel, depth + 1);
    }
  }
  addDir('', 0);

  let out = '# Included file tree\n\n```\n' + lines.join('\n') + '\n```\n\n';
  out += '# Excluded top-level paths\n\n';
  out += '| Path | Reason |\n|---|---|\n';
  const reasonFor = (p) => {
    if (p === 'node_modules') return 'npm dependencies — reinstallable from package-lock.json';
    if (p === '.git') return 'version control history — not needed for a code review snapshot';
    if (p === 'dist' || p === 'build' || p === 'out') return 'build output — regenerable from source';
    if (p === '.vercel') return 'local Vercel deploy-link metadata';
    if (p === 'coverage') return 'generated test coverage report';
    if (p === 'ai-snapshot-output') return 'this exporter\'s own output directory (never self-nest)';
    if (p.startsWith('.claude/worktrees')) return 'stale git worktrees (contain their own .git) — not project source';
    if (p.startsWith('scratchpad')) return 'session-local scratch directory — not project source';
    return 'excluded per exporter config';
  };
  for (const p of excludedTop) out += `| ${p} | ${reasonFor(p)} |\n`;
  return out;
}

function detectRoutes() {
  const lines = ['# Detected routes\n', '_Detected via static regex scan of staged files — not exhaustive; verify against source for anything load-bearing._\n'];
  lines.push('\n## Client routes (react-router)\n');
  const routeRe = /<Route\s+[^>]*path=["']([^"']+)["'][^>]*\/?>/g;
  const found = [];
  const walkStaged = (relDir) => {
    const abs = path.join(stagingDir, relDir);
    let entries;
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { walkStaged(rel); continue; }
      if (!/\.(tsx|ts|jsx|js)$/.test(entry.name)) continue;
      let content;
      try { content = fs.readFileSync(path.join(abs), 'utf8'); } catch { continue; }
      let m;
      routeRe.lastIndex = 0;
      while ((m = routeRe.exec(content))) found.push({ route: m[1], file: rel });
    }
  };
  walkStaged('card-engine/src');
  if (found.length === 0) lines.push('_None detected._');
  else {
    lines.push('| Route | Source file |\n|---|---|');
    for (const f of found) lines.push(`| \`${f.route}\` | ${f.file} |`);
  }

  lines.push('\n## Server routes (Vercel functions under card-engine/api)\n');
  const apiDir = path.join(stagingDir, 'card-engine/api');
  let apiFiles = [];
  try { apiFiles = fs.readdirSync(apiDir, { withFileTypes: true }).filter((e) => e.isFile() && /\.ts$/.test(e.name)); } catch { /* none staged */ }
  if (apiFiles.length === 0) lines.push('_None detected._');
  else {
    lines.push('| Route | Source file | Auth |\n|---|---|---|');
    for (const f of apiFiles) {
      const name = f.name.replace(/\.ts$/, '');
      let auth = 'unknown (not statically determinable)';
      try {
        const content = fs.readFileSync(path.join(apiDir, f.name), 'utf8');
        if (/requireAuth|verifyJwt|getUser\(/.test(content)) auth = 'appears JWT-gated (detected auth helper call)';
      } catch { /* ignore */ }
      lines.push(`| \`/api/${name}\` | card-engine/api/${f.name} | ${auth} |`);
    }
  }
  return lines.join('\n') + '\n';
}

function detectComponents() {
  const lines = ['# Major reusable UI components\n', '_Detected via static regex scan of card-engine/src/components — heuristic, prioritizes files with a default export. Not every helper is listed._\n'];
  const compDir = path.join(stagingDir, 'card-engine/src/components');
  const rows = [];
  const walkComp = (relDir) => {
    const abs = path.join(compDir, relDir);
    let entries;
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { walkComp(rel); continue; }
      if (!/\.tsx$/.test(entry.name)) continue;
      let content;
      try { content = fs.readFileSync(path.join(abs), 'utf8'); } catch { continue; }
      const nameMatch = content.match(/export default function (\w+)/) || content.match(/export function (\w+)/) || content.match(/const (\w+):?[^=]*=\s*\(/);
      const name = nameMatch ? nameMatch[1] : entry.name.replace(/\.tsx$/, '');
      const propsMatch = content.match(new RegExp(`interface ${name}Props\\s*{([^}]*)}`));
      const props = propsMatch ? propsMatch[1].trim().split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 8).join('; ') : '(not statically detected)';
      rows.push({ name, path: `card-engine/src/components/${rel}`, props });
    }
  };
  walkComp('');
  if (rows.length === 0) lines.push('_None detected._');
  else {
    lines.push('| Component | Path | Detected props |\n|---|---|---|');
    for (const r of rows) lines.push(`| ${r.name} | ${r.path} | ${r.props} |`);
  }
  return lines.join('\n') + '\n';
}

function detectGameSystems() {
  const lines = ['# Game systems — implementation locations\n', '_Directory list is factual (read from disk); descriptions are short factual summaries of what the directory contains, not inferred mechanics beyond that._\n'];
  for (const base of ['card-engine/src/services', 'card-engine/src/data']) {
    const abs = path.join(stagingDir, base);
    let entries;
    try { entries = fs.readdirSync(abs, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch { continue; }
    lines.push(`\n## ${base}\n`);
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const desc = GAME_SYSTEM_DESCRIPTIONS[entry.name] || 'Implementation directory — see file list for detail.';
      let fileCount = 0;
      try { fileCount = fs.readdirSync(path.join(abs, entry.name)).length; } catch { /* ignore */ }
      lines.push(`- **${entry.name}/** (${fileCount} files) — ${desc}`);
    }
  }
  return lines.join('\n') + '\n';
}

function detectDataModel() {
  const lines = ['# Data model\n', '- **Database:** Supabase (Postgres + RLS + Storage).\n'];
  const migDir = path.join(stagingDir, 'card-engine/supabase/migrations');
  let files = [];
  try { files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort(); } catch { /* none */ }
  lines.push(`- **Migrations:** ${files.length} files in \`card-engine/supabase/migrations/\`.\n`);
  lines.push('| Migration | Tables created | RLS policies |\n|---|---|---|');
  for (const f of files) {
    let content = '';
    try { content = fs.readFileSync(path.join(migDir, f), 'utf8'); } catch { /* ignore */ }
    const tables = (content.match(/CREATE TABLE[^(]*/gi) || []).length;
    const policies = (content.match(/CREATE POLICY/gi) || []).length;
    lines.push(`| ${f} | ${tables} | ${policies} |`);
  }
  const readmeAbs = path.join(stagingDir, 'card-engine/supabase/README.md');
  if (fs.existsSync(readmeAbs)) lines.push('\nSee `card-engine/supabase/README.md` for schema narrative and the manual dashboard step required.\n');
  return lines.join('\n') + '\n';
}

function detectDependencies(pkgJson) {
  const lines = ['# Dependencies\n', '_Purpose column is inferred from package name/known role unless the project docs state otherwise._\n'];
  for (const [label, deps] of [['Production', pkgJson.dependencies], ['Development', pkgJson.devDependencies]]) {
    lines.push(`\n## ${label}\n`);
    lines.push('| Package | Version | Purpose (inferred) |\n|---|---|---|');
    for (const [name, version] of Object.entries(deps || {})) {
      lines.push(`| ${name} | ${version} | ${DEPENDENCY_PURPOSE[name] || '(inferred from name only)'} |`);
    }
  }
  return lines.join('\n') + '\n';
}

function detectRecentChanges() {
  let log;
  try {
    log = execFileSync('git', ['log', '-30', '--stat', '--date=short', '--pretty=format:## %h %ad%n%s%n'], { cwd: repoRoot, encoding: 'utf8' });
  } catch {
    return '# Recent changes\n\nGit history is unavailable in this environment.\n';
  }
  let filesChanged;
  try {
    filesChanged = execFileSync('git', ['log', '-30', '--name-only', '--pretty=format:'], { cwd: repoRoot, encoding: 'utf8' })
      .split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    filesChanged = [];
  }
  const freq = new Map();
  for (const f of filesChanged) freq.set(f, (freq.get(f) || 0) + 1);
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);

  let out = '# Recent changes (last 30 commits)\n\n## Commit log\n\n```\n' + log + '\n```\n\n';
  out += '## Most frequently changed files in this window\n\n| File | Times changed |\n|---|---|\n';
  for (const [f, c] of top) out += `| ${f} | ${c} |\n`;
  return out;
}

function detectDependenciesFromPkg() {
  const pkgAbs = path.join(stagingDir, 'card-engine/package.json');
  if (!fs.existsSync(pkgAbs)) return null;
  return JSON.parse(fs.readFileSync(pkgAbs, 'utf8'));
}

function buildAssetsJson() {
  return JSON.stringify(excludedAssets, null, 2);
}

function buildFilesJson() {
  return JSON.stringify(included.map((f) => ({
    path: f.rel, ext: f.ext, bytes: f.bytes, sha256: f.sha256, mtime: f.mtime,
  })), null, 2);
}

function buildExclusionsDoc() {
  const lines = ['# Exclusion rules and rationale\n'];
  lines.push('## Directory-name exclusions (any depth)\n');
  for (const name of EXCLUDE_DIR_NAMES) lines.push(`- \`${name}\``);
  lines.push('\n## Path-prefix exclusions\n');
  for (const p of EXCLUDE_PATH_PREFIXES) lines.push(`- \`${p}\` — stale/irrelevant to project source`);
  lines.push('- `.claude/*` except agents/skills/verify/hooks/process-logs/launch.json — mirrors the project\'s own .gitignore allowlist');
  lines.push('\n## Filename/extension hard-excludes\n');
  lines.push('| Pattern | Reason |\n|---|---|');
  for (const r of HARD_EXCLUDE_RULES) lines.push(`| \`${r.re}\` | ${r.reason} |`);
  lines.push('\n## Binary asset category rules\n');
  lines.push('| Path prefix | Category | Decision |\n|---|---|---|');
  for (const r of ASSET_PREFIX_RULES) lines.push(`| ${r.prefix} | ${r.category} | ${r.force} |`);
  lines.push(`\nAny other binary file: included if ≤ ${MAX_BINARY_BYTES / 1024}KB, excluded (manifest-only) otherwise.\n`);
  lines.push('\n## Files excluded larger than the size threshold\n');
  const big = excludedAssets.filter((a) => a.status === 'excluded' && /threshold/.test(a.reason));
  lines.push('| Path | Size | Reason |\n|---|---|---|');
  for (const a of big) lines.push(`| ${a.rel} | ${fmtBytes(a.bytes)} | ${a.reason} |`);
  lines.push('\n## Sensitive files excluded by path (values never inspected/printed)\n');
  lines.push('| Path | Reason |\n|---|---|');
  for (const e of excludedOther) lines.push(`| ${e.rel} | ${e.reason} |`);
  return lines.join('\n') + '\n';
}

function buildSecurityVerification(preZipRemoved) {
  const lines = ['# Security verification\n'];
  lines.push('## Secret scan (staged text files)\n');
  if (preZipRemoved.length === 0) {
    lines.push('No likely secrets detected in any staged file.\n');
  } else {
    lines.push('The following files matched a likely-secret pattern and were **removed from the snapshot** (paths only — no values were printed or retained):\n');
    lines.push('| Path | Pattern matched |\n|---|---|');
    for (const h of preZipRemoved) lines.push(`| ${h.rel} | ${h.pattern} |`);
  }
  lines.push('\n## Sample environment file — manually verified placeholder-only\n');
  lines.push('`card-engine/.env.example` is included in the snapshot. It is exempted from');
  lines.push('the automated regex scan because its placeholder values (e.g.');
  lines.push('`sk-ant-server-only-key`) are long enough to superficially resemble a real');
  lines.push('key and would otherwise be a guaranteed false positive. It was manually');
  lines.push('reviewed before this exemption was added: every value is an obvious');
  lines.push('placeholder (`your-project-ref`, `server-only-key`, `-here` suffixes) with');
  lines.push('no real credential.\n');
  lines.push('\n## Known-sensitive files excluded before scanning even ran\n');
  const secretish = excludedOther.filter((e) => /environment file|credential|removed by secret scan/.test(e.reason));
  if (secretish.length === 0) lines.push('_None found beyond the explicit .env* exclusions below._\n');
  lines.push('| Path | Reason |\n|---|---|');
  for (const e of excludedOther.filter((e2) => /environment file|credential/.test(e2.reason))) lines.push(`| ${e.rel} | ${e.reason} |`);
  return lines.join('\n') + '\n';
}

function buildProjectIndex(pkgJson, generatedAt) {
  const lines = [];
  lines.push('# PROJECT_INDEX\n');
  lines.push(`**Project:** Card Engine — Fantasy TCG (card-engine)`);
  lines.push(`**Snapshot generated:** ${generatedAt}\n`);
  lines.push('## Technology stack (detected)\n');
  lines.push('- React 19 + Vite 8 + TypeScript 6 (card-engine/package.json)');
  lines.push('- Tailwind CSS v4 (`@theme` block in index.css, not tailwind.config)');
  lines.push('- react-router-dom v7');
  lines.push('- Supabase (Postgres + RLS + Storage) for persistence');
  lines.push('- Vercel serverless functions under card-engine/api/ proxy paid providers (Anthropic Claude Haiku 4.5, Leonardo Phoenix)');
  lines.push('- npm (package-lock.json present; no yarn.lock/pnpm-lock.yaml)\n');
  lines.push('## Startup / build commands (from package.json)\n');
  lines.push('```\ncd card-engine\nnpm install\nnpm run dev     # Vite dev server on :5173\nnpm run build   # tsc -b && vite build\nnpm test        # vitest run\nnpm run lint    # oxlint\n```\n');
  lines.push('## High-level architecture\n');
  lines.push('- `card-engine/src/pages` — route-level screens (CardForge, Collection, CardDetail, battle, warband, minigames, admin).');
  lines.push('- `card-engine/src/components` — reusable UI (economy, admin, abilities, forge, nav).');
  lines.push('- `card-engine/src/services` — business logic (combat, economy, abilities, bosses, persistence, image/lore engines, minigames).');
  lines.push('- `card-engine/src/data` — static/catalog data (archetype Bible chapters, story pillars, elements, power system, economy catalogs, ability/boss seeds, narrative axes).');
  lines.push('- `card-engine/api` — server-side Vercel functions proxying Anthropic/Leonardo/S3; every provider secret stays server-side.');
  lines.push('- `card-engine/supabase/migrations` — schema + RLS source of truth.\n');
  lines.push('## Documentation index (canonical docs kept in full)\n');
  lines.push('- `Character_Generation_Bible_Canonical_v1.md` — canonical creative source, overrides implementation on conflict.');
  lines.push('- `CLAUDE.md` — project instructions / current phase status / conventions.');
  lines.push('- `card-engine-power-system-spec.md`, `card-engine-economy-currency-system-plan.md`, `card-engine-ability-system-spec.md`, `card-engine-boss-battle-spec.md`, `card-engine-warband-battle-design.md` — governing specs.');
  lines.push('- `STUDIO_CHARTER.md`, `WORKFLOW.md` — how this repo is operated.');
  lines.push('- `docs/archive/*.md` — retired docs kept for history; do not treat as current.\n');
  lines.push('## Known excluded/generated areas (see EXCLUSIONS.md and assets.json)\n');
  lines.push('- All generated character/card/boss art, backgrounds, and combat sprites — manifest-only.');
  lines.push('- node_modules, dist, .git, .vercel, coverage — regenerable or version-control internals.');
  lines.push('- All real `.env*` files and any file matching a credential pattern — never included, never redacted-and-kept.\n');
  lines.push('## How to navigate this snapshot\n');
  lines.push('1. Start with this file and `GAME_SYSTEMS.md` for a system-by-system map.');
  lines.push('2. `ROUTES.md` / `COMPONENTS.md` for the UI surface; `DATA_MODEL.md` for schema.');
  lines.push('3. `FILE_TREE.txt` for the literal included tree; `FILES.json` for hashes/sizes if you need to verify integrity.');
  lines.push('4. `assets.json` lists every binary asset considered, included or not, with the reason.');
  lines.push('5. Treat anything under `card-engine-*.md` and the root Bible/spec docs as authoritative design intent; treat `ROUTES.md`/`COMPONENTS.md`/`GAME_SYSTEMS.md` as **detected facts from static scanning**, not hand-curated documentation — cross-check against source when precision matters.\n');
  return lines.join('\n') + '\n';
}

function buildSnapshotReport({ generatedAt, repoSizeBytes, stagingSizeBytes, zipSizeBytes, verification }) {
  const lines = ['# SNAPSHOT_REPORT\n'];
  lines.push(`**Generated:** ${generatedAt}`);
  lines.push(`**Original repo size (excluding node_modules/.git):** ${fmtBytes(repoSizeBytes)}`);
  lines.push(`**Staged snapshot size:** ${fmtBytes(stagingSizeBytes)}`);
  lines.push(`**ZIP size:** ${fmtBytes(zipSizeBytes)} _(measured just before this report was folded into the archive; final size differs by well under 1KB)_`);
  lines.push(`**Included files:** ${included.length}`);
  lines.push(`**Excluded assets tracked:** ${excludedAssets.filter((a) => a.status === 'excluded').length}`);
  lines.push(`**Other excluded files (secrets/archives/office docs/etc.):** ${excludedOther.length}\n`);

  const typeDist = new Map();
  for (const f of included) typeDist.set(f.ext, (typeDist.get(f.ext) || 0) + 1);
  lines.push('## Included file-type distribution\n');
  lines.push('| Extension | Count |\n|---|---|');
  for (const [ext, count] of [...typeDist.entries()].sort((a, b) => b[1] - a[1])) lines.push(`| ${ext} | ${count} |`);

  lines.push('\n## Largest included files\n');
  lines.push('| Path | Size |\n|---|---|');
  for (const f of [...included].sort((a, b) => b.bytes - a.bytes).slice(0, 15)) lines.push(`| ${f.rel} | ${fmtBytes(f.bytes)} |`);

  lines.push('\n## Largest excluded files\n');
  lines.push('| Path | Size | Reason |\n|---|---|---|');
  for (const a of [...excludedAssets].filter((x) => x.status === 'excluded').sort((a2, b2) => b2.bytes - a2.bytes).slice(0, 15)) {
    lines.push(`| ${a.rel} | ${fmtBytes(a.bytes)} | ${a.reason} |`);
  }

  lines.push('\n## Warnings\n');
  lines.push(warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : '_None._');

  lines.push('\n## Possible missing context\n');
  lines.push('- Generated card/boss/portrait art is manifest-only — ChatGPT will see filenames/paths but not the images themselves.');
  lines.push('- `ROUTES.md`/`COMPONENTS.md` are heuristic static scans, not exhaustive documentation.');

  lines.push('\n## Verification results\n');
  for (const [k, v] of Object.entries(verification)) lines.push(`- ${k}: ${v ? 'PASS' : 'FAIL'}`);

  const allPass = Object.values(verification).every(Boolean);
  lines.push(`\n## Suitable for upload to ChatGPT: ${allPass && zipSizeBytes < MAX_ZIP_BYTES ? 'YES' : 'NO — see failing checks above'}\n`);
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Directory size helper (excluding the noise dirs we always skip)
// ---------------------------------------------------------------------------

function dirSizeBytes(rootAbs) {
  let total = 0;
  function rec(dirAbs) {
    let entries;
    try { entries = fs.readdirSync(dirAbs, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const abs = path.join(dirAbs, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDE_DIR_NAMES.has(entry.name)) continue;
        const relPosix = toPosix(path.relative(repoRoot, abs));
        if (isExcludedPath(relPosix + '/')) continue;
        rec(abs);
      } else if (entry.isFile()) {
        try { total += fs.statSync(abs).size; } catch { /* ignore */ }
      }
    }
  }
  rec(rootAbs);
  return total;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log(`Repo root: ${repoRoot}`);
  console.log('Cleaning previous staging directory...');
  fs.rmSync(stagingDir, { recursive: true, force: true });
  fs.mkdirSync(stagingDir, { recursive: true });

  console.log('Walking repository tree...');
  walk(repoRoot);
  console.log(`Included ${included.length} text/code/doc/small-binary files.`);

  console.log('Scanning staged text files for likely secrets...');
  let scanRounds = 0;
  let removedThisRound = true;
  while (removedThisRound && scanRounds < 5) {
    removedThisRound = scanForSecrets();
    scanRounds += 1;
  }
  if (secretHits.length > 0) {
    console.warn(`WARNING: removed ${secretHits.length} staged file(s) that matched a likely-secret pattern (see SECURITY_VERIFICATION.md).`);
  } else {
    console.log('No likely secrets detected.');
  }

  console.log('Generating manifests...');
  fs.mkdirSync(manifestDir, { recursive: true });
  const pkgJson = detectDependenciesFromPkg();
  const generatedAt = new Date().toISOString();

  fs.writeFileSync(path.join(manifestDir, 'FILE_TREE.txt'), buildFileTree());
  fs.writeFileSync(path.join(manifestDir, 'FILES.json'), buildFilesJson());
  fs.writeFileSync(path.join(manifestDir, 'assets.json'), buildAssetsJson());
  fs.writeFileSync(path.join(manifestDir, 'ROUTES.md'), detectRoutes());
  fs.writeFileSync(path.join(manifestDir, 'COMPONENTS.md'), detectComponents());
  fs.writeFileSync(path.join(manifestDir, 'GAME_SYSTEMS.md'), detectGameSystems());
  fs.writeFileSync(path.join(manifestDir, 'DATA_MODEL.md'), detectDataModel());
  if (pkgJson) fs.writeFileSync(path.join(manifestDir, 'DEPENDENCIES.md'), detectDependencies(pkgJson));
  fs.writeFileSync(path.join(manifestDir, 'RECENT_CHANGES.md'), detectRecentChanges());
  fs.writeFileSync(path.join(manifestDir, 'EXCLUSIONS.md'), buildExclusionsDoc());
  fs.writeFileSync(path.join(manifestDir, 'SECURITY_VERIFICATION.md'), buildSecurityVerification(secretHits));
  fs.writeFileSync(path.join(manifestDir, 'PROJECT_INDEX.md'), buildProjectIndex(pkgJson, generatedAt));

  // Re-count included files to reflect anything the manifest step itself added.
  const manifestFiles = fs.readdirSync(manifestDir).map((name) => path.join(manifestDirRel, name));
  console.log(`Wrote ${manifestFiles.length} manifest files.`);

  console.log('Computing sizes...');
  const repoSizeBytes = dirSizeBytes(repoRoot);
  const stagingSizeBytes = dirSizeBytes(stagingDir);

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const zipName = `card-game-ai-snapshot-${stamp}.zip`;
  const zipPath = path.join(outputDir, zipName);

  console.log(`Creating ZIP: ${zipName}`);
  fs.rmSync(zipPath, { force: true });
  zipStaging(zipPath, stagingDir);
  const zipSizeBytes = fs.statSync(zipPath).size;

  console.log('Verifying ZIP...');
  const verification = {};

  // -Z1 (zipinfo short format) lists bare entry paths only, one per line —
  // unlike `unzip -l`, it has no "Archive: <path-to-the-zip-itself>" header
  // line, which would otherwise false-positive a self-nesting check whenever
  // the zip's own path contains ai-snapshot-output/.
  const listing = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
  verification['no .env files in zip'] = !/\.env(?!\.example)/.test(listing) ;
  verification['no node_modules in zip'] = !listing.includes('node_modules/');
  verification['no .git in zip'] = !/(^|\/)\.git\//.test(listing);
  verification['no self-nested ai-snapshot-output'] = !listing.includes('ai-snapshot-output/');
  verification['card-engine/src present'] = listing.includes('card-engine/src/');
  verification['supabase/migrations present'] = listing.includes('supabase/migrations/');
  verification['ai-project-manifest present'] = listing.includes(`${manifestDirRel}/`);

  const verifyTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'card-game-snapshot-verify-'));
  try {
    execFileSync('unzip', ['-q', zipPath, '-d', verifyTmp]);
    let hashMismatch = false;
    for (const f of included) {
      const extractedAbs = path.join(verifyTmp, f.rel);
      if (!fs.existsSync(extractedAbs)) { hashMismatch = true; warnings.push(`Missing from extracted zip: ${f.rel}`); continue; }
      const extractedHash = sha256(fs.readFileSync(extractedAbs));
      if (extractedHash !== f.sha256) { hashMismatch = true; warnings.push(`Hash mismatch after extraction: ${f.rel}`); }
    }
    verification['extracted file hashes match FILES.json'] = !hashMismatch;

    let secretStillPresent = false;
    const textExtSet = new Set([...TEXT_EXTENSIONS, '.svg']);
    for (const f of included) {
      if (!textExtSet.has(path.extname(f.rel).toLowerCase()) && !TEXT_FILENAMES.has(path.basename(f.rel))) continue;
      if (path.basename(f.rel) === '.env.example') continue;
      const extractedAbs = path.join(verifyTmp, f.rel);
      let content;
      try { content = fs.readFileSync(extractedAbs, 'utf8'); } catch { continue; }
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.re.test(content)) { secretStillPresent = true; warnings.push(`Secret pattern '${pattern.name}' still present in extracted zip: ${f.rel}`); }
      }
    }
    verification['no secret patterns in extracted zip'] = !secretStillPresent;
  } finally {
    fs.rmSync(verifyTmp, { recursive: true, force: true });
  }

  // SNAPSHOT_REPORT.md needs the zip size + verification results, both of
  // which only exist after the zip is built and checked. Write it now, then
  // fold it into the already-created archive with `zip -u` (updates/adds one
  // entry in place) rather than re-zipping the whole staging tree.
  const report = buildSnapshotReport({ generatedAt, repoSizeBytes, stagingSizeBytes, zipSizeBytes, verification });
  fs.writeFileSync(path.join(outputDir, 'SNAPSHOT_REPORT.md'), report);
  fs.writeFileSync(path.join(manifestDir, 'SNAPSHOT_REPORT.md'), report);
  try {
    execFileSync('zip', ['-uXq', zipPath, path.join(manifestDirRel, 'SNAPSHOT_REPORT.md')], { cwd: stagingDir });
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    // No Info-ZIP available: the report is already inside the staging tree,
    // so a full re-zip folds it in just the same, only slower.
    fs.rmSync(zipPath, { force: true });
    zipStaging(zipPath, stagingDir);
  }
  const finalZipSizeBytes = fs.statSync(zipPath).size;

  const allPass = Object.values(verification).every(Boolean);
  console.log('\n=== Verification ===');
  for (const [k, v] of Object.entries(verification)) console.log(`  ${v ? 'PASS' : 'FAIL'} — ${k}`);
  console.log(`\nZIP: ${zipPath} (${fmtBytes(finalZipSizeBytes)})`);
  console.log(`Included files: ${included.length} | Excluded assets: ${excludedAssets.filter((a) => a.status === 'excluded').length} | Other excluded: ${excludedOther.length}`);

  if (!allPass) {
    console.error('\nFAIL: one or more verification checks failed. Do not upload this zip.');
    process.exit(1);
  }
  if (finalZipSizeBytes >= MAX_ZIP_BYTES) {
    console.error(`\nFAIL: zip size ${fmtBytes(finalZipSizeBytes)} exceeds the ${fmtBytes(MAX_ZIP_BYTES)} target.`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
  process.exit(0);
}

main();
