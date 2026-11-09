import { execFileSync } from 'node:child_process';
import { createServer as http } from 'node:http';
import { createServer as https } from 'node:https';
import { networkInterfaces } from 'node:os';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(process.argv[2] ?? '/private/tmp/okbite-phone-https-web');
const tls = '/private/tmp/okbite-phone-preview-tls';
mkdirSync(tls, { recursive: true, mode: 0o700 });
const ips = Object.values(networkInterfaces()).flat().filter(n => n && !n.internal && n.family === 'IPv4').map(n => n.address);
if (!ips.length) throw new Error('Connect the Mac to Wi-Fi first.');
const openssl = (...args) => execFileSync(process.env.OPENSSL ?? 'openssl', args, { cwd: tls, stdio: 'pipe' });
if (!existsSync(tls + '/ca.crt')) {
  openssl('req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'ca.key', '-out', 'ca.crt', '-days', '2', '-sha256', '-subj', '/CN=OkBite Local Phone Preview', '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign');
}
openssl('x509', '-in', 'ca.crt', '-outform', 'DER', '-out', 'OkBite-Phone-Preview.cer');
writeFileSync(tls + '/server.ext', 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:localhost,IP:127.0.0.1,' + ips.map(ip => 'IP:' + ip).join(',') + '\n');
openssl('req', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'server.key', '-out', 'server.csr', '-subj', '/CN=localhost');
openssl('x509', '-req', '-in', 'server.csr', '-CA', 'ca.crt', '-CAkey', 'ca.key', '-CAcreateserial', '-out', 'server.crt', '-days', '2', '-sha256', '-extfile', 'server.ext');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
https({ key: readFileSync(tls + '/server.key'), cert: readFileSync(tls + '/server.crt') }, async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'https://localhost').pathname));
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    let body, file = path === root ? root + '/index.html' : path;
    try { body = await readFile(file); }
    catch { if (extname(file)) { res.writeHead(404); return res.end(); } file = root + '/index.html'; body = await readFile(file); }
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
  } catch { res.writeHead(500); res.end(); }
}).listen(8443, '0.0.0.0');
http((req, res) => {
  if (req.url !== '/OkBite-Phone-Preview.cer') { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', 'application/x-x509-ca-cert');
  res.end(readFileSync(tls + '/OkBite-Phone-Preview.cer'));
}).listen(8765, '0.0.0.0');
console.log('Local demo preview; no external tunnel or system trust changes.');
for (const ip of ips) console.log(`Preview: https://${ip}:8443\nPublic certificate: http://${ip}:8765/OkBite-Phone-Preview.cer`);
console.log(openssl('x509', '-in', 'ca.crt', '-noout', '-fingerprint', '-sha256').toString().trim());
