const fs = require('fs');

const pages = JSON.parse(fs.readFileSync('raw-text.json', 'utf8'));

const bookNames = [
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

let fullText = pages.join('\n\n--- PAGEBREAK ---\n\n');

// Find book positions - need word boundaries to avoid "John" matching "1 John"
const bookPositions = [];
for (const book of bookNames) {
  // Build a regex that requires the book name to NOT be preceded by a digit
  let escaped = book.replace(/\s+/g, '\\s+');
  // For books without a number prefix (John, Acts, etc.), ensure no digit before
  let prefix = book.match(/^\d/) ? '' : '(?<!\\d\\s*)';
  const regex = new RegExp(`${prefix}\\b${escaped}\\s+INTRODUCTION\\b`, 'g');

  let bestMatch = null;
  let match;
  while ((match = regex.exec(fullText)) !== null) {
    // Skip if in table of contents (first ~50000 chars)
    if (match.index < 50000) continue;
    // Take the first valid match
    if (!bestMatch) {
      bestMatch = match;
    }
  }

  if (bestMatch) {
    bookPositions.push({ book, pos: bestMatch.index });
    console.log(`Found ${book} at position ${bestMatch.index}`);
  } else {
    console.log(`WARNING: Could not find ${book}`);
  }
}

bookPositions.sort((a, b) => a.pos - b.pos);

// Verify order makes sense
console.log('\nBook order:');
bookPositions.forEach((b, i) => console.log(`  ${i + 1}. ${b.book} (pos: ${b.pos})`));

// Find end: Glossary after Revelation
const revPos = bookPositions[bookPositions.length - 1].pos;
const afterRev = fullText.substring(revPos);
const glossaryMatch = afterRev.search(/\bGlossary\b/);
const endPos = glossaryMatch !== -1 ? revPos + glossaryMatch : fullText.length;

// Extract and parse each book
const commentary = {};
for (let i = 0; i < bookPositions.length; i++) {
  const start = bookPositions[i].pos;
  const end = i + 1 < bookPositions.length ? bookPositions[i + 1].pos : endPos;
  const bookText = fullText.substring(start, end);
  const bookName = bookPositions[i].book;

  // Parse verse references: "1:1." or "1:2-16."
  const versePattern = /\b(\d+:\d+(?:[-–]\d+)?)\.\s/g;
  let match;
  const verseEntries = [];

  while ((match = versePattern.exec(bookText)) !== null) {
    verseEntries.push({
      ref: match[1].replace('–', '-'),
      pos: match.index,
      textStart: match.index + match[0].length
    });
  }

  // Group by chapter
  const verses = {};
  for (let j = 0; j < verseEntries.length; j++) {
    const entry = verseEntries[j];
    const nextPos = j + 1 < verseEntries.length ? verseEntries[j + 1].pos : bookText.length;
    let text = bookText.substring(entry.textStart, nextPos).trim();
    text = text.replace(/\n\n--- PAGEBREAK ---\n\n/g, ' ').replace(/\s+/g, ' ').trim();

    const chapter = entry.ref.split(':')[0];
    if (!verses[chapter]) verses[chapter] = {};
    verses[chapter][entry.ref] = text;
  }

  // Section headers
  const sectionPattern = /\b(\d+:\d+[-–]\d+)\s+([A-Z][A-Za-z\s,''&()\-]+?)(?=\s{2,}|\n|(?:\b\d+:\d+))/g;
  const sectionHeaders = {};
  while ((match = sectionPattern.exec(bookText)) !== null) {
    const ref = match[1].replace('–', '-');
    const chapter = ref.split(':')[0];
    if (!sectionHeaders[chapter]) sectionHeaders[chapter] = {};
    sectionHeaders[chapter][ref] = match[2].trim();
  }

  // Introduction
  const firstVerseIdx = bookText.search(/\b\d+:\d+[-–]?\d*\.\s/);
  const firstSectionIdx = bookText.search(/\b\d+:\d+[-–]\d+\s+[A-Z][a-z]/);
  const contentStart = Math.min(
    firstVerseIdx !== -1 ? firstVerseIdx : Infinity,
    firstSectionIdx !== -1 ? firstSectionIdx : Infinity
  );

  let introduction = '';
  if (contentStart !== Infinity) {
    introduction = bookText.substring(0, contentStart).trim();
    introduction = introduction.replace(/\n\n--- PAGEBREAK ---\n\n/g, ' ').replace(/\s+/g, ' ').trim();
  }

  let totalVerses = 0;
  for (const ch of Object.values(verses)) totalVerses += Object.keys(ch).length;

  commentary[bookName] = { introduction, sectionHeaders, verses, totalVerses };
  console.log(`${bookName}: ${totalVerses} verse entries across ${Object.keys(verses).length} chapters`);
}

fs.writeFileSync('commentary.json', JSON.stringify(commentary, null, 2));
fs.writeFileSync('commentary-compact.json', JSON.stringify(commentary));
const sizeMB = (fs.statSync('commentary-compact.json').size / 1024 / 1024).toFixed(2);
console.log(`\nDone! ${sizeMB} MB`);
