// parse-shedd.js — parser específico da Bíblia de Estudo Shedd.
//
//   node parse-shedd.js [raw-text-biblia-shedd.json] [shedd-commentary.json]
//
// Estrategia: a Shedd marca notas com "cap.versiculo" (ex.: "8.1", "9.18-27").
// O texto esta cheio de referencias cruzadas ("Gn 19.29", "cf. Is 43.25") e numeros
// com milhar ("5.300"). Para separar marcadores-de-nota do ruido usamos:
//   1) filtro de versiculo valido (1..176, sem zero a esquerda);
//   2) descarte quando o token anterior e uma abreviacao de livro conhecida;
//   3) CAMINHAR MONOTONICO: notas avancam em passos pequenos (mesmo capitulo com
//      versiculo crescente, ou +1..+3 capitulos). Saltos para tras/para longe sao
//      referencias cruzadas e sao descartados.
//   4) segmentacao por reinicio de capitulo, guiada pelas contagens de bible.json.
const fs = require('fs');
const { allBooks } = require('./books-meta');

const rawFile = process.argv[2] || 'raw-text-biblia-shedd.json';
const outFile = process.argv[3] || 'shedd-commentary.json';

const bible = JSON.parse(fs.readFileSync('public/data/bible.json', 'utf8'));
const chaptersOf = {};
for (const b of bible.books) chaptersOf[b.name] = b.chapters.length;

const pages = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
const fullText = pages.join('    ');

// Abreviacoes de livros (e palavras de citacao) usadas nas referencias cruzadas.
const ABBREV = new Set([
  'gn','ex','lv','nm','dt','js','jz','jud','rt','sm','rs','cr','ed','ne','et','jo','job',
  'sl','pv','ec','ct','cant','is','jr','lm','ez','dn','os','jl','am','ob','jn','mq','na',
  'hc','sf','ag','zc','ml','mt','mc','lc','at','rm','co','gl','ef','fp','cl','ts','tm','tt',
  'fm','hb','tg','pe','jd','ap','cf','ver','vide','veja','vs','cap','caps','p','pp','n','v',
  'ncb','mb','ndb','isbe','sl.','cf.','ap.',
]);
const stripAccents = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Token imediatamente anterior (letras, com possivel digito+espaco antes: "1 Co").
function precededByAbbrev(idx) {
  const before = fullText.slice(Math.max(0, idx - 8), idx);
  const m = before.match(/(\d\s)?([A-Za-zÀ-ÿ]{1,4})\.?\s{1,4}$/);
  if (!m) return false;
  return ABBREV.has(stripAccents(m[2]).toLowerCase());
}

