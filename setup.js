// setup.js — instalação guiada, à prova de erro. Faz só o que falta.
//   node setup.js   (ou dê duplo-clique em INSTALAR.bat no Windows)
const { execSync } = require('child_process');
const fs = require('fs');

function run(cmd) { execSync(cmd, { stdio: 'inherit' }); }
const has = p => fs.existsSync(p);

console.log('\n=== Bible Study — instalacao ===\n');

const major = parseInt(process.versions.node.split('.')[0], 10);
if (major < 18) {
  console.error(`Node ${process.versions.node} detectado. Instale o Node.js 18+ em https://nodejs.org e rode de novo.`);
  process.exit(1);
}
console.log(`[ok] Node ${process.versions.node}`);

if (!has('node_modules')) {
  console.log('\n-> Instalando dependencias (npm install)...');
  run('npm install');
} else console.log('[ok] dependencias');

const bibles = ['NAA', 'NVI', 'ACF', 'KJV'].map(n => `bibles/${n}.json`);
if (!bibles.every(has)) {
  console.log('\n-> Baixando traducoes da Biblia...');
  run('node download-bibles.js');
} else console.log('[ok] traducoes');

if (!has('public/data/bible.json')) {
  console.log('\n-> Montando o texto biblico...');
  run('node build-bible.js');
} else console.log('[ok] texto biblico');

let comms = [];
try { comms = (JSON.parse(fs.readFileSync('public/data/catalog.json', 'utf8')).commentaries) || []; } catch {}

console.log('\n=== Tudo pronto! ===\n');
console.log('Para abrir o app:');
console.log('  - Windows: de duplo-clique em INICIAR.bat');
console.log('  - Ou rode: node server.js  e acesse http://localhost:3000\n');

if (comms.length) {
  console.log(`Biblias de estudo instaladas: ${comms.map(c => c.name).join(', ')}`);
} else {
  console.log('Ainda sem biblia de estudos — o app ja funciona com o texto + suas notas.');
  console.log('Para adicionar a sua (ex.: Shedd), siga o GUIA-DO-AMIGO.md.');
}
