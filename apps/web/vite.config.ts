import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    // Demo-modus bytter ut API-klienten med en som kjører helt i nettleseren.
    alias: mode === 'demo' ? [{ find: /^\.\.?\/api$/, replacement: fileURLToPath(new URL('./src/api.demo.ts', import.meta.url)) }] : [],
  },
  server: {
    port: 5173,
    // Samme origin i utvikling, så sesjons-cookien virker uten CORS-triks.
    proxy: { '/api': 'http://127.0.0.1:8787', '/health': 'http://127.0.0.1:8787' },
  },
  build: { sourcemap: false, outDir: mode === 'demo' ? 'dist-demo' : 'dist' },
}));
