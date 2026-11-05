// Test-only server: existing demo fixtures, no staging or production writes.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
const root = resolve('apps/mobile/dist-e2e');
const entries = JSON.parse(await readFile('apps/mobile/src/test/preview-data.json', 'utf8'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json' };
const serve = async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:18766');
    if (url.pathname === '/functions/v1/lookup') {
      const entry = entries.find(item => item.product.id === url.searchParams.get('id'));
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.end(JSON.stringify(entry ? { status: 'found', ...entry } : { status: 'not_found' }));
    }
    if (url.pathname === '/functions/v1/test-post') return res.end('test-only');
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    let body;
    try { body = await readFile(path); }
    catch {
      if (extname(path)) { res.writeHead(404); return res.end(); }
      res.setHeader('Content-Type', 'text/html');
      return res.end(await readFile(resolve(root, 'index.html')));
    }
    res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream');
    res.end(body);
  } catch { res.writeHead(500); res.end(); }
};
createServer(serve).listen(18766, '127.0.0.1');
createServer(serve).listen(18767, '127.0.0.1');
