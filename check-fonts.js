const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

async function main() {
  const pdfPath = 'C:/Users/samuel.soares_nuria/Downloads/New Testament - IVP Bible Background Commentary.pdf';
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;

  // Check page 50 (Matthew commentary area)
  const page = await doc.getPage(50);
  const content = await page.getTextContent();

  const fonts = new Set();
  const samples = [];

  for (const item of content.items) {
    if (!item.str || !item.str.trim()) continue;
    const fontName = item.fontName || 'unknown';
    const transform = item.transform; // [scaleX, skewX, skewY, scaleY, translateX, translateY]
    const fontSize = transform ? Math.abs(transform[3]) : 0;

    fonts.add(fontName);

    if (samples.length < 40) {
      samples.push({
        text: item.str.substring(0, 60),
        font: fontName,
        size: fontSize.toFixed(1),
        width: item.width?.toFixed(1),
      });
    }
  }

  console.log('=== Fonts found ===');
  for (const f of fonts) console.log(' ', f);

  console.log('\n=== Samples ===');
  for (const s of samples) {
    console.log(`[${s.font}] size=${s.size}: "${s.text}"`);
  }
}

main().catch(console.error);
