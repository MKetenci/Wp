'use strict';
const path = require('node:path');
const { openDb } = require('./src/db');
const { createApp } = require('./src/app');
const { seed } = require('./src/seed');

const dbFile = process.env.WIKI_DB || path.join(__dirname, 'data', 'wiki.db');
const port = Number(process.env.PORT) || 3000;

const repo = openDb(dbFile);
if (repo.count() === 0) {
  const n = seed(repo);
  console.log(`Boş veritabanına ${n} örnek sayfa eklendi.`);
}

createApp(repo).listen(port, () => {
  console.log(`Tenno Arşivi çalışıyor: http://localhost:${port}`);
});
