import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
const secure = process.env.LOCAL_HTTPS === 'true';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'backoffice-entry',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.headers.host?.startsWith('auth.patente.localhost:')) {
            const proxy = httpRequest(
              {
                hostname: '127.0.0.1',
                port: 9091,
                path: req.url,
                method: req.method,
                headers: {
                  ...req.headers,
                  'x-forwarded-proto': 'https',
                  'x-forwarded-host': req.headers.host,
                },
              },
              (upstream) => {
                res.writeHead(upstream.statusCode ?? 502, upstream.headers);
                upstream.pipe(res);
              },
            );
            proxy.setTimeout(10000, () => proxy.destroy());
            proxy.on('error', () => {
              if (!res.headersSent) res.writeHead(502);
              res.end('Authelia unavailable');
            });
            req.pipe(proxy);
            return;
          }
          if (
            !req.headers.host?.startsWith('auth.') &&
            /^\/(login|register|backoffice)(\/|\?|$)/.test(req.url ?? '')
          )
            req.url = '/backoffice.html';
          next();
        });
      },
    },
  ],
  build: {
    manifest: true,
    rollupOptions: { input: { public: 'index.html', backoffice: 'backoffice.html' } },
  },
  server: {
    port: secure ? 8443 : 5173,
    strictPort: true,
    host: '127.0.0.1',
    https: secure
      ? {
          key: readFileSync('../infra/runtime/tls/localhost.key'),
          cert: readFileSync('../infra/runtime/tls/localhost.crt'),
        }
      : undefined,
    allowedHosts: ['app.patente.localhost', 'auth.patente.localhost'],
    proxy: { '/api': 'http://localhost:3000', '/health': 'http://localhost:3000' },
  },
});
