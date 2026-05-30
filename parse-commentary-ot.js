const fs = require('fs');

const pages = JSON.parse(fs.readFileSync('raw-text-ot.json', 'utf8'));

const bookNames = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
  '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther',
  'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Songs',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
  'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'
];

// Single-chapter books where verses are just "1." "2." etc.
const singleChapterBooks = ['Obadiah'];

// Known chapter counts for each book (to filter out cross-reference false positives)
const maxChapters = {
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  'Joshua': 24, 'Judges': 21, 'Ruth': 4,
  '1 Samuel': 31, '2 Samuel': 24, '1 Kings': 22, '2 Kings': 25,
  '1 Chronicles': 29, '2 Chronicles': 36,
  'Ezra': 10, 'Nehemiah': 13, 'Esther': 10,
  'Job': 42, 'Psalms': 150, 'Proverbs': 31, 'Ecclesiastes': 12, 'Song of Songs': 8,
  'Isaiah': 66, 'Jeremiah': 52, 'Lamentations': 5, 'Ezekiel': 48, 'Daniel': 12,
  'Hosea': 14, 'Joel': 3, 'Amos': 9, 'Obadiah': 1, 'Jonah': 4, 'Micah': 7,
  'Nahum': 3, 'Habakkuk': 3, 'Zephaniah': 3, 'Haggai': 2, 'Zechariah': 14, 'Malachi': 4
};

let fullText = pages.join('\n\n--- PAGEBREAK ---\n\n');

// Find book positions using spaced-out names
const bookPositions = [];
for (const book of bookNames) {
  const spaced = book.toUpperCase().split('').join(' ');
  // Search after position 10000 to skip table of contents
  let searchFrom = 10000;
  let bestIdx = -1;

  // For numbered books like "1 Samuel", the spaced version is "1   S A M U E L"
  // We need to find these in the text
  while (true) {
    const idx = fullText.indexOf(spaced, searchFrom);
    if (idx === -1) break;
    // Verify this is a book header, not part of running text
    // Book headers are typically preceded by whitespace/pagebreak
    bestIdx = idx;
    break;
  }

  if (bestIdx !== -1) {
    bookPositions.push({ book, pos: bestIdx });
    console.log(`Found ${book} at position ${bestIdx}`);
  } else {
    console.log(`WARNING: Could not find ${book}`);
  }
}

bookPositions.sort((a, b) => a.pos - b.pos);

// Verify order
console.log('\nBook order:');
bookPositions.forEach((b, i) => console.log(`  ${i + 1}. ${b.book} (pos: ${b.pos})`));

// Find end: Glossary after Malachi
const malPos = bookPositions[bookPositions.length - 1].pos;
const afterMal = fullText.substring(malPos);
const glossaryMatch = afterMal.search(/G\s*L\s*O\s*S\s*S\s*A\s*R\s*Y/);
const endPos = glossaryMatch !== -1 ? malPos + glossaryMatch : fullText.length;
console.log('\nEnd position (Glossary):', endPos);

