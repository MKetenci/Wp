'use strict';
const path = require('node:path');
const express = require('express');
const { BY_KEY } = require('./categories');
const { renderMarkdown, withToc } = require('./markdown');
const views = require('./views');

function createApp(repo) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.urlencoded({ extended: false, limit: '512kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  const exists = (slug) => repo.exists(slug);

  function renderPage(page, opts = {}) {
    const { html, toc } = withToc(renderMarkdown(page.body, { exists }));
    return views.article({ page, html, toc, ...opts });
  }

  function formToPage(body) {
    const category = String(body.category || '');
    const infobox = {};
    for (const [k] of BY_KEY[category]?.fields || []) {
      const v = String(body[`info_${category}_${k}`] || '').trim();
      if (v) infobox[k] = v;
    }
    const image = String(body.image || '').trim();
    if (/^https?:\/\//i.test(image)) infobox.image = image;
    return {
      title: String(body.title || '').trim(),
      category,
      summary: String(body.summary || '').trim(),
      infobox,
      body: String(body.body || '').replace(/\r\n/g, '\n'),
      author: String(body.author || '').trim().slice(0, 60),
      comment: String(body.comment || '').trim().slice(0, 200),
    };
  }

  app.get('/', (req, res) => {
    res.send(views.home({ counts: repo.categoryCounts(), recent: repo.recentChanges(10), total: repo.count() }));
  });

  app.get('/kategori/:key', (req, res) => {
    const cat = BY_KEY[req.params.key];
    if (!cat) return res.status(404).send(views.notFound({ slug: req.params.key }));
    res.send(views.categoryPage({ cat, pages: repo.listCategory(cat.key) }));
  });

  app.get('/tum-sayfalar', (req, res) => res.send(views.allPages({ pages: repo.allTitles() })));
  app.get('/son-degisiklikler', (req, res) => res.send(views.recentPage(repo.recentChanges(100))));

  app.get('/rastgele', (req, res) => {
    const pages = repo.allTitles();
    if (!pages.length) return res.redirect('/');
    res.redirect(`/wiki/${pages[Math.floor(Math.random() * pages.length)].slug}`);
  });

  app.get('/ara', (req, res) => {
    const q = String(req.query.q || '').trim();
    const results = q ? repo.search(q) : [];
    // "Go" behaviour: exact title match jumps straight to the article.
    const exact = results.find((r) => r.title.toLocaleLowerCase('tr') === q.toLocaleLowerCase('tr'));
    if (exact) return res.redirect(`/wiki/${exact.slug}`);
    res.send(views.searchPage({ q, results }));
  });

  app.get('/yeni', (req, res) => {
    const page = { title: String(req.query.baslik || ''), category: String(req.query.kategori || ''), infobox: {} };
    res.send(views.editForm({ page, isNew: true }));
  });

  app.post('/yeni', (req, res) => {
    const page = formToPage(req.body);
    if (page.title && repo.exists(page.title)) {
      return res.status(409).send(views.editForm({ page, isNew: true, error: 'Bu başlıkla bir sayfa zaten var.' }));
    }
    try {
      const slug = repo.savePage(page);
      res.redirect(303, `/wiki/${slug}`);
    } catch (err) {
      res.status(400).send(views.editForm({ page, isNew: true, error: err.message }));
    }
  });

  app.get('/wiki/:slug', (req, res) => {
    const page = repo.getPage(req.params.slug);
    if (!page) return res.status(404).send(views.notFound({ slug: req.params.slug }));
    if (page.slug !== req.params.slug) return res.redirect(301, `/wiki/${page.slug}`);
    res.send(renderPage(page));
  });

  app.get('/wiki/:slug/duzenle', (req, res) => {
    const page = repo.getPage(req.params.slug);
    if (!page) return res.redirect(`/yeni?baslik=${encodeURIComponent(req.params.slug.replace(/_/g, ' '))}`);
    res.send(views.editForm({ page, slug: page.slug }));
  });

  app.post('/wiki/:slug/duzenle', (req, res) => {
    const existing = repo.getPage(req.params.slug);
    if (!existing) return res.status(404).send(views.notFound({ slug: req.params.slug }));
    const page = formToPage(req.body);
    try {
      // The slug is stable; a title change only changes the display title.
      repo.savePage({ ...page, slug: existing.slug });
      res.redirect(303, `/wiki/${existing.slug}`);
    } catch (err) {
      res.status(400).send(views.editForm({ page, slug: existing.slug, error: err.message }));
    }
  });

  app.get('/wiki/:slug/gecmis', (req, res) => {
    const page = repo.getPage(req.params.slug);
    if (!page) return res.status(404).send(views.notFound({ slug: req.params.slug }));
    res.send(views.historyPage({ page, revs: repo.history(page.slug) }));
  });

  app.get('/wiki/:slug/gecmis/:rev', (req, res) => {
    const rev = repo.getRevision(req.params.slug, req.params.rev);
    if (!rev) return res.status(404).send(views.notFound({ slug: req.params.slug }));
    res.send(renderPage({ ...rev, updated_at: rev.created_at }, { oldRevision: true }));
  });

  app.post('/wiki/:slug/geri-al/:rev', (req, res) => {
    const rev = repo.getRevision(req.params.slug, req.params.rev);
    if (!rev) return res.status(404).send(views.notFound({ slug: req.params.slug }));
    repo.savePage({ ...rev, slug: rev.slug, author: 'Anonim', comment: `#${rev.id} numaralı sürüme geri alındı` });
    res.redirect(303, `/wiki/${rev.slug}`);
  });

  // Tiny JSON API, handy for a future frontend or bots.
  app.get('/api/sayfalar', (req, res) => res.json(repo.allTitles()));
  app.get('/api/sayfa/:slug', (req, res) => {
    const page = repo.getPage(req.params.slug);
    if (!page) return res.status(404).json({ error: 'Bulunamadı' });
    res.json(page);
  });

  app.use((req, res) => res.status(404).send(views.notFound({ slug: decodeURIComponent(req.path.slice(1)) })));

  return app;
}

module.exports = { createApp };
