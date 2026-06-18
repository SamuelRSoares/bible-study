const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

async function main() {
  const pdfPath = 'C:/Users/samuel.soares_nuria/Downloads/Old Testament - IVP Bible Background Commentary.pdf';
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;

  // Check a page deep into the commentary (Genesis area, ~page 30-40)
  for (const pageNum of [40, 100, 400]) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const fonts = new Set();
    const samples = [];
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      fonts.add(item.fontName);
      if (samples.length < 10) {
        const sz = item.transform ? Math.abs(item.transform[3]).toFixed(1) : '?';
        samples.push(`[${item.fontName}] sz=${sz}: "${item.str.substring(0, 50)}"`);
      }
    }
    console.log(`\n=== Page ${pageNum} fonts: ${[...fonts].join(', ')} ===`);
    samples.forEach(s => console.log(s));
  }
}

main().catch(console.error);
