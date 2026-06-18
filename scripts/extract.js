// extract.js — extrai o texto de UM PDF de bíblia de estudos, preservando
// negrito/itálico (<b>/<i>), detectando as fontes automaticamente.
//
// Uso:
//   node extract.js                          (pega o único PDF em source-pdfs/)
//   node extract.js "caminho/do/arquivo.pdf"
//   node extract.js "arquivo.pdf" raw-text-shedd.json   (nome de saída custom)
//
// Saída: um raw-text-*.json que depois é parseado no formato do contrato
// (veja commentaries/README.md).
const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

async function detectFontRoles(doc) {
  const fontCounts = {};
  const samplePages = [30, 50, 100, 200, 400];
  for (const pn of samplePages) {
    if (pn > doc.numPages) continue;
    const page = await doc.getPage(pn);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!item.str?.trim() || !item.fontName) continue;
      const fn = item.fontName;
      if (!fontCounts[fn]) fontCounts[fn] = { count: 0, samples: [] };
      fontCounts[fn].count++;
      if (fontCounts[fn].samples.length < 5) {
        fontCounts[fn].samples.push({ text: item.str.substring(0, 50) });
      }
    }
  }
  const sorted = Object.entries(fontCounts).sort((a, b) => b[1].count - a[1].count);
  const normalFont = sorted[0]?.[0];
  let boldFont = null, italicFont = null;
  for (const [fn, data] of Object.entries(fontCounts)) {
    if (fn === normalFont) continue;
    if (data.samples.some(s => /^\d+:\d+\./.test(s.text) || /^\d+:\d+[-–]\d+/.test(s.text))) {
      boldFont = fn; break;
    }
  }
  for (const [fn, data] of sorted) {
    if (fn === normalFont || fn === boldFont) continue;
    if (data.count > 2) { italicFont = fn; break; }
  }
  console.log(`  Fontes: normal=${normalFont}, negrito=${boldFont || '(não detectado)'}, itálico=${italicFont || '(não detectado)'}`);
  return { boldFont, italicFont };
}

async function extractFormatted(pdfPath, outputFile) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const totalPages = doc.numPages;
  console.log(`${path.basename(pdfPath)}: ${totalPages} páginas`);

  const config = await detectFontRoles(doc);
  const allText = [];
  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let text = '', openTag = null;
    for (const item of content.items) {
      const str = item.str;
      if (str === undefined) continue;
      const font = item.fontName;
      let tag = null;
      if (config.boldFont && font === config.boldFont) tag = 'b';
      else if (config.italicFont && font === config.italicFont) tag = 'i';
      if (openTag && tag !== openTag) { text += `</${openTag}>`; openTag = null; }
      if (tag && tag !== openTag) { text += `<${tag}>`; openTag = tag; }
      text += str + ' ';
    }
    if (openTag) text += `</${openTag}>`;
    allText.push(text);
    if (i % 100 === 0 || i === totalPages) process.stdout.write(`\r  ${i}/${totalPages}`);
  }
  fs.writeFileSync(outputFile, JSON.stringify(allText));
  let b = 0, it = 0;
  for (const p of allText) { b += (p.match(/<b>/g) || []).length; it += (p.match(/<i>/g) || []).length; }
  console.log(`\n  Salvo ${outputFile}  (negrito: ${b}, itálico: ${it})`);
}

function findPdf(arg) {
  if (arg) {
    if (fs.existsSync(arg)) return arg;
    console.error(`Arquivo não encontrado: ${arg}`);
    process.exit(1);
  }
  const dir = 'source-pdfs';
  if (fs.existsSync(dir)) {
    const pdfs = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 1) return path.join(dir, pdfs[0]);
    if (pdfs.length > 1) {
      console.error('Há vários PDFs em source-pdfs/. Especifique qual usar:');
      pdfs.forEach(f => console.error(`  node extract.js "source-pdfs/${f}"`));
      process.exit(1);
    }
  }
  return null;
}

async function main() {
  const pdf = findPdf(process.argv[2]);
  if (!pdf) {
    console.error('Nenhum PDF encontrado.');
    console.error('Coloque o PDF da sua bíblia de estudos na pasta source-pdfs/ e rode: node extract.js');
    console.error('Ou aponte o caminho: node extract.js "C:/caminho/para/biblia-shedd.pdf"');
    process.exit(1);
  }
  const slug = path.basename(pdf).replace(/\.pdf$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const out = process.argv[3] || `raw-text-${slug}.json`;
  await extractFormatted(pdf, out);
  console.log('\nPróximo passo: parsear esse arquivo no formato do contrato.');
  console.log('Veja commentaries/README.md (use parse.example.js como ponto de partida).');
}

main().catch(console.error);
