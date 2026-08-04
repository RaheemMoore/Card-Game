#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const claude = path.join(root, '.claude');
const codex = path.join(root, '.codex');
const codexSkills = path.join(root, '.agents', 'skills');
const jsonMode = process.argv.includes('--json');
const errors = [];
const warnings = [];
const add = (arr, rule, file, message) => arr.push({ rule, file: file.replaceAll('\\', '/'), message });

function read(file) { return fs.readFileSync(file, 'utf8'); }
function rel(file) { return path.relative(root, file).replaceAll('\\', '/'); }
function git(args) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8' });
}
// Directories this walk must never enter: node_modules is vendored, and
// .claude/worktrees holds OTHER git worktrees nested on disk as literal
// subdirectories (git worktree add puts them there) — each one a full,
// separate checkout with its own .claude/ and node_modules. Scanning from the
// primary checkout with sibling worktrees present walked into all of them,
// reporting their unrelated content (and their vendored deps) as this
// project's studio errors. Never caught in isolated-worktree testing because
// a nested worktree has no sibling worktrees under IT.
const NEVER_WALK = new Set(['node_modules', 'worktrees', '.git']);

function filesUnder(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && NEVER_WALK.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}
function frontmatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) return null;
  const raw = text.slice(4, end);
  const values = {};
  for (const [i, line] of raw.split('\n').entries()) {
    if (!line.trim() || /^\s/.test(line)) continue;
    const m = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!m) return { error: `invalid top-level frontmatter line ${i + 1}: ${line}`, raw, values };
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else if (/^[^\[\{].*:\s/.test(value)) return { error: `unquoted colon in scalar on line ${i + 1}`, raw, values };
    values[m[1]] = value;
  }
  return { raw, values };
}

const agentFiles = filesUnder(path.join(claude, 'agents'), f => f.endsWith('.md'));
const skillFiles = filesUnder(path.join(claude, 'skills'), f => path.basename(f) === 'SKILL.md');
const components = [];
const names = new Map();
for (const file of [...agentFiles, ...skillFiles]) {
  const text = read(file);
  const r = rel(file);
  if (text.includes('\r')) add(errors, 'line-endings', r, 'CR/CRLF found; studio text must be LF');
  const fm = frontmatter(text);
  if (!fm || fm.error) { add(errors, 'frontmatter', r, fm?.error ?? 'missing/unterminated frontmatter'); continue; }
  const name = fm.values.name;
  const description = fm.values.description;
  if (!name) add(errors, 'frontmatter', r, 'missing name');
  if (!description) add(errors, 'frontmatter', r, 'missing description');
  if (name) {
    if (names.has(name)) add(errors, 'unique-name', r, `duplicate component name also in ${names.get(name)}`);
    names.set(name, r);
    components.push({ name, sourcePath: r, type: r.includes('/agents/') ? 'agent' : 'skill', fm });
  }
  if (r.includes('/agents/')) {
    const tools = (fm.values.tools ?? '').split(/[ ,]+/).filter(Boolean);
    for (const forbidden of ['Bash','Write','Edit','NotebookEdit']) if (tools.includes(forbidden)) add(errors, 'advisory-tools', r, `advisory agent exposes ${forbidden}`);
    const denied = (fm.values.disallowedTools ?? '').split(/[ ,]+/).filter(Boolean);
    for (const required of ['Bash','Write','Edit']) if (!denied.includes(required)) add(errors, 'advisory-tools', r, `disallowedTools does not include ${required}`);
  }
  for (const stale of ['card-engine-archetype-prompt-library.md','card-engine-modifier-pools.md']) {
    if (text.includes(stale)) add(errors, 'stale-current-source', r, `active component cites retired source ${stale}`);
  }
  const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of text.matchAll(linkRe)) {
    let target = match[1].trim().split('#')[0];
    if (!target || /^(https?:|mailto:|#)/.test(target) || /[<>*{}]/.test(target)) continue;
    target = decodeURIComponent(target);
    const resolved = path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) add(errors, 'local-link', r, `missing target ${match[1]}`);
  }
}

function validateLocalLinks(file, text) {
  const r = rel(file);
  const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of text.matchAll(linkRe)) {
    let target = match[1].trim().split('#')[0];
    if (!target || /^(https?:|mailto:|#)/.test(target) || /[<>*{}]/.test(target)) continue;
    target = decodeURIComponent(target);
    const resolved = path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) add(errors, 'local-link', r, `missing target ${match[1]}`);
  }
}

