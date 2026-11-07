'use strict';
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS pages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  current_rev INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS revisions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id    INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  category   TEXT NOT NULL,
  summary    TEXT NOT NULL DEFAULT '',
  infobox    TEXT NOT NULL DEFAULT '{}',
  body       TEXT NOT NULL DEFAULT '',
  author     TEXT NOT NULL DEFAULT 'Anonim',
  comment    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_revisions_page ON revisions(page_id, id DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
  slug UNINDEXED, title, summary, body, tokenize = 'unicode61 remove_diacritics 2'
);
`;

function slugify(text) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u' };
  return String(text)
    .trim()
    .replace(/[çğıİöşü]/gi, (c) => map[c] || map[c.toLowerCase()] || c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function openDb(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return createRepo(db);
}

function createRepo(db) {
  const q = {
    pageBySlug: db.prepare(`
      SELECT p.id, p.slug, p.created_at, r.id AS rev_id, r.title, r.category, r.summary,
             r.infobox, r.body, r.author, r.comment, r.created_at AS updated_at
      FROM pages p JOIN revisions r ON r.id = p.current_rev
      WHERE p.slug = ? COLLATE NOCASE`),
    pageIdBySlug: db.prepare('SELECT id FROM pages WHERE slug = ? COLLATE NOCASE'),
    insertPage: db.prepare('INSERT INTO pages (slug, title, category) VALUES (?, ?, ?)'),
    insertRev: db.prepare(`
      INSERT INTO revisions (page_id, title, category, summary, infobox, body, author, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
    setCurrent: db.prepare('UPDATE pages SET current_rev = ?, title = ?, category = ? WHERE id = ?'),
    ftsDelete: db.prepare('DELETE FROM pages_fts WHERE slug = ?'),
    ftsInsert: db.prepare('INSERT INTO pages_fts (slug, title, summary, body) VALUES (?, ?, ?, ?)'),
    byCategory: db.prepare(`
      SELECT p.slug, r.title, r.summary FROM pages p JOIN revisions r ON r.id = p.current_rev
      WHERE r.category = ? ORDER BY r.title COLLATE NOCASE`),
    categoryCounts: db.prepare(`
      SELECT r.category, COUNT(*) AS n FROM pages p JOIN revisions r ON r.id = p.current_rev
      GROUP BY r.category`),
    recent: db.prepare(`
      SELECT p.slug, r.id AS rev_id, r.title, r.author, r.comment, r.created_at
      FROM revisions r JOIN pages p ON p.id = r.page_id
      ORDER BY r.id DESC LIMIT ?`),
    history: db.prepare(`
      SELECT id, title, author, comment, created_at, length(body) AS size
      FROM revisions WHERE page_id = ? ORDER BY id DESC`),
    revision: db.prepare(`
      SELECT r.*, p.slug FROM revisions r JOIN pages p ON p.id = r.page_id
      WHERE r.id = ? AND p.slug = ? COLLATE NOCASE`),
    search: db.prepare(`
      SELECT slug, title, snippet(pages_fts, 3, '[[[', ']]]', '…', 16) AS snip,
             bm25(pages_fts, 10.0, 3.0, 1.0) AS score
      FROM pages_fts WHERE pages_fts MATCH ? ORDER BY score LIMIT 50`),
    allTitles: db.prepare('SELECT slug, title FROM pages ORDER BY title COLLATE NOCASE'),
    count: db.prepare('SELECT COUNT(*) AS n FROM pages'),
    deletePage: db.prepare('DELETE FROM pages WHERE id = ?'),
  };

  function tx(fn) {
    db.exec('BEGIN');
    try {
      const out = fn();
      db.exec('COMMIT');
      return out;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  return {
    db,
    slugify,

    getPage(slug) {
      const row = q.pageBySlug.get(slug);
      if (!row) return null;
      return { ...row, infobox: JSON.parse(row.infobox || '{}') };
    },

    exists(slug) {
      return !!q.pageIdBySlug.get(slugify(slug));
    },

    /** Creates the page if needed and appends a new revision. Returns the slug. */
    savePage({ slug, title, category, summary = '', infobox = {}, body = '', author, comment = '' }) {
      title = String(title || '').trim();
      if (!title) throw new Error('Başlık zorunludur.');
      category = String(category || '').trim();
      if (!category) throw new Error('Kategori zorunludur.');
      slug = slugify(slug || title);
      if (!slug) throw new Error('Geçersiz başlık.');
      author = String(author || '').trim() || 'Anonim';
      const infoJson = JSON.stringify(infobox || {});

      return tx(() => {
        let page = q.pageIdBySlug.get(slug);
        if (!page) {
          const res = q.insertPage.run(slug, title, category);
          page = { id: Number(res.lastInsertRowid) };
        }
        const rev = q.insertRev.run(page.id, title, category, summary, infoJson, body, author, comment);
        q.setCurrent.run(Number(rev.lastInsertRowid), title, category, page.id);
        q.ftsDelete.run(slug);
        q.ftsInsert.run(slug, title, summary, body);
        return slug;
      });
    },

    deletePage(slug) {
      const page = q.pageIdBySlug.get(slug);
      if (!page) return false;
      tx(() => {
        q.ftsDelete.run(slug);
        q.deletePage.run(page.id);
      });
      return true;
    },

    listCategory(category) {
      return q.byCategory.all(category);
    },

    categoryCounts() {
      return Object.fromEntries(q.categoryCounts.all().map((r) => [r.category, r.n]));
    },

    recentChanges(limit = 20) {
      return q.recent.all(limit);
    },

    history(slug) {
      const page = q.pageIdBySlug.get(slug);
      return page ? q.history.all(page.id) : null;
    },

    getRevision(slug, revId) {
      const row = q.revision.get(Number(revId), slug);
      if (!row) return null;
      return { ...row, infobox: JSON.parse(row.infobox || '{}') };
    },

    search(term) {
      const tokens = String(term || '')
        .split(/\s+/)
        .map((t) => t.replace(/["*^():]/g, ''))
        .filter(Boolean);
      if (!tokens.length) return [];
      // Each token as a quoted prefix query: "exca"* "blade"*
      const match = tokens.map((t) => `"${t}"*`).join(' ');
      return q.search.all(match);
    },

    allTitles() {
      return q.allTitles.all();
    },

    count() {
      return q.count.get().n;
    },
  };
}

module.exports = { openDb, slugify };
