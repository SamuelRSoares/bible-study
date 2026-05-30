const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const NOTES_DIR = path.join(__dirname, 'notes');

// Ensure notes directory exists
if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR, { recursive: true });

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

// Notes API
function getNotePath(book, chapter, verse) {
  const dir = path.join(NOTES_DIR, book);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${chapter}_${verse}.md`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // API: Notes
  if (url.pathname.startsWith('/api/notes')) {
    const parts = url.pathname.split('/').filter(Boolean); // api, notes, book, chapter, verse
    const book = parts[2];
    const chapter = parts[3];
    const verse = parts[4];

    if (req.method === 'GET' && book && chapter) {
      // Get all notes for a chapter
      const dir = path.join(NOTES_DIR, book);
      if (!fs.existsSync(dir)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end('{}');
      }
      const notes = {};
      const files = fs.readdirSync(dir).filter(f => f.startsWith(`${chapter}_`));
      for (const f of files) {
        const v = f.replace(`${chapter}_`, '').replace('.md', '');
        notes[v] = fs.readFileSync(path.join(dir, f), 'utf8');
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(notes));
    }

    if (req.method === 'PUT' && book && chapter && verse) {
      const body = await readBody(req);
      const { content } = JSON.parse(body);
      const notePath = getNotePath(book, chapter, verse);
      if (content && content.trim()) {
        fs.writeFileSync(notePath, content);
      } else {
        // Delete empty notes
        try { fs.unlinkSync(notePath); } catch {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end('{"ok":true}');
    }
  }

  // Serve static files
  let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Bible Study app running at http://localhost:${PORT}`);
});
