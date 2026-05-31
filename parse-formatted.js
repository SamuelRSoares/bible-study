const fs = require('fs');

function parseCommentary(rawFile, bookNames, outputFile, options = {}) {
  const { strictMarkers = false } = options;
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
    //
    // strictMarkers (NT): real verse markers in the formatted NT source always
    // TERMINATE a bold run, i.e. they look like `<b> 6:12.   </b>` (optionally
    // preceded by a section title in the same bold block). Inline cross-references
    // such as "(see comment on 6:12.)" or "cf. Zech 13:9." are NOT followed by
    // </b>, so requiring the closing tag excludes them. This prevents a cross-
    // reference from being mistaken for a verse marker and overwriting/truncating
    // the real commentary (e.g. the "6:12." inside the 15:35-38 note used to
    // overwrite 1 Corinthians 6:12 and truncate 15:35-38).
    //
    // The period that follows the reference may sit inside the bold run
    // (`<b> 6:12.   </b>`) or just outside it (`<b> 22:16 </b>.`), and the marker
    // may be a range (`<b> 12:14-21 </b>.`). A period must be present either way:
    // that is what distinguishes a real marker from a running page header like
    // `<b> 15:20-28 </b>` (no period, sits next to a page break). The reference is
    // always bold-wrapped, which also excludes inline cross-references.
    //
    // The permissive pattern (OT) keeps the original behavior because the OT
    // formatted source does not bold its verse markers.
    const versePattern = strictMarkers
      ? /<b>[^<]*?(\d+:\d+(?:[-–]\d+)?)\.\s*<\/b>|<b>[^<]*?(\d+:\d+(?:[-–]\d+)?)\s*<\/b>\s*\./g
      : /<b>\s*(\d+:\d+(?:[-–]\d+)?)\.\s*<\/b>|(?:<b>)?\s*\b(\d+:\d+(?:[-–]\d+)?)\.\s*(?:<\/b>)?/g;
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

    // Section headers (may be in <b> tags). Capture positions too, so we can
    // (a) stop the preceding verse's text at the header (instead of swallowing
    // the header + its intro) and (b) extract the short introduction that follows
    // a section header before its first verse marker.
    const sectionPattern = /<b>\s*(\d+:\d+[-–]\d+)\s+([^<]+)<\/b>|(\d+:\d+[-–]\d+)\s+([A-Z][A-Za-z\s,''&()\-]+?)(?=\s{2,}|\n|(?:\b\d+:\d+))/g;
    const sectionEntries = [];
    while ((match = sectionPattern.exec(bookText)) !== null) {
      const ref = (match[1] || match[3] || '').replace('–', '-');
      let title = (match[2] || match[4] || '').trim();
      if (!ref) continue;
      // A section header and the first verse marker sometimes share one bold run,
      // e.g. "7:39-40 Widows and Remarriage  7:39." — drop the trailing marker.
      title = title.replace(/\s+\d+:\d+(?:[-–]\d+)?\.\s*$/, '').trim();
      sectionEntries.push({
        ref,
        title,
        pos: match.index,
        textStart: match.index + match[0].length,
      });
    }

    // A run of commentary text ends at the next boundary of either kind: the next
    // verse marker OR the next section header.
    const boundaries = [
      ...verseEntries.map(e => e.pos),
      ...sectionEntries.map(e => e.pos),
    ].sort((a, b) => a - b);
    const nextBoundaryAfter = pos => {
      for (const b of boundaries) if (b > pos) return b;
      return bookText.length;
    };

    function cleanText(t) {
      t = t.replace(/\n\n--- PAGEBREAK ---\n\n/g, ' ').replace(/\s+/g, ' ').trim();
      // Clean up stray tags at boundaries, then remove empty tags
      t = t.replace(/^<\/[bi]>\s*/g, '').replace(/\s*<[bi]>$/g, '');
      t = t.replace(/<([bi])>\s*<\/\1>/g, '');
      return t;
    }

    // When a section header and its first verse marker share one bold run, e.g.
    // "<b>12:12-26 All Members of the Body Are Necessary  12:12.</b>", the text
    // that follows is the commentary for the whole section range. Key it under the
    // section range (12:12-26) instead of the single start verse (12:12) so that
    // every verse in the range resolves to it (and they highlight together), while
    // any verses that have their own marker inside the section keep their own note.
    // Only when the section has NO other markers inside its range: otherwise the
    // sub-markers (e.g. 12:13, 12:14-21 within 12:12-26) already cover the verses
    // and must not be shadowed by an overlapping range.
    const keyOverride = new Map(); // verseEntry -> section range ref
    for (const sec of sectionEntries) {
      const rangeMatch = sec.ref.match(/^(\d+):(\d+)-(\d+)$/);
      if (!rangeMatch) continue;
      const [, rc, rs, re] = rangeMatch;
      const start = parseInt(rs), end = parseInt(re);
      const startRef = `${rc}:${rs}`;
      const embedded = verseEntries.find(
        v => v.pos >= sec.pos && v.pos < sec.textStart && v.ref === startRef
      );
      if (!embedded) continue;
      const hasInnerMarker = verseEntries.some(v => {
        if (v === embedded || v.ref.split(':')[0] !== rc) return false;
        const sv = parseInt(v.ref.split(':')[1]);
        return sv > start && sv <= end;
      });
      if (!hasInnerMarker) keyOverride.set(embedded, sec.ref);
    }

    // Group verses by chapter; each verse's text stops at the next boundary.
    const verses = {};
    for (const entry of verseEntries) {
      const text = cleanText(bookText.substring(entry.textStart, nextBoundaryAfter(entry.pos)));
      const ref = keyOverride.get(entry) || entry.ref;
      const chapter = ref.split(':')[0];
      if (!verses[chapter]) verses[chapter] = {};
      verses[chapter][ref] = text;
    }

    // Section headers as { title, intro }. The text after a header, up to the next
    // boundary, is either:
    //   - a brief introduction to a verse-by-verse section (kept as `intro`), or
    //   - the entire commentary for a "block" section that has no per-verse markers
    //     (e.g. Ephesians "6:1-4 Children and Fathers"). In that case the text is
    //     stored as a range commentary so every verse in the range shows it (and
    //     they highlight together), exactly like other multi-verse comments.
    // A marker embedded in the header's own bold run (e.g. "7:39-40 ... 7:39.")
    // means the commentary starts immediately, so there is no intro.
    const sectionHeaders = {};
    for (const sec of sectionEntries) {
      const embeddedMarker = verseEntries.some(v => v.pos >= sec.pos && v.pos < sec.textStart);
      let intro = embeddedMarker
        ? ''
        : cleanText(bookText.substring(sec.textStart, nextBoundaryAfter(sec.pos)));

      // Block section: no verse marker falls inside the header's range.
      const rangeMatch = sec.ref.match(/^(\d+):(\d+)-(\d+)$/);
      if (intro && rangeMatch) {
        const rc = rangeMatch[1];
        const start = parseInt(rangeMatch[2]);
        const end = parseInt(rangeMatch[3]);
        const hasMarkerInRange = Object.keys(verses[rc] || {}).some(k => {
          const sv = parseInt(k.split(':')[1]);
          return sv >= start && sv <= end;
        });
        if (!hasMarkerInRange) {
          if (!verses[rc]) verses[rc] = {};
          verses[rc][sec.ref] = intro;
          intro = '';
        }
      }

      const chapter = sec.ref.split(':')[0];
      if (!sectionHeaders[chapter]) sectionHeaders[chapter] = {};
      sectionHeaders[chapter][sec.ref] = { title: sec.title, intro };
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
parseCommentary('raw-text-nt-fmt.json', ntBooks, 'commentary-nt-fmt.json', { strictMarkers: true });

// NOTE: The OT commentary (commentary-ot-fmt.json) is generated by parse-ot-fmt.js,
// not here. The OT formatted source uses a different layout (verse markers are not
// bold-wrapped) and the book-detection above does not match it, so running an OT
// pass here would only overwrite commentary-ot-fmt.json with empty output.

console.log('\nDone!');
