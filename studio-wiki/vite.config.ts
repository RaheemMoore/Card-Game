import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const repositoryRoot = resolve(import.meta.dirname, '..');

function studioContent(): Plugin {
  const virtualId = 'virtual:studio-content';
  const resolvedId = `\0${virtualId}`;

  return {
    name: 'studio-wiki-content-adapter',
    resolveId(id) {
      return id === virtualId ? resolvedId : undefined;
    },
    load(id) {
      if (id !== resolvedId) return undefined;
      const production = readFileSync(resolve(repositoryRoot, 'PRODUCTION.md'), 'utf8');
      return `export const productionMarkdown = ${JSON.stringify(production)};`;
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
