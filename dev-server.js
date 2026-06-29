// dev-server.js — server lokal buat NGETES suara Gemini.
// Kenapa perlu: `python -m http.server` TIDAK bisa jalanin /api/tts (itu serverless
// function), jadi suara selalu jatuh ke fallback browser & "gak bisa ganti".
// Ini serve file statis + route /api/tts ke handler api/tts.js yang SAMA dengan
// dipakai di Vercel (DRY). Jalanin: double-click dev-tts.bat  (atau `node dev-server.js`).
const http = require('http');
const fs   = require('fs');
const path = require('path');

// Muat .env sederhana → GEMINI_API_KEYS dibaca handler TTS
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const ttsHandler = require('./api/tts.js');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.svg':'image/svg+xml', '.ico':'image/x-icon', '.task':'application/octet-stream', '.wav':'audio/wav' };
const PORT = process.env.PORT || 8000;

http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // Route TTS → handler Vercel-style (shim res.status().json()/.send())
  if (url === '/api/tts') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      req.body = body;
      res.status = (c) => { res.statusCode = c; return res; };
      res.json   = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
      res.send   = (b) => res.end(b);
      Promise.resolve(ttsHandler(req, res)).catch(e => { res.statusCode = 500; res.end(String(e)); });
    });
    return;
  }

  // File statis (dibatasi ke folder ini)
  let p = decodeURIComponent(url);
  if (p === '/') p = '/index.html';
  const fp = path.join(__dirname, p);
  if (!fp.startsWith(__dirname)) { res.statusCode = 403; return res.end('forbidden'); }
  fs.readFile(fp, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream');
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`\n  Gesture dev server + Gemini TTS  →  http://localhost:${PORT}`);
  console.log('  Buka di browser, masuk mode Intro, coba ganti suara. (Ctrl+C buat stop)\n');
});
