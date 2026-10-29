// Zero-dependency helper: serves video-slate.html and forwards /hf/* to api.higgsfield.ai,
// adding your key from .env.local so it never reaches the browser.
// Run: node proxy.mjs   (needs Node 18 or newer)
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const UPSTREAM = 'https://api.higgsfield.ai';

function loadEnv() {
  const file = join(here, '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnv();

const creds = process.env.HF_CREDENTIALS;
if (!creds || !creds.includes(':')) {
  console.error('Missing HF_CREDENTIALS in .env.local (format: key-id:key-secret)');
  process.exit(1);
}

const ALLOWED = [
  /^\/bytedance\/seedance-2\.5\/text-to-video$/,
  /^\/requests\/[0-9a-f-]{36}\/status$/i
];

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1_000_000) { reject(new Error('Body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      const html = readFileSync(join(here, 'video-slate.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (req.url && req.url.startsWith('/hf/')) {
      const path = req.url.slice(3).split('?')[0];
      if (!ALLOWED.some((re) => re.test(path))) {
        console.error(`Blocked by local proxy: ${req.method} ${path}`);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Path not allowed by the local proxy.' }));
        return;
      }
      const headers = { Authorization: `Key ${creds}` };
      if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
      if (req.headers['idempotency-key']) headers['Idempotency-Key'] = req.headers['idempotency-key'];
      const body = req.method === 'POST' ? await readBody(req) : undefined;

      const upstream = await fetch(UPSTREAM + path, { method: req.method, headers, body });
      const text = await upstream.text();
      if (!upstream.ok) console.error(`Higgsfield ${upstream.status} for ${req.method} ${path}: ${text.slice(0, 500)}`);
      res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json' });
      res.end(text);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ detail: 'Not found' }));
  } catch (err) {
    console.error(err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ detail: err instanceof Error ? err.message : 'Proxy error' }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Video Slate running at http://localhost:${PORT}`);
});
