const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(reqUrl.pathname);

  // Default to index.html for root path
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  // Safe path resolution
  let filePath = path.normalize(path.join(ROOT_DIR, pathname));

  // Security check: ensure path stays within ROOT_DIR
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // Check if target exists; if not, check if appending .html works (clean URLs)
  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (!path.extname(filePath)) {
        const htmlPath = filePath + '.html';
        fs.stat(htmlPath, (htmlErr, htmlStats) => {
          if (!htmlErr && htmlStats.isFile()) {
            return serveFile(htmlPath, res);
          }
          send404(res, pathname);
        });
      } else {
        send404(res, pathname);
      }
      return;
    }

    if (stats.isDirectory()) {
      const indexFile = path.join(filePath, 'index.html');
      fs.stat(indexFile, (idxErr, idxStats) => {
        if (!idxErr && idxStats.isFile()) {
          serveFile(indexFile, res);
        } else {
          send404(res, pathname);
        }
      });
      return;
    }

    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  });

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end('500 Internal Server Error');
  });
  stream.pipe(res);
}

function send404(res, pathname) {
  const errorPage = path.join(ROOT_DIR, 'error-404.html');
  fs.stat(errorPage, (err, stats) => {
    if (!err && stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(errorPage).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${pathname}`);
    }
  });
}

server.listen(PORT, () => {
  console.log(`========================================`);
  console.log(` Dreams ERP Server is running!`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Press Ctrl+C to stop the server`);
  console.log(`========================================`);
});
