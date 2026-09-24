const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 4500;
const PUBLIC_DIR = path.join(__dirname, 'public');
const TOPCODES_DIR = path.resolve(__dirname, '..', 'topcodes');
const QUIZZES_DIR = path.resolve(__dirname, '..', '..', '..', 'packages', 'ai-quiz-engine', 'output');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: List Available Quizzes
  if (pathname === '/api/quizzes') {
    const quizzes = [];
    if (fs.existsSync(QUIZZES_DIR)) {
      const files = fs.readdirSync(QUIZZES_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(QUIZZES_DIR, file);
          try {
            const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
            const content = JSON.parse(raw);
            quizzes.push({
              filename: file,
              title: content.title || file,
              book: content.book || '',
              unit: content.unit || '',
              level: content.level || '',
              questionCount: Array.isArray(content.questions) ? content.questions.length : (Array.isArray(content) ? content.length : 0),
              isUniversal: file.endsWith('_universal.json'),
              isQuizzle: file.endsWith('_quizzle.json')
            });
          } catch (e) {
            console.error(`Erro lendo quiz ${file}:`, e);
          }
        }
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(quizzes, null, 2));
    return;
  }

  // API: List Printable TopCode PDFs
  if (pathname === '/api/topcodes') {
    const list = [];
    const ptBrDir = path.join(TOPCODES_DIR, 'pt-BR');
    if (fs.existsSync(ptBrDir)) {
      const walk = (dir, sub = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const relPath = path.join(sub, entry.name);
          if (entry.isDirectory()) {
            walk(path.join(dir, entry.name), relPath);
          } else if (entry.name.endsWith('.pdf')) {
            list.push({
              name: entry.name,
              category: sub.replace(/\\/g, '/'),
              url: `/topcodes/pt-BR/${relPath.replace(/\\/g, '/')}`
            });
          }
        }
      };
      walk(ptBrDir);
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(list, null, 2));
    return;
  }

  // Serve Quizzes Output directory
  if (pathname.startsWith('/quizzes/')) {
    const rel = pathname.replace('/quizzes/', '');
    const targetPath = path.join(QUIZZES_DIR, rel);
    const ext = path.extname(targetPath).toLowerCase();
    serveFile(res, targetPath, MIME_TYPES[ext] || 'application/octet-stream');
    return;
  }

  // Serve Topcodes PDFs directory
  if (pathname.startsWith('/topcodes/')) {
    const rel = pathname.replace('/topcodes/', '');
    const targetPath = path.join(TOPCODES_DIR, rel);
    const ext = path.extname(targetPath).toLowerCase();
    serveFile(res, targetPath, MIME_TYPES[ext] || 'application/octet-stream');
    return;
  }

  // Serve Public static files
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      serveFile(res, filePath, MIME_TYPES[ext] || 'application/octet-stream');
    } else {
      // SPA Fallback
      serveFile(res, path.join(PUBLIC_DIR, 'index.html'), 'text/html; charset=utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Wizard PaperClickers Web Scanner ativo!`);
  console.log(` Endereço: http://localhost:${PORT}`);
  console.log(` Quizzes:  ${QUIZZES_DIR}`);
  console.log(` TopCodes: ${TOPCODES_DIR}`);
  console.log(`====================================================`);
});