// Todos os candidatos cap.versiculo[-fim] em ordem (tolera espacos no intervalo).
const CAND = /(\d{1,3})\.(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/g;
const cands = [];
let m;
while ((m = CAND.exec(fullText)) !== null) {
  const ch = +m[1], v = +m[2];
  if (v < 1 || v > 176 || /^0\d/.test(m[2])) continue;
  if (ch < 1 || ch > 150) continue;
  cands.push({ ch, v, end: m[3] ? +m[3] : null, start: m.index, textStart: m.index + m[0].length });
}

// Pre-filtro de DENSIDADE: os indices/esbocos no inicio de cada livro (e listas de
// referencias cruzadas) sao aglomerados de refs com pouco texto entre si. Notas reais
// tem texto longo. Marcamos como "denso" o candidato com texto curto antes E depois.
const DENSE = 45;
for (let i = 0; i < cands.length; i++) {
  const gapNext = (i + 1 < cands.length ? cands[i + 1].start : Infinity) - cands[i].textStart;
  const gapPrev = cands[i].start - (i > 0 ? cands[i - 1].textStart : -Infinity);
  cands[i].dense = gapNext < DENSE && gapPrev < DENSE;
}

// Caminhar monotonico + segmentacao por livro.
const order = allBooks.map(b => b.name);
const accepted = []; // { name, ch, v, ref, start, textStart }
let bi = 0, curCh = 0, curV = 0;

const fitsBook = (c, cnt) =>
  c.ch >= 1 && c.ch <= cnt &&
  (curCh === 0
    ? c.ch <= 3                                   // 1a nota de um livro: cap baixo (ignora esbocos do indice)
    : (c.ch === curCh && c.v >= curV) ||          // mesmo capitulo, versiculo nao-decrescente
      (c.ch > curCh && c.ch <= curCh + 4));       // proximo(s) capitulo(s), passo pequeno

for (const c of cands) {
  if (c.dense) continue;
  if (precededByAbbrev(c.start)) continue;

  let cnt = chaptersOf[order[bi]] || 150;
  if (!fitsBook(c, cnt)) {
    // Nao encaixa no livro atual. Se o livro atual ja esta "completo" e este
    // candidato parece o inicio de um novo livro (cap baixo), avanca de livro.
    if (curCh >= cnt - 1 && c.ch <= 3) {
      let nb = bi;
      while (nb < order.length - 1) {
        nb++;
        const ncnt = chaptersOf[order[nb]] || 150;
        if (c.ch >= 1 && c.ch <= ncnt) { bi = nb; curCh = 0; curV = 0; cnt = ncnt; break; }
      }
    }
    if (!fitsBook(c, cnt)) continue;              // ainda nao encaixa -> referencia cruzada
  }

  curCh = c.ch; curV = c.v;
  const ref = c.end ? `${c.ch}:${c.v}-${c.end}` : `${c.ch}:${c.v}`;
  accepted.push({ name: order[bi], ch: c.ch, ref, start: c.start, textStart: c.textStart });
}

function clean(t) {
  return t.replace(/\f/g, ' ').replace(/\s+/g, ' ').replace(/<i>\s*<\/i>/g, '')
    .replace(/^[.,;:\s]+/, '')   // remove pontuacao solta no inicio (resto de marcador)
    .trim();
}

const commentary = {};
for (const name of order) commentary[name] = { introduction: '', sectionHeaders: {}, verses: {} };

// Assinatura de linha de indice/esboco que sobreviveu: contem um intervalo que
// cruza capitulos ("7.1-11.25") ou duplo traco ("12.1-21-23"), ou e curta demais.
const looksLikeOutline = t =>
  t.length < 15 ||
  /\d{1,3}\.\d{1,3}\s*-\s*\d{1,3}\.\d{1,3}/.test(t.slice(0, 90)) ||
  /\d{1,3}\.\d{1,3}-\d{1,3}-\d{1,3}/.test(t.slice(0, 90));

for (let i = 0; i < accepted.length; i++) {
  const a = accepted[i];
  const stop = i + 1 < accepted.length ? accepted[i + 1].start : fullText.length;
  const raw = fullText.slice(a.textStart, stop);
  // Resto de esboco: ".22 Ordenancas Basicas, ..." (ponto+versiculo+titulo capitalizado).
  if (/^\s*\.\d+\s+[A-ZÀ-Ý]/.test(raw)) continue;
  const text = clean(raw);
  if (!text || looksLikeOutline(text)) continue;
  const chStr = String(a.ch);
  if (!commentary[a.name].verses[chStr]) commentary[a.name].verses[chStr] = {};
  const prev = commentary[a.name].verses[chStr][a.ref];
  commentary[a.name].verses[chStr][a.ref] = prev ? `${prev} ${text}` : text;
}

// Introducoes: o layout da Shedd mistura o esboco/indice do livro com o fim da nota
// anterior, entao nao da para extrair de forma limpa. Deixamos vazias por enquanto.

let booksWith = 0, total = 0;
for (const name of order) {
  const vc = Object.values(commentary[name].verses).reduce((a, c) => a + Object.keys(c).length, 0);
  if (vc) { booksWith++; total += vc; }
}
fs.writeFileSync(outFile, JSON.stringify(commentary, null, 2));
console.log(`Salvo ${outFile}`);
console.log(`Livros com notas: ${booksWith}/66 | total de notas: ${total}\n`);
for (const name of order) {
  const chs = Object.keys(commentary[name].verses).map(Number);
  const vc = chs.reduce((a, c) => a + Object.keys(commentary[name].verses[c]).length, 0);
  const maxch = chs.length ? Math.max(...chs) : 0;
  console.log(`  ${name.padEnd(16)} notas:${String(vc).padStart(4)}  maxCap:${String(maxch).padStart(3)}/${chaptersOf[name]}`);
}
