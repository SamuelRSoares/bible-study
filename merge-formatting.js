const fs = require('fs');

// Strategy: use the already-parsed commentary structure (which has correct book/verse positions)
// but re-extract the verse text from the formatted raw text to get <b>/<i> tags.

function mergeFormatting(rawFmtFile, rawPlainFile, commentaryFile, outputFile) {
  const fmtPages = JSON.parse(fs.readFileSync(rawFmtFile, 'utf8'));
  const plainPages = JSON.parse(fs.readFileSync(rawPlainFile, 'utf8'));
  const commentary = JSON.parse(fs.readFileSync(commentaryFile, 'utf8'));

  const fmtText = fmtPages.join('\n\n--- PAGEBREAK ---\n\n');
  const plainText = plainPages.join('\n\n--- PAGEBREAK ---\n\n');

  let updated = 0;
  let missed = 0;

  for (const [bookName, bookData] of Object.entries(commentary)) {
    for (const [chNum, chVerses] of Object.entries(bookData.verses)) {
      for (const [ref, plainContent] of Object.entries(chVerses)) {
        // Find this verse's content in the formatted text
        // Use a snippet of the plain text to locate it in formatted text
        // Strip to first ~40 chars of actual words to search for
        const words = plainContent.replace(/<[^>]+>/g, '').substring(0, 80).trim();
        if (!words || words.length < 10) continue;

        // Search for these words in the formatted text (allowing tags inside)
        // Take the first 3-4 significant words
        const wordArr = words.split(/\s+/).filter(w => w.length > 2).slice(0, 4);
        if (wordArr.length < 2) continue;

        // Build a regex that allows HTML tags between words
        const searchPattern = wordArr.map(w =>
          w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        ).join('[\\s<>/bi]*?');

        try {
          const regex = new RegExp(searchPattern);
          const match = fmtText.match(regex);

          if (match) {
            // Found the start position - now extract from formatted text
            const startIdx = match.index;
            // Find how far the plain content extends
            const plainEnd = plainContent.replace(/<[^>]+>/g, '').substring(plainContent.length - 60).trim();
            const endWords = plainEnd.split(/\s+/).filter(w => w.length > 2).slice(-3);

            if (endWords.length >= 2) {
              const endPattern = endWords.map(w =>
                w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              ).join('[\\s<>/bi]*?');

              try {
                const endRegex = new RegExp(endPattern, 'g');
                // Search from startIdx
                endRegex.lastIndex = startIdx;
                const endMatch = endRegex.exec(fmtText);

                if (endMatch) {
                  let fmtContent = fmtText.substring(startIdx, endMatch.index + endMatch[0].length);
                  fmtContent = fmtContent.replace(/\n\n--- PAGEBREAK ---\n\n/g, ' ').replace(/\s+/g, ' ').trim();
                  // Clean up orphaned tags
                  fmtContent = fmtContent.replace(/<([bi])>\s*<\/\1>/g, '');
                  bookData.verses[chNum][ref] = fmtContent;
                  updated++;
                  continue;
                }
              } catch {}
            }
          }
        } catch {}
        missed++;
      }
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(commentary, null, 2));
  console.log(`${outputFile}: updated ${updated} verses, missed ${missed}`);
}

mergeFormatting('raw-text-nt-fmt.json', 'raw-text.json', 'commentary.json', 'commentary-fmt.json');
mergeFormatting('raw-text-ot-fmt.json', 'raw-text-ot.json', 'commentary-ot.json', 'commentary-ot-fmt.json');
