// build-bible.js — builds public/data/bible.json with ONLY the Bible text
// (the 4 translations). Commentary lives in separate commentary-<id>.json files
// built by build-commentary.js, so each person can plug in their own study bible.
//
// Run once after downloading the translations (node download-bibles.js):
//   node build-bible.js
const fs = require('fs');
const { allBooks, bookId } = require('./books-meta');

function loadBible(path) {
  const raw = fs.readFileSync(path, 'utf8').replace(/^﻿/, '');
  return JSON.parse(raw);
}

const bibles = {
  NAA: loadBible('bibles/NAA.json'),
  NVI: loadBible('bibles/NVI.json'),
  ACF: loadBible('bibles/ACF.json'),
  KJV: loadBible('bibles/KJV.json'),
};

function findBook(bibleArr, abbrev) {
  return bibleArr.find(b => b.abbrev.toLowerCase() === abbrev.toLowerCase());
}

const appData = {
  books: [],
  translations: ['NAA', 'NVI', 'ACF', 'KJV'],
};

for (const bk of allBooks) {
  const naaBook = findBook(bibles.NAA, bk.abbrevPt);
  if (!naaBook) {
    console.log(`WARNING: ${bk.namePt} (${bk.abbrevPt}) not found in NAA`);
    continue;
  }

  const bookData = {
    id: bookId(bk.name),
    name: bk.name,
    namePt: bk.namePt,
    chapters: [],
  };

  const chapterCount = naaBook.chapters.length;
  for (let ch = 0; ch < chapterCount; ch++) {
    const chNum = ch + 1;
    const chapterData = { number: chNum, verses: [] };
    const naaVerses = naaBook.chapters[ch];

    for (let v = 0; v < naaVerses.length; v++) {
      const verse = { number: v + 1, text: {} };
      for (const [name, bible] of Object.entries(bibles)) {
        const abbrev = name === 'KJV' ? bk.abbrevEn : bk.abbrevPt;
        const book = findBook(bible, abbrev);
        if (book && book.chapters[ch] && book.chapters[ch][v]) {
          verse.text[name] = book.chapters[ch][v];
        }
      }
      chapterData.verses.push(verse);
    }
    bookData.chapters.push(chapterData);
  }

  appData.books.push(bookData);
  console.log(`${bk.namePt}: ${chapterCount} caps`);
}

fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/bible.json', JSON.stringify(appData));
const sizeMB = (fs.statSync('public/data/bible.json').size / 1024 / 1024).toFixed(2);
console.log(`\nSaved public/data/bible.json (${sizeMB} MB)`);
console.log(`Books: ${appData.books.length}`);
