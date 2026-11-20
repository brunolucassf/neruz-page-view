import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const variants = {
  4321: {},
  4322: { 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "frame-ancestors 'none'" },
  4323: { 'Content-Security-Policy': "frame-ancestors 'self'" },
  4324: { login: true, 'X-Frame-Options': 'SAMEORIGIN' },
};
function serve(port, extra) {
  const { login, ...headers } = extra;
  http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    if (login) {
      const logged = (req.headers.cookie || '').includes('sess=1');
      if (url.pathname === '/login') {
        const attrs = url.searchParams.get('mode') === 'none' ? 'SameSite=None; Secure' : 'SameSite=Lax';
        res.writeHead(200, { 'Set-Cookie': `sess=1; Path=/; ${attrs}`, 'Content-Type': types['.html'] });
        return res.end('<p>Login feito. <a href="/">Entrar</a></p>');
      }
      if (url.pathname === '/login-form' && logged) { res.writeHead(302, { Location: '/' }); return res.end(); }
      if (!logged && url.pathname !== '/login-form') { res.writeHead(302, { Location: '/login-form' }); return res.end(); }
    }
    if (url.pathname === '/login-form') {
      res.writeHead(200, { 'Content-Type': types['.html'] });
      return res.end('<p>Faca login: <a href="/login">login</a></p>');
    }
    if (url.pathname.startsWith('/img/')) {
      const n = url.pathname.match(/(\d+)/)?.[1] ?? '0';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="hsl(${n * 55},60%,40%)"/><text x="320" y="190" font-size="64" fill="#fff" text-anchor="middle">IMG ${n}</text></svg>`;
      return setTimeout(() => { res.writeHead(200, { 'Content-Type': types['.svg'] }); res.end(svg); }, 400);
    }
    const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = path.join(root, rel);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(port, '127.0.0.1', () => console.log(`fixture em http://localhost:${port}`));
}
for (const [port, extra] of Object.entries(variants)) serve(Number(port), extra);
