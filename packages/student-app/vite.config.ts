import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// @ts-expect-error Build-only JavaScript module, tested independently.
import { snapshot, safeJson } from './scripts/snapshot.mjs';
export default defineConfig(() => {
  const base = process.env.STUDENT_BASE || '/';
  if (!base.startsWith('/') || !base.endsWith('/'))
    throw Error('STUDENT_BASE must begin and end with /');
  const data = snapshot(
    JSON.parse(
      readFileSync(fileURLToPath(new URL('../server/vocabulary.json', import.meta.url)), 'utf8')
    )
  );
  const boot = {
    words: data.words.slice(0, 24),
    total: data.words.length,
    url: `${base}data/${data.file}`,
  };
  return {
    base,
    plugins: [
      react(),
      {
        name: 'dictionary-snapshot',
        transformIndexHtml: (html) =>
          html.replace(
            '<!--boot-->',
            `<script id="dictionary-boot" type="application/json">${safeJson(boot)}</script>`
          ),
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: `data/${data.file}`, source: data.json });
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.split('?')[0] === `${base}data/${data.file}`) {
              res.setHeader('Content-Type', 'application/json');
              res.end(data.json);
            } else next();
          });
        },
      },
    ],
    ssr: { noExternal: ['@mandarinko/ui'] },
    build: { manifest: true },
  };
});
