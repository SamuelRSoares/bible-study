// parse.example.js — PONTO DE PARTIDA para transformar um raw-text-*.json
// (gerado por extract.js) no JSON do "contrato" que o app entende.
//
// ESTE É O ÚNICO PASSO QUE PRECISA SER ADAPTADO AO SEU PDF, porque cada bíblia
// de estudos marca livros/versículos de um jeito. Os padrões abaixo são um
// começo razoável; ajuste-os olhando o seu raw-text-*.json.
//
//   node parse.example.js raw-text-shedd.json shedd-commentary.json
//
// Saída (contrato — detalhes em commentaries/README.md):
//   { "Genesis": { introduction, sectionHeaders, verses: { "1": { "1:1": "..." } } }, ... }
const fs = require('fs');
const { allBooks } = require('../books-meta');

const rawFile = process.argv[2] || 'raw-text.json';
const outFile = process.argv[3] || 'commentary.json';

// ---- AJUSTE AQUI conforme o seu PDF ----------------------------------------
// Como o início de cada livro aparece no texto. O padrão abaixo procura o nome
// do livro (em inglês, como em books-meta.js) seguido de "INTRODUCTION".
// Se a sua bíblia usa nomes em português ou outro marcador, troque isto.
function bookStartPattern(englishName) {
  const esc = englishName.replace(/\s+/g, '\\s+');
  return new RegExp(`${esc}\\s+INTRODUCTION`, 'i');
}
// Como um marcador de versículo aparece (ex.: "1:1." ou "1:2-3."). Permissivo.
const VERSE_MARKER = /\b(\d+:\d+(?:[-–]\d+)?)\.\s/g;
// ---------------------------------------------------------------------------

const pages = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
const fullText = Array.isArray(pages) ? pages.join('\n') : String(pages);

// 1) Localiza onde cada livro começa.
const positions = [];
for (const bk of allBooks) {
  const m = bookStartPattern(bk.name).exec(fullText);
  if (m) positions.push({ name: bk.name, pos: m.index });
}
positions.sort((a, b) => a.pos - b.pos);

function clean(t) {
  return t.replace(/\s+/g, ' ').trim();
}

// 2) Para cada livro, fatia o texto em versículos pelos marcadores.
const commentary = {};
for (let i = 0; i < positions.length; i++) {
  const { name, pos } = positions[i];
  const end = i + 1 < positions.length ? positions[i + 1].pos : fullText.length;
  const bookText = fullText.slice(pos, end);

  const marks = [];
  let m;
  VERSE_MARKER.lastIndex = 0;
  while ((m = VERSE_MARKER.exec(bookText)) !== null) {
    marks.push({ ref: m[1].replace('–', '-'), start: m.index, textStart: m.index + m[0].length });
  }

  const verses = {};
  for (let j = 0; j < marks.length; j++) {
    const mk = marks[j];
    const stop = j + 1 < marks.length ? marks[j + 1].start : bookText.length;
    const ch = mk.ref.split(':')[0];
    if (!verses[ch]) verses[ch] = {};
    verses[ch][mk.ref] = clean(bookText.slice(mk.textStart, stop));
  }

  // Introdução = tudo antes do primeiro marcador de versículo.
  const introduction = marks.length ? clean(bookText.slice(0, marks[0].start)) : '';

  let total = 0;
  for (const c of Object.values(verses)) total += Object.keys(c).length;
  commentary[name] = { introduction, sectionHeaders: {}, verses };
  console.log(`  ${name}: ${total} versículos`);
}

fs.writeFileSync(outFile, JSON.stringify(commentary, null, 2));
console.log(`\nSalvo ${outFile}. Confira alguns versículos e ajuste os padrões se necessário.`);
console.log('Depois: registre em commentaries/<id>.js e rode  node build-commentary.js <id>');
