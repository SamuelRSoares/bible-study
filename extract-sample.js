const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

async function main() {
  const pdfPath = 'C:/Users/samuel.soares_nuria/Downloads/New Testament - IVP Bible Background Commentary.pdf';
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;

  // Extract pages around where Matthew commentary likely starts (after ~30 pages of intro)
  let text = '';
  for (let i = 31; i <= 50; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    text += `\n--- PAGE ${i} ---\n${pageText}\n`;
  }

  fs.writeFileSync('sample-commentary.txt', text);
  console.log('Saved pages 31-50');
}

main().catch(err => console.error(err));
