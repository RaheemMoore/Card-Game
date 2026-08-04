import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const repositoryRoot = resolve(import.meta.dirname, '..');

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
      return `export const productionMarkdown = ${JSON.stringify(production)};`;
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
  plugins: [react(), studioContent()],
  publicDir: resolve(repositoryRoot, 'card-engine/public'),
  server: {
    fs: { allow: [repositoryRoot] },
  },
  build: { outDir: 'dist' },
});
