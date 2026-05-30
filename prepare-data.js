const fs = require('fs');

// All Bible books: OT then NT
const allBooks = [
  // OT
  { name: 'Genesis', abbrevPt: 'Gn', abbrevEn: 'gn', namePt: 'Gênesis' },
  { name: 'Exodus', abbrevPt: 'Êx', abbrevEn: 'ex', namePt: 'Êxodo' },
  { name: 'Leviticus', abbrevPt: 'Lv', abbrevEn: 'lv', namePt: 'Levítico' },
  { name: 'Numbers', abbrevPt: 'Nm', abbrevEn: 'nm', namePt: 'Números' },
  { name: 'Deuteronomy', abbrevPt: 'Dt', abbrevEn: 'dt', namePt: 'Deuteronômio' },
  { name: 'Joshua', abbrevPt: 'Js', abbrevEn: 'js', namePt: 'Josué' },
  { name: 'Judges', abbrevPt: 'Jz', abbrevEn: 'jud', namePt: 'Juízes' },
  { name: 'Ruth', abbrevPt: 'Rt', abbrevEn: 'rt', namePt: 'Rute' },
  { name: '1 Samuel', abbrevPt: '1Sm', abbrevEn: '1sm', namePt: '1 Samuel' },
  { name: '2 Samuel', abbrevPt: '2Sm', abbrevEn: '2sm', namePt: '2 Samuel' },
  { name: '1 Kings', abbrevPt: '1Rs', abbrevEn: '1kgs', namePt: '1 Reis' },
  { name: '2 Kings', abbrevPt: '2Rs', abbrevEn: '2kgs', namePt: '2 Reis' },
  { name: '1 Chronicles', abbrevPt: '1Cr', abbrevEn: '1ch', namePt: '1 Crônicas' },
  { name: '2 Chronicles', abbrevPt: '2Cr', abbrevEn: '2ch', namePt: '2 Crônicas' },
  { name: 'Ezra', abbrevPt: 'Ed', abbrevEn: 'ezr', namePt: 'Esdras' },
  { name: 'Nehemiah', abbrevPt: 'Ne', abbrevEn: 'ne', namePt: 'Neemias' },
  { name: 'Esther', abbrevPt: 'Et', abbrevEn: 'et', namePt: 'Ester' },
  { name: 'Job', abbrevPt: 'Jó', abbrevEn: 'job', namePt: 'Jó' },
  { name: 'Psalms', abbrevPt: 'Sl', abbrevEn: 'ps', namePt: 'Salmos' },
  { name: 'Proverbs', abbrevPt: 'Pv', abbrevEn: 'prv', namePt: 'Provérbios' },
  { name: 'Ecclesiastes', abbrevPt: 'Ec', abbrevEn: 'ec', namePt: 'Eclesiastes' },
  { name: 'Song of Solomon', abbrevPt: 'Ct', abbrevEn: 'so', namePt: 'Cânticos' },
  { name: 'Isaiah', abbrevPt: 'Is', abbrevEn: 'is', namePt: 'Isaías' },
  { name: 'Jeremiah', abbrevPt: 'Jr', abbrevEn: 'jr', namePt: 'Jeremias' },
  { name: 'Lamentations', abbrevPt: 'Lm', abbrevEn: 'lm', namePt: 'Lamentações' },
  { name: 'Ezekiel', abbrevPt: 'Ez', abbrevEn: 'ez', namePt: 'Ezequiel' },
  { name: 'Daniel', abbrevPt: 'Dn', abbrevEn: 'dn', namePt: 'Daniel' },
  { name: 'Hosea', abbrevPt: 'Os', abbrevEn: 'ho', namePt: 'Oséias' },
  { name: 'Joel', abbrevPt: 'Jl', abbrevEn: 'jl', namePt: 'Joel' },
  { name: 'Amos', abbrevPt: 'Am', abbrevEn: 'am', namePt: 'Amós' },
  { name: 'Obadiah', abbrevPt: 'Ob', abbrevEn: 'ob', namePt: 'Obadias' },
  { name: 'Jonah', abbrevPt: 'Jn', abbrevEn: 'jn', namePt: 'Jonas' },
  { name: 'Micah', abbrevPt: 'Mq', abbrevEn: 'mi', namePt: 'Miquéias' },
  { name: 'Nahum', abbrevPt: 'Na', abbrevEn: 'na', namePt: 'Naum' },
  { name: 'Habakkuk', abbrevPt: 'Hc', abbrevEn: 'hk', namePt: 'Habacuque' },
  { name: 'Zephaniah', abbrevPt: 'Sf', abbrevEn: 'zp', namePt: 'Sofonias' },
  { name: 'Haggai', abbrevPt: 'Ag', abbrevEn: 'hg', namePt: 'Ageu' },
  { name: 'Zechariah', abbrevPt: 'Zc', abbrevEn: 'zc', namePt: 'Zacarias' },
  { name: 'Malachi', abbrevPt: 'Ml', abbrevEn: 'ml', namePt: 'Malaquias' },
  // NT
  { name: 'Matthew', abbrevPt: 'Mt', abbrevEn: 'mt', namePt: 'Mateus' },
  { name: 'Mark', abbrevPt: 'Mc', abbrevEn: 'mk', namePt: 'Marcos' },
  { name: 'Luke', abbrevPt: 'Lc', abbrevEn: 'lk', namePt: 'Lucas' },
  { name: 'John', abbrevPt: 'Jo', abbrevEn: 'jo', namePt: 'João' },
  { name: 'Acts', abbrevPt: 'At', abbrevEn: 'act', namePt: 'Atos' },
  { name: 'Romans', abbrevPt: 'Rm', abbrevEn: 'rm', namePt: 'Romanos' },
  { name: '1 Corinthians', abbrevPt: '1Co', abbrevEn: '1co', namePt: '1 Coríntios' },
  { name: '2 Corinthians', abbrevPt: '2Co', abbrevEn: '2co', namePt: '2 Coríntios' },
  { name: 'Galatians', abbrevPt: 'Gl', abbrevEn: 'gl', namePt: 'Gálatas' },
  { name: 'Ephesians', abbrevPt: 'Ef', abbrevEn: 'eph', namePt: 'Efésios' },
  { name: 'Philippians', abbrevPt: 'Fp', abbrevEn: 'ph', namePt: 'Filipenses' },
  { name: 'Colossians', abbrevPt: 'Cl', abbrevEn: 'cl', namePt: 'Colossenses' },
  { name: '1 Thessalonians', abbrevPt: '1Ts', abbrevEn: '1ts', namePt: '1 Tessalonicenses' },
  { name: '2 Thessalonians', abbrevPt: '2Ts', abbrevEn: '2ts', namePt: '2 Tessalonicenses' },
  { name: '1 Timothy', abbrevPt: '1Tn', abbrevEn: '1tm', namePt: '1 Timóteo' },
  { name: '2 Timothy', abbrevPt: '2Tm', abbrevEn: '2tm', namePt: '2 Timóteo' },
  { name: 'Titus', abbrevPt: 'Tt', abbrevEn: 'tt', namePt: 'Tito' },
  { name: 'Philemon', abbrevPt: 'Fm', abbrevEn: 'phm', namePt: 'Filemom' },
  { name: 'Hebrews', abbrevPt: 'Hb', abbrevEn: 'hb', namePt: 'Hebreus' },
  { name: 'James', abbrevPt: 'Tg', abbrevEn: 'jm', namePt: 'Tiago' },
  { name: '1 Peter', abbrevPt: '1Pe', abbrevEn: '1pe', namePt: '1 Pedro' },
  { name: '2 Peter', abbrevPt: '2Pe', abbrevEn: '2pe', namePt: '2 Pedro' },
  { name: '1 John', abbrevPt: '1Jo', abbrevEn: '1jo', namePt: '1 João' },
  { name: '2 John', abbrevPt: '2Jo', abbrevEn: '2jo', namePt: '2 João' },
  { name: '3 John', abbrevPt: '3Jo', abbrevEn: '3jo', namePt: '3 João' },
  { name: 'Jude', abbrevPt: 'Jd', abbrevEn: 'jd', namePt: 'Judas' },
  { name: 'Revelation', abbrevPt: 'Ap', abbrevEn: 're', namePt: 'Apocalipse' },
];

