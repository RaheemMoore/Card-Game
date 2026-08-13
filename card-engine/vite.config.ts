import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function s3UploadProxy(): Plugin {
  return {
    name: 's3-upload-proxy',
    configureServer(server) {
      server.middlewares.use('/api/s3-upload', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end('POST only');
          return;
        }

        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const { url: target, fields, base64, ext } = JSON.parse(
          Buffer.concat(chunks).toString(),
        );

        const form = new FormData();
        for (const [key, value] of Object.entries(fields as Record<string, string>)) {
          form.append(key, value);
        }
        const imageBuffer = Buffer.from(base64, 'base64');
        const mime = ext === 'jpg' ? 'image/jpeg' : 'image/png';
        const blob = new Blob([imageBuffer], { type: mime });
        form.append('file', blob, `init.${ext}`);

        try {
          const upstream = await fetch(target, { method: 'POST', body: form });
          res.writeHead(upstream.status);
          const arrayBuf = await upstream.arrayBuffer();
          res.end(Buffer.from(arrayBuf));
        } catch (err) {
          console.error('S3 upload proxy error:', err);
          res.writeHead(502);
          res.end(String(err));
        }
      });
    },
  };
}

/**
 * Serves Phaser Editor's output to the browser.
 *
 * The Editor's project root is the GIT root — that is where phasereditor2d.config.json,
 * CourtyardV2.scene and the compiled CourtyardV2.js live. Vite's root is one level
 * down in card-engine/, so those files are outside anything it will serve, and the
 * Editor's own Play button serves the git root, where there is no game to run.
 *
 * Rather than copy files back and forth (which goes stale the moment Raheem saves),
 * this reads them off disk per request. Save in the Editor, refresh the browser, and
 * you are looking at the scene you just placed.
 */
function editorScenes(): Plugin {
  return {
    name: 'phaser-editor-scenes',
    configureServer(server) {
      const editorRoot = path.resolve(__dirname, '..');

      server.middlewares.use('/editor-scenes', (req, res) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '');

        // The index: every scene in the project, most recently SAVED first.
        // The Editor's Play button sends no indication of which scene is open —
        // only Preview Scene (Ctrl+0) does, via ?start= — so the landing page uses
        // this to open whatever was saved last and lists the rest to switch to.
        if (name === '' || name === 'index.json') {
          const scenes = fs
            .readdirSync(editorRoot)
            .filter((f) => f.endsWith('.scene'))
            .map((f) => {
              const base = f.replace(/\.scene$/, '');
              const compiled = path.join(editorRoot, `${base}.js`);
              const exists = fs.existsSync(compiled);
              return {
                name: base,
                compiled: exists,
                // Save time, not edit time: the .js is only rewritten on save, and
                // an unsaved scene is not runnable.
                savedAt: exists ? fs.statSync(compiled).mtimeMs : 0,
              };
            })
            .sort((a, b) => b.savedAt - a.savedAt);

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            // The landing page is served by the EDITOR's own server on a different
            // port, so this is a cross-origin read.
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify(scenes));
          return;
        }

        // Only ever the two shapes the Editor emits, and never a path.
        if (!/^[A-Za-z0-9_-]+\.(js|scene)$/.test(name)) {
          res.writeHead(400);
          res.end('bad scene name');
          return;
        }
        const file = path.resolve(__dirname, '..', name);
        if (!fs.existsSync(file)) {
          res.writeHead(404);
          res.end(`no such editor file: ${name}`);
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          // The Editor rewrites these on every save. Never cache them.
          'Cache-Control': 'no-store',
        });
        res.end(fs.readFileSync(file));
      });
    },

    /**
     * The same files, emitted into the build.
     *
     * Without this the courtyard is a dev-only toy. `configureServer` runs on the
     * dev server and nowhere else, so a deployed `/editor-scenes/CourtyardV2.js`
     * fell through vercel.json's SPA rewrite, came back as index.html with a 200,
     * and the scene reported "could not run" — Raheem, 2026-08-07: "all of this
     * work isn't in production for me to log in and actually see."
     *
     * Emitting from the SAME plugin that serves them is the point. Copying the
     * files into public/ would make a second source of truth that goes stale the
     * moment the Editor saves; this reads the one the Editor writes.
     */
    generateBundle() {
      const editorRoot = path.resolve(__dirname, '..');
      const scenes = fs.readdirSync(editorRoot).filter((f) => f.endsWith('.scene'));

      for (const sceneFile of scenes) {
        const base = sceneFile.replace(/\.scene$/, '');
        // A scene with no compiled .js has never been saved and cannot run. Ship
        // the pair or neither — half a scene is a runtime error with no cause.
        const compiled = path.join(editorRoot, `${base}.js`);
        if (!fs.existsSync(compiled)) continue;

        for (const name of [`${base}.scene`, `${base}.js`]) {
          this.emitFile({
            type: 'asset',
            fileName: `editor-scenes/${name}`,
            source: fs.readFileSync(path.join(editorRoot, name)),
          });
        }
      }
    },
  };
}

/**
 * `--mode game` is the GAME build (npm run build:game), as opposed to the
 * default build, which is the STUDIO.
 *
 * One codebase ships three products from three Vercel projects: the Game, the
 * Studio (/admin — Workshop, Lore Desk, Abilities), and the Wiki. The flags
 * that separate them live HERE, in committed config keyed on the build mode,
 * rather than in each Vercel project's dashboard environment. That is
 * deliberate: dashboard configuration is invisible from the repository and
 * cannot be reviewed, and a game deploy whose environment was never configured
 * would silently ship the entire studio inside the player's download.
 *
 * `.env.game` would have been the more idiomatic Vite answer, but every `.env*`
 * path in this repo is (correctly) blocked from being committed by the
 * secret-protection hook.
 *
 * Only the game mode defines anything. Every other mode is left exactly as it
 * was, so VITE_DEV_ROUTES keeps being controlled by the Vercel environment on
 * the studio deployment — which is what turns the /dev harnesses off in
 * production today.
 */
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), s3UploadProxy(), editorScenes()],
  define:
    mode === 'game'
      ? {
          'import.meta.env.VITE_ADMIN_ROUTES': '"false"',
          'import.meta.env.VITE_DEV_ROUTES': '"false"',
        }
      : {},
  server: {
    proxy: {
      '/api/leonardo': {
        target: 'https://cloud.leonardo.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/leonardo/, '/api/rest/v1'),
      },
    },
  },
}))
