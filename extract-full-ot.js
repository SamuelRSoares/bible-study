const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

async function main() {
  const pdfPath = 'C:/Users/samuel.soares_nuria/Downloads/Old Testament - IVP Bible Background Commentary.pdf';
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const totalPages = doc.numPages;
  console.log('Total pages:', totalPages);

  const allText = [];
  const batchSize = 50;

  for (let start = 1; start <= totalPages; start += batchSize) {
    const end = Math.min(start + batchSize - 1, totalPages);
    const promises = [];
    for (let i = start; i <= end; i++) {
      promises.push(
        doc.getPage(i).then(page =>
          page.getTextContent().then(content => ({
            page: i,
            text: content.items.map(item => item.str).join(' ')
          }))
        )
      );
    }
    const results = await Promise.all(promises);
    results.sort((a, b) => a.page - b.page);
    for (const r of results) {
      allText.push(r.text);
    }
    process.stdout.write(`\rExtracted pages ${start}-${end} of ${totalPages}`);
  }

  console.log('\nSaving raw text...');
  fs.writeFileSync('raw-text-ot.json', JSON.stringify(allText));
  console.log('Done! Saved raw-text-ot.json');
}

main().catch(err => console.error(err));