// Load Bibles
function loadBible(path) {
  const raw = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

const bibles = {
  NAA: loadBible('bibles/NAA.json'),
  NVI: loadBible('bibles/NVI.json'),
  ACF: loadBible('bibles/ACF.json'),
  KJV: loadBible('bibles/KJV.json'),
};

// Load commentaries (OT + NT) - use formatted versions with <b>/<i> tags
const commentaryNT = JSON.parse(fs.readFileSync('commentary-nt-fmt.json', 'utf8'));
const commentaryOT = JSON.parse(fs.readFileSync('commentary-ot-fmt.json', 'utf8'));
const commentary = { ...commentaryOT, ...commentaryNT };

function findBook(bibleArr, abbrev) {
  return bibleArr.find(b => b.abbrev.toLowerCase() === abbrev.toLowerCase());
}

const appData = {
  books: [],
  translations: ['NAA', 'NVI', 'ACF', 'KJV'],
};

for (const bk of allBooks) {
  const bookData = {
    id: bk.name.toLowerCase().replace(/\s+/g, '-'),
    name: bk.name,
    namePt: bk.namePt,
    chapters: [],
  };

  const naaBook = findBook(bibles.NAA, bk.abbrevPt);
  if (!naaBook) {
    console.log(`WARNING: ${bk.namePt} (${bk.abbrevPt}) not found in NAA`);
    continue;
  }

  const chapterCount = naaBook.chapters.length;

  for (let ch = 0; ch < chapterCount; ch++) {
    const chNum = ch + 1;
    const chapterData = { number: chNum, verses: [] };
    const naaVerses = naaBook.chapters[ch];

    for (let v = 0; v < naaVerses.length; v++) {
      const vNum = v + 1;
      const verseRef = `${chNum}:${vNum}`;
      const verse = { number: vNum, text: {}, commentary: null };

      for (const [name, bible] of Object.entries(bibles)) {
        const abbrev = name === 'KJV' ? bk.abbrevEn : bk.abbrevPt;
        const book = findBook(bible, abbrev);
        if (book && book.chapters[ch] && book.chapters[ch][v]) {
          verse.text[name] = book.chapters[ch][v];
        }
      }

      const comm = commentary[bk.name];
      if (comm && comm.verses) {
        const chStr = String(chNum);
        if (comm.verses[chStr]) {
          if (comm.verses[chStr][verseRef]) {
            verse.commentary = comm.verses[chStr][verseRef];
          } else {
            for (const [ref, text] of Object.entries(comm.verses[chStr])) {
              const rangeMatch = ref.match(/^(\d+):(\d+)-(\d+)$/);
              if (rangeMatch) {
                const refCh = parseInt(rangeMatch[1]);
                const refStart = parseInt(rangeMatch[2]);
                const refEnd = parseInt(rangeMatch[3]);
                if (refCh === chNum && vNum >= refStart && vNum <= refEnd) {
                  if (vNum === refStart) {
                    verse.commentary = text;
                    verse.commentaryRange = ref;
                  } else {
                    verse.commentaryRange = ref;
                  }
                  break;
                }
              }
            }
          }
        }
      }

      chapterData.verses.push(verse);
    }

    bookData.chapters.push(chapterData);
  }

  appData.books.push(bookData);
  console.log(`${bk.namePt}: ${chapterCount} caps`);
}

// Section headers and introductions from both commentaries
const sectionHeaders = {};
const introductions = {};
for (const bk of allBooks) {
  const comm = commentary[bk.name];
  if (comm?.sectionHeaders) sectionHeaders[bk.name] = comm.sectionHeaders;
  if (comm?.introduction) introductions[bk.name] = comm.introduction;
}
appData.sectionHeaders = sectionHeaders;
appData.introductions = introductions;

fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/app-data.json', JSON.stringify(appData));
const sizeMB = (fs.statSync('public/data/app-data.json').size / 1024 / 1024).toFixed(2);
console.log(`\nSaved app-data.json (${sizeMB} MB)`);
console.log(`Books: ${appData.books.length}`);