// Codex imports are adapters, not a second control plane. They must stay in
// name parity with canonical .claude components and point back to real shared
// contracts/scripts instead of an invented .Codex tree.
const codexSkillFiles = filesUnder(codexSkills, f => path.basename(f) === 'SKILL.md');
const canonicalSkillNames = new Set(components.filter(x => x.type === 'skill').map(x => x.name));
const adapterSkillNames = new Set();
for (const file of codexSkillFiles) {
  const text = read(file);
  const r = rel(file);
  if (text.includes('\r')) add(errors, 'line-endings', r, 'CR/CRLF found; studio text must be LF');
  if (/\.Codex(?:\/|\\)/.test(text)) add(errors, 'codex-adapter-path', r, 'references nonexistent .Codex tree; use canonical .claude paths');
  const fm = frontmatter(text);
  if (!fm || fm.error) { add(errors, 'frontmatter', r, fm?.error ?? 'missing/unterminated frontmatter'); continue; }
  const name = fm.values.name;
  if (!name) add(errors, 'frontmatter', r, 'missing name');
  else {
    adapterSkillNames.add(name);
    if (!canonicalSkillNames.has(name)) add(errors, 'codex-skill-parity', r, `no canonical .claude skill named ${name}`);
  }
  if (!fm.values.description) add(errors, 'frontmatter', r, 'missing description');
  validateLocalLinks(file, text);
}
for (const name of canonicalSkillNames) if (!adapterSkillNames.has(name)) add(errors, 'codex-skill-parity', '.agents/skills', `missing Codex skill adapter for ${name}`);

