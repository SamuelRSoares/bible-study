// build-commentary.js — builds public/data/commentary-<id>.json for ONE study bible.
//
//   node build-commentary.js <id>
//
// It reads the recipe at commentaries/<id>.js, which only needs to declare where the
// already-parsed commentary file(s) live. Each source file must follow the contract
// (see commentaries/README.md):
//
//   { "<EnglishBookName>": { introduction, sectionHeaders, verses: { "<ch>": { "<ref>": "<html>" } } } }
//
// Requires public/data/bible.json to exist first (run: node build-bible.js), because
// commentary is attached verse-by-verse against the real chapter/verse structure and
// multi-verse ranges ("1:2-3") are resolved here, once, instead of in the browser.
const fs = require('fs');
const path = require('path');
const { allBooks, bookId } = require('./books-meta');

const id = process.argv[2];
if (!id) {
  console.error('Usage: node build-commentary.js <id>');
  const dir = path.join(__dirname, 'commentaries');
  if (fs.existsSync(dir)) {
    const ids = fs.readdirSync(dir)
      .filter(f => f.endsWith('.js') && !f.endsWith('.example.js'))
      .map(f => f.replace(/\.js$/, ''));
    if (ids.length) console.error(`Available: ${ids.join(', ')}`);
  }
  process.exit(1);
}

const recipePath = path.join(__dirname, 'commentaries', `${id}.js`);
if (!fs.existsSync(recipePath)) {
  console.error(`No recipe at commentaries/${id}.js — copy commentaries/ivp.example.js and adjust it.`);
  process.exit(1);
}
const recipe = require(recipePath);

const biblePath = 'public/data/bible.json';
if (!fs.existsSync(biblePath)) {
  console.error('public/data/bible.json not found. Run: node build-bible.js');
  process.exit(1);
}
const bible = JSON.parse(fs.readFileSync(biblePath, 'utf8'));

// Merge all source files into one { BookName: {...} } object.
const commentary = {};
for (const src of recipe.sources) {
  if (!fs.existsSync(src)) {
    console.error(`Source file not found: ${src}`);
    process.exit(1);
  }
  Object.assign(commentary, JSON.parse(fs.readFileSync(src, 'utf8')));
}

const out = {
  id: recipe.id,
  name: recipe.name,
  introductions: {},   // keyed by English book name (matches the client lookup)
  sectionHeaders: {},  // keyed by English book name
  verses: {},          // bookId -> chapter -> verseNumber -> { c: text, r: range }
};

let totalAttached = 0;
for (const bk of allBooks) {
  const comm = commentary[bk.name];
  if (!comm) continue;
  if (comm.sectionHeaders) out.sectionHeaders[bk.name] = comm.sectionHeaders;
  if (comm.introduction) out.introductions[bk.name] = comm.introduction;
  if (!comm.verses) continue;

  const id = bookId(bk.name);
  const bibleBook = bible.books.find(b => b.id === id);
  if (!bibleBook) continue;

  const byChapter = {};
  for (const chapter of bibleBook.chapters) {
    const chNum = chapter.number;
    const chStr = String(chNum);
    const commCh = comm.verses[chStr];
    if (!commCh) continue;

    for (const verse of chapter.verses) {
      const vNum = verse.number;
      const verseRef = `${chNum}:${vNum}`;
      let text = null, range = null;

      if (commCh[verseRef]) {
        text = commCh[verseRef];
      } else {
        // Multi-verse note ("1:2-3"): the first verse holds the text; the rest
        // just point at the range so they highlight together in the UI.
        for (const [ref, t] of Object.entries(commCh)) {
          const m = ref.match(/^(\d+):(\d+)-(\d+)$/);
          if (!m) continue;
          const refCh = parseInt(m[1]), refStart = parseInt(m[2]), refEnd = parseInt(m[3]);
          if (refCh === chNum && vNum >= refStart && vNum <= refEnd) {
            range = ref;
            if (vNum === refStart) text = t;
            break;
          }
        }
      }

      if (text || range) {
        if (!byChapter[chStr]) byChapter[chStr] = {};
        const entry = {};
        if (text) entry.c = text;
        if (range) entry.r = range;
        byChapter[chStr][vNum] = entry;
        totalAttached++;
      }
    }
  }
  if (Object.keys(byChapter).length) out.verses[id] = byChapter;
}

fs.mkdirSync('public/data', { recursive: true });
const outPath = `public/data/commentary-${id}.json`;
fs.writeFileSync(outPath, JSON.stringify(out));
const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
console.log(`Saved ${outPath} (${sizeMB} MB) — ${totalAttached} verse entries.`);

// Regenerate the catalog from whatever commentary-*.json files now exist, so the
// app's study-bible dropdown stays in sync automatically.
const dataDir = 'public/data';
const commentaries = [];
for (const f of fs.readdirSync(dataDir)) {
  const m = f.match(/^commentary-(.+)\.json$/);
  if (!m) continue;
  try {
    const c = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
    commentaries.push({ id: c.id || m[1], name: c.name || m[1] });
  } catch {}
}
commentaries.sort((a, b) => a.name.localeCompare(b.name));
const catalog = {
  commentaries,
  default: commentaries.find(c => c.id === id)?.id || commentaries[0]?.id || null,
};
fs.writeFileSync(path.join(dataDir, 'catalog.json'), JSON.stringify(catalog, null, 2));
console.log(`Catalog: ${commentaries.map(c => c.id).join(', ') || '(none)'}`);
