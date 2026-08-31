import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getMarket } from './server/market.mjs';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'web');
const port = Number(process.env.PORT || 4173);
const publicOrigin = (process.env.PUBLIC_ORIGIN || `http://127.0.0.1:${port}`).replace(/\/$/, '');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml' };

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'public, max-age=300, stale-while-revalidate=3600' });
  response.end(JSON.stringify(value));
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
  if (url.pathname === '/api/market') {
    try { sendJson(response, 200, await getMarket()); }
    catch (error) { sendJson(response, 503, { source:'unavailable', items:[], error:error.message }); }
    return;
  }
  try {
    const pathname = decodeURIComponent(url.pathname);
    const target = normalize(join(root, pathname === '/' ? 'index.html' : pathname));
    if (!target.startsWith(root)) throw new Error('Invalid path');
    const info = await stat(target);
    const file = info.isDirectory() ? join(target, 'index.html') : target;
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache' });
    const body = await readFile(file);
    response.end(extname(file) === '.html' ? body.toString('utf8')
      .replaceAll('__PUBLIC_ORIGIN__', publicOrigin)
      .replaceAll('__MARKET_ENDPOINT__', '/api/market') : body);
  } catch {
    response.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
