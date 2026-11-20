import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function localTonConnectManifest(host: string): Plugin {
  return {
    name: 'local-tonconnect-manifest',
    apply: 'serve',
    configureServer(server) {
      const path = resolve(server.config.publicDir, 'tonconnect-manifest.json');
      const url = `https://${host}`;
      server.middlewares.use((request, response, next) => {
        if (
          request.url?.split('?')[0] !== '/tonconnect-manifest.json' ||
          request.headers.host?.split(':')[0]?.toLowerCase() !== host ||
          (request.method !== 'GET' && request.method !== 'HEAD')
        ) {
          next();
          return;
        }

        const manifest = JSON.parse(readFileSync(path, 'utf8'));
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Cache-Control', 'no-store');
        response.end(
          JSON.stringify({
            ...manifest,
            url,
            iconUrl: `${url}/tonconnect-icon.png`,
          }),
        );
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const { NGROK_DOMAIN } = loadEnv(mode, process.cwd(), 'NGROK_DOMAIN');
  const ngrokDomain = NGROK_DOMAIN?.trim().toLowerCase() ?? '';
  const allowedHosts = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(ngrokDomain)
    ? [ngrokDomain]
    : [];

  return {
    plugins: [react(), ...allowedHosts.map(localTonConnectManifest)],
    build: { target: ['chrome107', 'edge107', 'firefox104', 'safari16'] },
    server: {
      host: '127.0.0.1',
      port: 5173,
      allowedHosts,
      proxy: { '/api': { target: 'http://127.0.0.1:3000', ws: true } },
    },
  };
});
