const fs = require('fs');

function parseCommentary(rawFile, bookNames, outputFile) {
  const pages = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  let fullText = pages.join('\n\n--- PAGEBREAK ---\n\n');

  // Find book positions
  const bookPositions = [];
  for (const book of bookNames) {
    let escaped = book.replace(/\s+/g, '\\s+');
    // Handle bold tags around book name or INTRODUCTION
    // The INTRODUCTION keyword might be in <b> tags
    // Try multiple patterns
    const patterns = [
      new RegExp(`(?<!\\d\\s*)${escaped}\\s+INTRODUCTION`, 'g'),
      new RegExp(`(?<!\\d\\s*)${escaped}\\s*<\\/[bi]>\\s*INTRODUCTION`, 'g'),
      new RegExp(`(?<!\\d\\s*)${escaped}\\s*<[bi]>\\s*INTRODUCTION`, 'g'),
      new RegExp(`<[bi]>\\s*${escaped}\\s*<\\/[bi]>\\s*(?:<[bi]>)?\\s*INTRODUCTION`, 'g'),
      // Book name followed by <b> INTRODUCTION (common NT pattern)
      new RegExp(`(?<!\\d\\s*)${escaped}\\s*<b>\\s*INTRODUCTION`, 'g'),
      // OT spaced chars like G E N E S I S
      new RegExp(book.replace(/[A-Za-z]/g, c => c + '\\s*') + '(?:<\\/[bi]>)?\\s*(?:<[bi]>)?\\s*INTRODUCTION', 'g'),
    ];

    let bestMatch = null;
    for (const regex of patterns) {
      let match;
      while ((match = regex.exec(fullText)) !== null) {
        if (match.index < 50000) continue;
        if (!bestMatch || match.index < bestMatch.index) {
          bestMatch = match;
        }
      }
    }

    if (bestMatch) {
      bookPositions.push({ book, pos: bestMatch.index });
    } else {
      console.log(`  WARNING: Could not find ${book}`);
    }
  }

  bookPositions.sort((a, b) => a.pos - b.pos);

  // Find end
  const lastBookPos = bookPositions[bookPositions.length - 1]?.pos || 0;
  const afterLast = fullText.substring(lastBookPos);
  const glossaryMatch = afterLast.search(/\bGlossary\b/);
  const endPos = glossaryMatch !== -1 ? lastBookPos + glossaryMatch : fullText.length;

  const commentary = {};
  for (let i = 0; i < bookPositions.length; i++) {
    const start = bookPositions[i].pos;
    const end = i + 1 < bookPositions.length ? bookPositions[i + 1].pos : endPos;
    const bookText = fullText.substring(start, end);
    const bookName = bookPositions[i].book;

    // Parse verse references (they may be in <b> tags)
    // Pattern: <b>1:1.</b> or <b>1:1. </b> or just 1:1.
    const versePattern = /<b>\s*(\d+:\d+(?:[-–]\d+)?)\.\s*<\/b>|(?:<b>)?\s*\b(\d+:\d+(?:[-–]\d+)?)\.\s*(?:<\/b>)?/g;
    let match;
    const verseEntries = [];

    while ((match = versePattern.exec(bookText)) !== null) {
      const ref = (match[1] || match[2]).replace('–', '-');
      verseEntries.push({
        ref,
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
      // Clean up stray tags at boundaries
      text = text.replace(/^<\/[bi]>\s*/g, '').replace(/\s*<[bi]>$/g, '');
      // Remove empty tags
      text = text.replace(/<([bi])>\s*<\/\1>/g, '');

      const chapter = entry.ref.split(':')[0];
      if (!verses[chapter]) verses[chapter] = {};
      verses[chapter][entry.ref] = text;
    }

    // Section headers (may be in <b> tags)
    const sectionPattern = /<b>\s*(\d+:\d+[-–]\d+)\s+([^<]+)<\/b>|(\d+:\d+[-–]\d+)\s+([A-Z][A-Za-z\s,''&()\-]+?)(?=\s{2,}|\n|(?:\b\d+:\d+))/g;
    const sectionHeaders = {};
    while ((match = sectionPattern.exec(bookText)) !== null) {
      const ref = (match[1] || match[3] || '').replace('–', '-');
      const title = (match[2] || match[4] || '').trim();
      if (!ref) continue;
      const chapter = ref.split(':')[0];
      if (!sectionHeaders[chapter]) sectionHeaders[chapter] = {};
      sectionHeaders[chapter][ref] = title;
    }

    // Introduction
    const firstVerseIdx = bookText.search(/<b>\s*\d+:\d+[-–]?\d*\.\s*<\/b>|\b\d+:\d+[-–]?\d*\.\s/);
    const firstSectionIdx = bookText.search(/<b>\s*\d+:\d+[-–]\d+\s+[A-Z]|\b\d+:\d+[-–]\d+\s+[A-Z][a-z]/);
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
    console.log(`  ${bookName}: ${totalVerses} verses`);
  }

  fs.writeFileSync(outputFile, JSON.stringify(commentary, null, 2));
  console.log(`  Saved ${outputFile}`);
  return commentary;
}

// NT
console.log('=== Parsing NT ===');
const ntBooks = [
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];
parseCommentary('raw-text-nt-fmt.json', ntBooks, 'commentary-nt-fmt.json');

// OT
console.log('\n=== Parsing OT ===');
const otBooks = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'
];
parseCommentary('raw-text-ot-fmt.json', otBooks, 'commentary-ot-fmt.json');

console.log('\nDone!');
