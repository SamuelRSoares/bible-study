const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

async function checkPdf(label, pdfPath, pageNums) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;

  console.log(`\n========== ${label} ==========`);

  // Collect font stats across pages
  const fontStats = {}; // fontName -> { count, sizes: Set, samples: [] }

  for (const pn of pageNums) {
    const page = await doc.getPage(pn);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const fn = item.fontName;
      const sz = item.transform ? Math.abs(item.transform[3]).toFixed(1) : '?';
      if (!fontStats[fn]) fontStats[fn] = { count: 0, sizes: new Set(), samples: [] };
      fontStats[fn].count++;
      fontStats[fn].sizes.add(sz);
      if (fontStats[fn].samples.length < 8) {
        fontStats[fn].samples.push({ text: item.str.substring(0, 70), sz, page: pn });
      }
    }
  }

  for (const [fn, stats] of Object.entries(fontStats)) {
    console.log(`\n--- ${fn} (${stats.count} items, sizes: ${[...stats.sizes].join(', ')}) ---`);
    for (const s of stats.samples) {
      console.log(`  p${s.page} sz=${s.sz}: "${s.text}"`);
    }
  }
}

async function main() {
  await checkPdf('NT',
    'C:/Users/samuel.soares_nuria/Downloads/New Testament - IVP Bible Background Commentary.pdf',
    [50, 51, 100, 200, 500]);

  await checkPdf('OT',
    'C:/Users/samuel.soares_nuria/Downloads/Old Testament - IVP Bible Background Commentary.pdf',
    [40, 41, 100, 200, 500]);
}

main().catch(console.error);