const codexAgentFiles = filesUnder(path.join(codex, 'agents'), f => f.endsWith('.toml'));
const canonicalAgentNames = new Set(components.filter(x => x.type === 'agent').map(x => x.name));
const adapterAgentNames = new Set();
for (const file of codexAgentFiles) {
  const text = read(file);
  const r = rel(file);
  if (text.includes('\r')) add(errors, 'line-endings', r, 'CR/CRLF found; studio text must be LF');
  const name = /^name\s*=\s*"([^"]+)"/m.exec(text)?.[1];
  if (!name) add(errors, 'codex-agent-schema', r, 'missing name');
  else {
    adapterAgentNames.add(name);
    if (!canonicalAgentNames.has(name)) add(errors, 'codex-agent-parity', r, `no canonical .claude agent named ${name}`);
  }
  if (!/^description\s*=\s*/m.test(text)) add(errors, 'codex-agent-schema', r, 'missing description');
  if (!/^developer_instructions\s*=\s*"""/m.test(text)) add(errors, 'codex-agent-schema', r, 'missing developer_instructions');
  if (!/^sandbox_mode\s*=\s*"read-only"\s*$/m.test(text)) add(errors, 'codex-agent-policy', r, 'specialist adapter must use sandbox_mode = "read-only"');
  validateLocalLinks(file, text);
}
for (const name of canonicalAgentNames) if (!adapterAgentNames.has(name)) add(errors, 'codex-agent-parity', '.codex/agents', `missing Codex agent adapter for ${name}`);

const registryPath = path.join(claude, 'studio', 'STUDIO_CAPABILITY_REGISTRY.json');
let registry = null;
try { registry = JSON.parse(read(registryPath)); }
catch (e) { add(errors, 'registry-json', rel(registryPath), String(e.message)); }
if (registry) {
  const records = [...(registry.agents ?? []), ...(registry.skills ?? [])];
  const recordNames = new Set(records.map(x => x.name));
  for (const c of components) if (!recordNames.has(c.name)) add(errors, 'registry-source', c.sourcePath, 'component absent from registry');
  for (const rec of records) {
    if (!rec.sourcePath) { add(errors, 'registry-source', rel(registryPath), `${rec.name} has no sourcePath`); continue; }
    const source = path.join(root, rec.sourcePath);
    if (!fs.existsSync(source)) add(errors, 'registry-source', rel(registryPath), `${rec.name} source missing: ${rec.sourcePath}`);
  }
}

const settingsPath = path.join(claude, 'settings.json');
try {
  const settings = JSON.parse(read(settingsPath));
  const permissions = settings.permissions ?? {};
  if (permissions.disableBypassPermissionsMode !== 'disable') add(errors, 'permission-policy', rel(settingsPath), 'permissions.disableBypassPermissionsMode must be disable');
  const denyRules = new Set(permissions.deny ?? []);
  for (const required of [
    'Read(/.env)', 'Read(/.env.*)', 'Read(/card-engine/.env)', 'Read(/card-engine/.env.*)',
    'Edit(/.env)', 'Edit(/.env.*)', 'Edit(/card-engine/.env)', 'Edit(/card-engine/.env.*)'
  ]) if (!denyRules.has(required)) add(errors, 'permission-policy', rel(settingsPath), `missing root-anchored secret protection rule ${required}`);
  const hookCommands = [];
  for (const groups of Object.values(settings.hooks ?? {})) for (const group of groups ?? []) for (const hook of group.hooks ?? []) if (hook.command) hookCommands.push(hook.command);
  for (const command of hookCommands) {
    const m = /\.claude[\\/]scripts[\\/]([^"'\s]+)/.exec(command);
    if (m && !fs.existsSync(path.join(claude, 'scripts', m[1]))) add(errors, 'hook-target', rel(settingsPath), `missing hook script ${m[1]}`);
  }
} catch (e) { add(errors, 'settings-json', rel(settingsPath), String(e.message)); }

const codexHooksPath = path.join(codex, 'hooks.json');
try {
  const hooks = JSON.parse(read(codexHooksPath));
  const handlers = [];
  for (const groups of Object.values(hooks.hooks ?? {})) {
    for (const group of groups ?? []) for (const hook of group.hooks ?? []) handlers.push(hook);
  }
  if (handlers.length === 0) add(errors, 'codex-hooks', rel(codexHooksPath), 'no hook handlers configured');
  for (const hook of handlers) {
    if (!hook.command) add(errors, 'codex-hooks', rel(codexHooksPath), 'hook handler missing command');
    if (!hook.commandWindows) add(errors, 'codex-hooks', rel(codexHooksPath), 'hook handler missing Windows command override');
    for (const command of [hook.command, hook.commandWindows].filter(Boolean)) {
      if (command.includes('CLAUDE_PROJECT_DIR')) add(errors, 'codex-hooks', rel(codexHooksPath), 'Codex hook depends on Claude-only CLAUDE_PROJECT_DIR');
      if (!command.includes('.claude/scripts/studio-hook.mjs')) add(errors, 'codex-hooks', rel(codexHooksPath), 'hook does not target the shared studio policy script');
      if (!command.includes('codex-')) add(errors, 'codex-hooks', rel(codexHooksPath), 'hook must invoke a Codex compatibility mode');
    }
  }
} catch (e) { add(errors, 'codex-hooks', rel(codexHooksPath), String(e.message)); }

const codexConfigPath = path.join(codex, 'config.toml');
try {
  const config = read(codexConfigPath);
  if (!/^\[features\][\s\S]*?^hooks\s*=\s*true\s*$/m.test(config)) add(errors, 'codex-config', rel(codexConfigPath), 'features.hooks must be explicitly enabled');
} catch (e) { add(errors, 'codex-config', rel(codexConfigPath), String(e.message)); }

const gitignore = read(path.join(root, '.gitignore'));
for (const required of ['!.claude/agents/','!.claude/skills/','!.claude/verify/','!.claude/scripts/','!.claude/studio/','!.claude/settings.json','!.claude/launch.json','!.agents/skills/','!.codex/agents/','!.codex/config.toml','!.codex/hooks.json','!AGENTS.md']) {
  if (!gitignore.includes(required)) add(errors, 'git-tracking', '.gitignore', `missing ${required}`);
}
const attributes = read(path.join(root, '.gitattributes'));
for (const required of ['.agents/**/*.md text eol=lf','.codex/**/*.toml text eol=lf','.codex/**/*.json text eol=lf','AGENTS.md text eol=lf']) {
  if (!attributes.includes(required)) add(errors, 'line-endings-policy', '.gitattributes', `missing ${required}`);
}
const shellFiles = filesUnder(claude, f => /\.(sh|mjs)$/.test(f));
for (const file of shellFiles) if (read(file).includes('\r')) add(errors, 'line-endings', rel(file), 'executable script contains CR/CRLF');

const shell = path.join(root, 'card-engine', 'src', 'pages', 'games', 'FullscreenGameShell.tsx');
const extract = path.join(claude, 'skills', 'extract-fullscreen-shell', 'SKILL.md');
if (!fs.existsSync(shell) && fs.existsSync(extract)) add(warnings, 'migration-pending', rel(extract), 'FullscreenGameShell is still absent; the one-time extraction is incomplete');
if (fs.existsSync(shell) && fs.existsSync(extract) && !/RETIRED/.test(read(extract))) add(errors, 'migration-lifecycle', rel(extract), 'completed one-time migration must be marked RETIRED');
for (const envPath of ['card-engine/.env', 'card-engine/.env.local']) {
  if (git(['check-ignore', '-q', '--', envPath]).status !== 0) {
    add(errors, 'local-secret-ignore', envPath, 'local secret files must remain covered by Git ignore rules');
  }
  if (git(['ls-files', '--error-unmatch', '--', envPath]).status === 0) {
    add(errors, 'local-secret-tracking', envPath, 'local secret files must never be tracked by Git');
  }
}
const balance = path.join(claude, 'skills', 'balance-playtest', 'SKILL.md');
if (fs.existsSync(balance) && !/disable-model-invocation:\s*true/.test(read(balance))) add(errors, 'inactive-skill', rel(balance), 'scaffold must be hidden from model invocation');

const result = { ok: errors.length === 0, errors, warnings, counts: { agents: agentFiles.length, skills: skillFiles.length, codexAgents: codexAgentFiles.length, codexSkills: codexSkillFiles.length } };
if (jsonMode) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Studio health: ${result.ok ? 'PASS' : 'FAIL'} — ${errors.length} error(s), ${warnings.length} warning(s)`);
  for (const item of errors) console.error(`ERROR [${item.rule}] ${item.file}: ${item.message}`);
  for (const item of warnings) console.warn(`WARN  [${item.rule}] ${item.file}: ${item.message}`);
}
process.exit(result.ok ? 0 : 1);
