import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../dist/client',
);
const baseFile = path.join(root, '.base-path');
const basePath = fs.existsSync(baseFile) ? fs.readFileSync(baseFile, 'utf8').trim() : '';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
  '.mcmeta': 'application/json; charset=utf-8',
};
const server = http
  .createServer(async (req, res) => {
    try {
    let pathname = decodeURIComponent(
        new URL(req.url, 'http://localhost').pathname,
      );
      if (pathname === '/__wiki_stop') {
        if (
          req.method !== 'POST' ||
          !process.env.WIKI_CONTROL_TOKEN ||
          req.headers.authorization !==
            'Bearer ' + process.env.WIKI_CONTROL_TOKEN
        ) {
          res.writeHead(403);
          return res.end();
        }
        res.end('Wiki stopped.');
        server.close();
        setTimeout(() => process.exit(0), 250);
        return;
      }
    if (pathname === '/__wiki_health') {
        res.setHeader('Content-Type', 'application/json');
        return res.end(
          JSON.stringify({
            application: 'ravengard-829-wiki',
            pid: process.pid,
          }),
      );
    }
    if (basePath && pathname === '/') {
      res.writeHead(302, { Location: basePath + '/' });
      return res.end();
    }
    if (basePath && (pathname === basePath || pathname.startsWith(basePath + '/'))) {
      pathname = pathname.slice(basePath.length) || '/';
    }
      let file = path.resolve(root, '.' + pathname);
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403);
        return res.end();
      }
      let stat;
      try {
        stat = await fsp.stat(file);
        if (stat.isDirectory()) {
          file = path.join(file, 'index.html');
          stat = await fsp.stat(file);
        }
      } catch {
        if (pathname === '/' || !path.extname(pathname)) {
          file = path.join(root, 'index.html');
          stat = await fsp.stat(file);
        } else {
          res.writeHead(404);
          return res.end('Not found');
        }
      }
      res.setHeader(
        'Content-Type',
        mime[path.extname(file)] || 'text/plain; charset=utf-8',
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Accept-Ranges', 'bytes');
      let start = 0,
        end = stat.size - 1;
      const match = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
      if (match) {
        if (!match[1]) start = Math.max(0, stat.size - Number(match[2]));
        else {
          start = Number(match[1]);
          if (match[2]) end = Math.min(end, Number(match[2]));
        }
        if (start > end || start >= stat.size) {
          res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
          return res.end();
        }
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      }
      res.setHeader('Content-Length', Math.max(0, end - start + 1));
      if (req.method === 'HEAD' || stat.size === 0) return res.end();
      fs.createReadStream(file, { start, end }).pipe(res);
    } catch {
      res.writeHead(500);
      res.end('Server error');
    }
  })
  .listen(Number(process.env.PORT || 3000), '127.0.0.1', () =>
    console.log(
      'Ravengard Wiki: http://127.0.0.1:' + (process.env.PORT || 3000),
    ),
  );
