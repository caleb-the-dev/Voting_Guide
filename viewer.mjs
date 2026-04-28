import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 8000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.json': 'application/json',
  '.pdf':  'application/pdf',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.txt':  'text/plain',
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const filePath = url.pathname === '/'
    ? join(ROOT, 'app', 'index.html')
    : join(ROOT, url.pathname.slice(1));
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'text/plain' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`Voting God → http://localhost:${PORT}`));