// Extract and parse each book
const commentary = {};
for (let i = 0; i < bookPositions.length; i++) {
  const start = bookPositions[i].pos;
  const end = i + 1 < bookPositions.length ? bookPositions[i + 1].pos : endPos;
  const bookText = fullText.substring(start, end);
  const bookName = bookPositions[i].book;
  const isSingleChapter = singleChapterBooks.includes(bookName);

  // The book header is the spaced-out name
  const spacedName = bookName.toUpperCase().split('').join(' ');
  const afterHeader = bookText.substring(spacedName.length);

  // Parse verse references
  const verseEntries = [];

  if (isSingleChapter) {
    // Single-chapter books: verses are "1." "2." etc. (no chapter prefix)
    // We need to be careful to only match standalone verse numbers, not cross-references
    // Pattern: start of line or after whitespace, a number followed by period and space
    // But also need to handle ranges like "1-4."
    const versePattern = /(?:^|\s)(\d+(?:[-–]\d+)?)\.\s/g;
    let match;
    while ((match = versePattern.exec(bookText)) !== null) {
      const ref = match[1].replace('–', '-');
      const verseNum = parseInt(ref.split('-')[0]);
      // Skip if this looks like a cross-reference (chapter:verse patterns nearby)
      // Only include if verse number is reasonable (1-21 for Obadiah)
      if (verseNum <= 50) {
        verseEntries.push({
          ref: '1:' + ref,  // Normalize to chapter:verse format
          pos: match.index,
          textStart: match.index + match[0].length
        });
      }
    }

    // Deduplicate: if same ref appears multiple times, keep the first
    const seen = new Set();
    const deduped = [];
    for (const entry of verseEntries) {
      if (!seen.has(entry.ref)) {
        seen.add(entry.ref);
        deduped.push(entry);
      }
    }
    verseEntries.length = 0;
    verseEntries.push(...deduped);
  } else {
    // Multi-chapter books: standard "chapter:verse." pattern
    const versePattern = /\b(\d+:\d+(?:[-–]\d+)?)\.\s/g;
    let match;
    while ((match = versePattern.exec(bookText)) !== null) {
      verseEntries.push({
        ref: match[1].replace('–', '-'),
        pos: match.index,
        textStart: match.index + match[0].length
      });
    }
  }

  // Filter out cross-reference false positives (chapter exceeds known book max)
  const maxCh = maxChapters[bookName] || 999;
  const filteredEntries = verseEntries.filter(entry => {
    const chapter = parseInt(entry.ref.split(':')[0]);
    return chapter <= maxCh;
  });

  // Group by chapter
  const verses = {};
  for (let j = 0; j < filteredEntries.length; j++) {
    const entry = filteredEntries[j];
    const nextPos = j + 1 < filteredEntries.length ? filteredEntries[j + 1].pos : bookText.length;
    let text = bookText.substring(entry.textStart, nextPos).trim();
    text = text.replace(/\n\n--- PAGEBREAK ---\n\n/g, ' ').replace(/\s+/g, ' ').trim();

    const chapter = entry.ref.split(':')[0];
    if (!verses[chapter]) verses[chapter] = {};
    verses[chapter][entry.ref] = text;
  }

  // Section headers: "1:1-5 Title Here" or "1:1—2:3 Title Here"
  const sectionPattern = /\b(\d+:\d+[-–]\d+(?::\d+)?)\s+([A-Z][A-Za-z\s,''&()\-]+?)(?=\s{2,}|\n|(?:\b\d+:\d+))/g;
  const sectionHeaders = {};
  let match;
  while ((match = sectionPattern.exec(bookText)) !== null) {
    const ref = match[1].replace('–', '-');
    const chapter = parseInt(ref.split(':')[0]);
    if (chapter > maxCh) continue; // Skip cross-reference false positives
    if (!sectionHeaders[chapter]) sectionHeaders[chapter] = {};
    sectionHeaders[chapter][ref] = match[2].trim();
  }

  // Introduction: text from the start until the first verse reference
  const firstVerseIdx = isSingleChapter
    ? bookText.search(/(?:^|\s)\d+(?:[-–]\d+)?\.\s/)
    : bookText.search(/\b\d+:\d+[-–]?\d*\.\s/);
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

  // Use "Song of Solomon" as the key name for compatibility, even though the PDF says "Song of Songs"
  const outputName = bookName === 'Song of Songs' ? 'Song of Solomon' : bookName;
  commentary[outputName] = { introduction, sectionHeaders, verses, totalVerses };
  console.log(`${outputName}: ${totalVerses} verse entries across ${Object.keys(verses).length} chapters`);
}

fs.writeFileSync('commentary-ot.json', JSON.stringify(commentary, null, 2));
fs.writeFileSync('commentary-ot-compact.json', JSON.stringify(commentary));
const sizeMB = (fs.statSync('commentary-ot-compact.json').size / 1024 / 1024).toFixed(2);
console.log(`\nDone! ${sizeMB} MB`);
