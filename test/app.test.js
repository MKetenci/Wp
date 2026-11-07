'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { openDb, slugify } = require('../src/db');
const { createApp } = require('../src/app');
const { seed } = require('../src/seed');
const { renderMarkdown } = require('../src/markdown');

async function startServer() {
  const repo = openDb(':memory:');
  seed(repo);
  const server = createApp(repo).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { repo, server, base };
}

const form = (obj) => ({
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(obj).toString(),
  redirect: 'manual',
});

test('slugify handles Turkish characters', () => {
  assert.equal(slugify('Yeni Başlayanlar Rehberi'), 'Yeni_Baslayanlar_Rehberi');
  assert.equal(slugify('Venüs'), 'Venus');
  assert.equal(slugify("Void Relic'leri"), 'Void_Relic_leri');
});

test('markdown: wiki links, red links and sanitizing', () => {
  const html = renderMarkdown('[[Excalibur]] ve [[Yok|olmayan]] <script>alert(1)</script>', {
    exists: (s) => s === 'Excalibur',
  });
  assert.match(html, /<a class="wikilink" href="\/wiki\/Excalibur">Excalibur<\/a>/);
  assert.match(html, /class="wikilink new" href="\/wiki\/Yok">olmayan</);
  assert.doesNotMatch(html, /<script/);
});

test('pages render with infobox and table of contents', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());
  const res = await fetch(`${base}/wiki/Excalibur`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /class="infobox"/);
  assert.match(html, /Exalted Blade/);
  assert.match(html, /İçindekiler/);
});

test('create, edit, history and revert', async (t) => {
  const { server, base, repo } = await startServer();
  t.after(() => server.close());

  let res = await fetch(`${base}/yeni`, form({
    title: 'Rhino', category: 'warframe', summary: 'Tank', body: 'İlk sürüm',
    info_warframe_abilities: 'Rhino Charge, Iron Skin, Roar, Rhino Stomp',
  }));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/wiki/Rhino');
  assert.equal(repo.getPage('Rhino').infobox.abilities, 'Rhino Charge, Iron Skin, Roar, Rhino Stomp');

  res = await fetch(`${base}/yeni`, form({ title: 'Rhino', category: 'warframe' }));
  assert.equal(res.status, 409, 'duplicate titles are rejected');

  res = await fetch(`${base}/wiki/Rhino/duzenle`, form({ title: 'Rhino', category: 'warframe', body: 'İkinci sürüm', comment: 'güncelleme' }));
  assert.equal(res.status, 303);
  assert.equal(repo.getPage('Rhino').body, 'İkinci sürüm');

  const revs = repo.history('Rhino');
  assert.equal(revs.length, 2);
  res = await fetch(`${base}/wiki/Rhino/geri-al/${revs[1].id}`, form({}));
  assert.equal(res.status, 303);
  assert.equal(repo.getPage('Rhino').body, 'İlk sürüm');
  assert.equal(repo.history('Rhino').length, 3);
});

test('search finds pages and jumps on exact title', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());
  let res = await fetch(`${base}/ara?q=elektrik`);
  assert.match(await res.text(), /Volt/);
  res = await fetch(`${base}/ara?q=mag`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/wiki/Mag');
});

test('missing pages return 404 with create link', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());
  const res = await fetch(`${base}/wiki/Nidus`);
  assert.equal(res.status, 404);
  assert.match(await res.text(), /Bu sayfayı oluştur/);
});
