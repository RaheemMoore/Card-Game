import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import sirv from 'sirv';
import { WIKI_ASSET_PATHS } from './asset-manifest.ts';

const repositoryRoot = resolve(import.meta.dirname, '..');
const gamePublic = resolve(repositoryRoot, 'card-engine/public');

/**
 * Serve the game's whole public folder in dev; ship only what the Wiki displays.
 *
 * Vite's `publicDir` is all-or-nothing — pointing it at `card-engine/public` copied
 * all 77 MB into every deploy, four fifths of which the Wiki never renders. Authoring
 * still wants the whole folder available (drop an image in, reference it, see it), so
 * the split is by mode rather than by moving files around. See `asset-manifest.ts`.
 */
export interface BuildStamp {
  /** Short commit SHA the Wiki was built from, or null outside a git checkout. */
  commit: string | null;
  /** ISO date of the commit — what the content is actually current as of. */
  commitDate: string | null;
  /** Subject line of that commit, for a one-glance "what landed last". */
  subject: string | null;
  /** ISO timestamp of the build itself. */
  builtAt: string;
  /** True in `vite dev`, where the page is live against working-tree files. */
  dev: boolean;
}

/**
 * The Wiki reads PRODUCTION.md at BUILD time, so a deployed page is only as current
 * as its last deploy — and a stale deploy looks identical to a fresh one. Stamping
 * the commit makes staleness visible instead of invisible, which is the difference
 * between a wiki people trust and a wiki people stop checking.
 *
 * Vercel builds in a git checkout but may not expose full history, so every lookup
 * degrades to null rather than failing the build.
 */
function readBuildStamp(): BuildStamp {
  const git = (args: string) => {
    try {
      return execSync(`git ${args}`, { cwd: repositoryRoot, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim() || null;
    } catch {
      return null;
    }
  };
  return {
    // Vercel sets VERCEL_GIT_COMMIT_SHA; prefer it, since a Vercel build can run
    // from a shallow checkout where `git log` is unreliable.
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? git('rev-parse HEAD'))?.slice(0, 7) ?? null,
    commitDate: git('log -1 --format=%cI'),
    subject: process.env.VERCEL_GIT_COMMIT_MESSAGE?.split('\n')[0] ?? git('log -1 --format=%s'),
    builtAt: new Date().toISOString(),
    dev: process.env.NODE_ENV !== 'production',
  };
}

function wikiAssets(): Plugin {
  return {
    name: 'studio-wiki-assets',
    configureServer(server) {
      // Dev: everything, so referencing a new asset never needs a config edit first.
      server.middlewares.use(sirv(gamePublic, { dev: true, etag: true }));
    },
    // `writeBundle` rather than `generateBundle`: these are large binaries that
    // belong on disk directly, not held in the bundle graph in memory.
    writeBundle(options) {
      const outDir = options.dir ?? resolve(import.meta.dirname, 'dist');
      let copied = 0;
      let bytes = 0;
      for (const entry of WIKI_ASSET_PATHS) {
        const from = resolve(gamePublic, entry);
        if (!existsSync(from)) {
          this.warn(`asset manifest lists a missing path: ${entry}`);
          continue;
        }
        const to = resolve(outDir, entry);
        mkdirSync(dirname(to), { recursive: true });
        cpSync(from, to, { recursive: true });
        const stat = statSync(from);
        bytes += stat.isDirectory() ? directorySize(from) : stat.size;
        copied += 1;
      }
      this.info(`wiki assets: ${copied} entries, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
    },
  };
}

function directorySize(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    total += entry.isDirectory() ? directorySize(full) : statSync(full).size;
  }
  return total;
}

function studioContent(): Plugin {
  const virtualId = 'virtual:studio-content';
  const resolvedId = `\0${virtualId}`;
  const productionPath = resolve(repositoryRoot, 'PRODUCTION.md');

  return {
    name: 'studio-wiki-content-adapter',
    resolveId(id) {
      return id === virtualId ? resolvedId : undefined;
    },
    load(id) {
      if (id !== resolvedId) return undefined;
      const production = readFileSync(productionPath, 'utf8');
      return [
        `export const productionMarkdown = ${JSON.stringify(production)};`,
        `export const buildStamp = ${JSON.stringify(readBuildStamp())};`,
      ].join('\n');
    },
    configureServer(server) {
      server.watcher.add(productionPath);
    },
    handleHotUpdate(context) {
      if (resolve(context.file) !== productionPath) return;
      const studioModule = context.server.moduleGraph.getModuleById(resolvedId);
      if (studioModule) context.server.moduleGraph.invalidateModule(studioModule);
      context.server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

export default defineConfig({
  plugins: [react(), studioContent(), wikiAssets()],
  // Not `card-engine/public` — wikiAssets() serves it in dev and ships the
  // displayed subset at build. Pointing publicDir here copied all 77 MB.
  publicDir: false,
  server: {
    // 5174, not the default 5173 — the game's dev server owns that port, and the
    // Wiki is most useful running beside it while you cross-check what it claims.
    port: 5174,
    fs: { allow: [repositoryRoot] },
  },
  build: { outDir: 'dist' },
});
