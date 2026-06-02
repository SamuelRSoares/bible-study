// download-bibles.js — fetches the 4 Bible translations into ./bibles.
// Cross-platform replacement for the manual curl commands. Run: node download-bibles.js
const fs = require('fs');
const path = require('path');

const SOURCES = {
  'NAA.json': 'https://raw.githubusercontent.com/damarals/biblias/main/inst/json/NAA.json',
  'NVI.json': 'https://raw.githubusercontent.com/damarals/biblias/main/inst/json/NVI.json',
  'ACF.json': 'https://raw.githubusercontent.com/damarals/biblias/main/inst/json/ACF.json',
  'KJV.json': 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json',
};

async function main() {
  fs.mkdirSync('bibles', { recursive: true });
  for (const [file, url] of Object.entries(SOURCES)) {
    const dest = path.join('bibles', file);
    if (fs.existsSync(dest)) {
      console.log(`= ${file} (já existe, pulando)`);
      continue;
    }
    process.stdout.write(`↓ ${file} ... `);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`falha ao baixar ${url}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log(`ok (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
  }
  console.log('\nPronto. Agora rode: node build-bible.js');
}

main().catch(err => { console.error(err.message); process.exit(1); });
