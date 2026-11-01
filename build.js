'use strict';
/* Builds public/index.html (one self-contained page) from src/ and core.js */
const fs = require('fs');
const path = require('path');
const r = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const app = r('src/app.js').replace('/*ART*/', () => r('src/art.js'));
const man = {};
try {
  fs.readdirSync(path.join(__dirname, 'public', 'images')).forEach((f) => {
    const m = f.match(/^([a-z0-9-]+)\.(jpe?g|png|webp|avif)$/i);
    if (m) man[m[1].toLowerCase()] = 'images/' + f;
  });
} catch (e) { /* no images yet */ }
const html = r('src/shell.html')
  .replace('/*MANIFEST*/', () => 'window.__IMG_MANIFEST=' + JSON.stringify(man) + ';')
  .replace('/*CSS*/', () => r('src/style.css'))
  .replace('/*CORE*/', () => r('core.js'))
  .replace('/*APP*/', () => app);
fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), html);
console.log('Built public/index.html (' + Math.round(html.length / 1024) + ' KB)');
