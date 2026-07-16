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

export default defineConfig({
  plugins: [react(), tailwindcss(), s3UploadProxy()],
  server: {
    proxy: {
      '/api/leonardo': {
        target: 'https://cloud.leonardo.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/leonardo/, '/api/rest/v1'),
      },
    },
  },
})
