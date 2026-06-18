const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

async function detectFontRoles(doc) {
  // Sample a few pages to determine which font is normal, bold, italic
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
      const sz = Math.abs(item.transform?.[3] || 0);
      if (fontCounts[fn].samples.length < 5) {
        fontCounts[fn].samples.push({ text: item.str.substring(0, 50), sz });
      }
    }
  }

  // The most common font is "normal"
  // The font used for verse refs (pattern like "1:1.") is "bold"
  // The remaining font is likely "italic"
  const sorted = Object.entries(fontCounts).sort((a, b) => b[1].count - a[1].count);

  let normalFont = sorted[0]?.[0];
  let boldFont = null;
  let italicFont = null;

  // Find bold: the font that contains verse reference patterns
  for (const [fn, data] of Object.entries(fontCounts)) {
    if (fn === normalFont) continue;
    const hasVerseRef = data.samples.some(s => /^\d+:\d+\./.test(s.text) || /^\d+:\d+[-–]\d+/.test(s.text));
    if (hasVerseRef) {
      boldFont = fn;
      break;
    }
  }

  // Italic: the remaining significant font
  for (const [fn, data] of sorted) {
    if (fn === normalFont || fn === boldFont) continue;
    if (data.count > 2) {
      italicFont = fn;
      break;
    }
  }

  console.log(`  Fonts: normal=${normalFont}(${fontCounts[normalFont]?.count}), bold=${boldFont}(${fontCounts[boldFont]?.count || 0}), italic=${italicFont}(${fontCounts[italicFont]?.count || 0})`);

  return { boldFont, italicFont };
}

async function extractFormatted(pdfPath, outputFile) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const totalPages = doc.numPages;
  console.log(`${outputFile}: ${totalPages} pages`);

  const config = await detectFontRoles(doc);
  const allText = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    let text = '';
    let openTag = null;

    for (const item of content.items) {
      const str = item.str;
      if (str === undefined) continue;

      const font = item.fontName;
      let tag = null;

      if (config.boldFont && font === config.boldFont) tag = 'b';
      else if (config.italicFont && font === config.italicFont) tag = 'i';

      if (openTag && (tag !== openTag)) {
        text += `</${openTag}>`;
        openTag = null;
      }

      if (tag && tag !== openTag) {
        text += `<${tag}>`;
        openTag = tag;
      }

      text += str + ' ';
    }

    if (openTag) text += `</${openTag}>`;
    allText.push(text);

    if (i % 100 === 0 || i === totalPages) {
      process.stdout.write(`\r  ${i}/${totalPages}`);
    }
  }

  console.log(`\n  Saving...`);
  fs.writeFileSync(outputFile, JSON.stringify(allText));

  let totalI = 0, totalB = 0;
  for (const p of allText) {
    totalI += (p.match(/<i>/g) || []).length;
    totalB += (p.match(/<b>/g) || []).length;
  }
  console.log(`  Done! <i>: ${totalI}, <b>: ${totalB}`);
}

async function main() {
  await extractFormatted(
    'C:/Users/samuel.soares_nuria/Downloads/New Testament - IVP Bible Background Commentary.pdf',
    'raw-text-nt-fmt.json'
  );

  await extractFormatted(
    'C:/Users/samuel.soares_nuria/Downloads/Old Testament - IVP Bible Background Commentary.pdf',
    'raw-text-ot-fmt.json'
  );
}

main().catch(console.error);
