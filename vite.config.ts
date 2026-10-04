import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { loadEnvironment, basePath } from './scripts/environment.mjs';
const config = loadEnvironment();
const base = basePath(config.VITE_BASE_PATH);
const prefix = base.replace(/\/$/, '');
const secure = config.LOCAL_HTTPS === 'true';

export default defineConfig({
  base,
  envDir: false,
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify(config.VITE_API_URL ?? '') },
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
                port: Number(config.AUTHELIA_PORT ?? 9091),
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
            /^\/(login|register|backoffice)(\/|\?|$)/.test((req.url ?? '').slice(prefix.length))
          )
            req.url = `${base}backoffice.html`;
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
    proxy: Object.fromEntries(['/api', '/health'].map(path => [prefix + path, {
      target: `http://127.0.0.1:${config.BACKEND_PORT ?? 3000}`,
      rewrite: (url: string) => url.slice(prefix.length),
    }])),
  },
});
