const fs = require('fs');

const pages = JSON.parse(fs.readFileSync('raw-text-ot-fmt.json', 'utf8'));

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

// Find book positions using spaced-out names (same approach as original)
const bookPositions = [];
for (const book of bookNames) {
  const spaced = book.toUpperCase().split('').join(' ');
  const idx = fullText.indexOf(spaced, 10000);
  if (idx !== -1) {
    bookPositions.push({ book, pos: idx });
    console.log(`Found ${book} at ${idx}`);
  } else {
    console.log(`WARNING: Could not find ${book}`);
  }
}

bookPositions.sort((a, b) => a.pos - b.pos);

const malPos = bookPositions[bookPositions.length - 1]?.pos || 0;
const afterMal = fullText.substring(malPos);
const glossaryMatch = afterMal.search(/G\s*L\s*O\s*S\s*S\s*A\s*R\s*Y/);
const endPos = glossaryMatch !== -1 ? malPos + glossaryMatch : fullText.length;

const commentary = {};
for (let i = 0; i < bookPositions.length; i++) {
  const start = bookPositions[i].pos;
  const end = i + 1 < bookPositions.length ? bookPositions[i + 1].pos : endPos;
  const bookText = fullText.substring(start, end);
  const bookName = bookPositions[i].book;
  const maxCh = maxChapters[bookName] || 150;

  // Parse verse references - may be in <b> tags
  const versePattern = /(?:<b>\s*)?(\d+:\d+(?:[-–]\d+)?)\.\s*(?:<\/b>)?/g;
  let match;
  const verseEntries = [];

  while ((match = versePattern.exec(bookText)) !== null) {
    const ref = match[1].replace('–', '-');
    const ch = parseInt(ref.split(':')[0]);
    if (ch > maxCh) continue; // skip cross-references
    verseEntries.push({ ref, pos: match.index, textStart: match.index + match[0].length });
  }

  const verses = {};
  for (let j = 0; j < verseEntries.length; j++) {
    const entry = verseEntries[j];
    const nextPos = j + 1 < verseEntries.length ? verseEntries[j + 1].pos : bookText.length;
    let text = bookText.substring(entry.textStart, nextPos).trim();
    text = text.replace(/\n\n--- PAGEBREAK ---\n\n/g, ' ').replace(/\s+/g, ' ').trim();
    text = text.replace(/^<\/[bi]>\s*/g, '').replace(/\s*<[bi]>$/g, '');
    text = text.replace(/<([bi])>\s*<\/\1>/g, '');

    const chapter = entry.ref.split(':')[0];
    if (!verses[chapter]) verses[chapter] = {};
    verses[chapter][entry.ref] = text;
  }

  // Section headers
  const sectionPattern = /(?:<b>\s*)?(\d+:\d+[-–]\d+)\s+([A-Za-z][^<\n]+?)(?:\s*<\/b>|\s{2,}|\n)/g;
  const sectionHeaders = {};
  while ((match = sectionPattern.exec(bookText)) !== null) {
    const ref = match[1].replace('–', '-');
    const ch = parseInt(ref.split(':')[0]);
    if (ch > maxCh) continue;
    const title = match[2].trim();
    if (!sectionHeaders[String(ch)]) sectionHeaders[String(ch)] = {};
    sectionHeaders[String(ch)][ref] = title;
  }

  // Introduction
  const firstVerse = bookText.search(/(?:<b>\s*)?\d+:\d+[-–]?\d*\.\s/);
  let introduction = '';
  if (firstVerse > 0) {
    introduction = bookText.substring(0, firstVerse).replace(/\n\n--- PAGEBREAK ---\n\n/g, ' ').replace(/\s+/g, ' ').trim();
  }

  let totalVerses = 0;
  for (const ch of Object.values(verses)) totalVerses += Object.keys(ch).length;

  // Use "Song of Solomon" as key for compatibility
  const key = bookName === 'Song of Songs' ? 'Song of Solomon' : bookName;
  commentary[key] = { introduction, sectionHeaders, verses, totalVerses };
  console.log(`  ${bookName}: ${totalVerses} verses`);
}

fs.writeFileSync('commentary-ot-fmt.json', JSON.stringify(commentary, null, 2));
console.log('Saved commentary-ot-fmt.json');
