import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // `api/` is included because the Vercel functions there hold the only
    // server-side guard on real provider spend (api/_lib/auth.ts). That logic
    // was previously untestable purely because the glob stopped at src/.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'api/**/*.test.ts'],
  },
});
