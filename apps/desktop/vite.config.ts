import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { randomBytes } from 'node:crypto';

export default defineConfig(({ command }) => {
  const nonce = randomBytes(18).toString('base64');
  return {
    plugins: [react(), {
      name: 'dev-csp',
      transformIndexHtml(html) {
        return command === 'serve' ? html.replace("script-src 'self'", `script-src 'self' 'nonce-${nonce}'`) : html;
      },
    }],
    html: command === 'serve' ? { cspNonce: nonce } : undefined,
    base: './',
    server: { host: '127.0.0.1', port: 0 },
    build: { outDir: 'dist/renderer', emptyOutDir: true },
  };
});
