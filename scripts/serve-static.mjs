/**
 * Serves the static export the way GitHub Pages does.
 *
 *   node scripts/serve-static.mjs [port]
 *
 * Thirty lines of node:http rather than a dependency, and it exists because
 * `next start` cannot serve an `output: export` build - so without it there is
 * no way to see or test what will actually be published.
 *
 * The behaviours that matter are the ones GitHub Pages has and a naive server
 * does not: `/en/` resolves to `/en/index.html`, a path with no extension gets
 * the same treatment, and an unknown path returns 404.html with a real 404.
 * Getting those wrong locally would hide exactly the class of bug this server
 * is meant to catch.
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'apps', 'web', 'out');
const PORT = Number(process.argv[2] ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0] ?? '/').replace(/\.\.+/g, '');
  const candidates = [
    path.join(OUT, clean),
    path.join(OUT, clean, 'index.html'),
    path.join(OUT, `${clean}.html`),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

createServer((request, response) => {
  const file = resolve(request.url ?? '/');

  if (file === null) {
    const notFound = path.join(OUT, '404.html');
    response.writeHead(404, { 'content-type': TYPES['.html'] });
    if (existsSync(notFound)) return createReadStream(notFound).pipe(response);
    return response.end('404');
  }

  response.writeHead(200, {
    'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
  });
  createReadStream(file).pipe(response);
}).listen(PORT, () => {
  console.log(`static: serving apps/web/out on http://localhost:${PORT}`);
});
