'use strict';
const { CATEGORIES, BY_KEY } = require('./categories');
const { escapeHtml: e } = require('./markdown');

function layout({ title, body, q = '' }) {
  const nav = CATEGORIES.map(
    (c) => `<li><a href="/kategori/${c.key}"><span class="ico">${c.icon}</span>${e(c.name)}</a></li>`
  ).join('');
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)} · Tenno Arşivi</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="topbar">
  <a class="brand" href="/"><span class="lotus">❖</span> Tenno Arşivi</a>
  <form class="search" action="/ara" method="get" role="search">
    <input type="search" name="q" value="${e(q)}" placeholder="Wiki'de ara… (ör. Excalibur)" aria-label="Ara">
  </form>
  <a class="btn" href="/yeni">+ Yeni Sayfa</a>
</header>
<div class="shell">
  <nav class="sidebar">
    <h4>Kategoriler</h4>
    <ul>${nav}</ul>
    <h4>Araçlar</h4>
    <ul>
      <li><a href="/son-degisiklikler">Son değişiklikler</a></li>
      <li><a href="/tum-sayfalar">Tüm sayfalar</a></li>
      <li><a href="/rastgele">Rastgele sayfa</a></li>
    </ul>
  </nav>
  <main class="content">${body}</main>
</div>
<footer class="footer">Tenno Arşivi — topluluk tarafından yazılan hayran wikisi. Warframe, Digital Extremes'in ticari markasıdır; bu site resmi değildir.</footer>
</body>
</html>`;
}

function categoryName(key) {
  return BY_KEY[key] ? BY_KEY[key].singular : key;
}

function home({ counts, recent, total }) {
  const cards = CATEGORIES.map(
    (c) => `<a class="card" href="/kategori/${c.key}">
      <span class="card-ico">${c.icon}</span>
      <span class="card-name">${e(c.name)}</span>
      <span class="card-count">${counts[c.key] || 0} sayfa</span>
    </a>`
  ).join('');
  return layout({
    title: 'Ana Sayfa',
    body: `
<section class="hero">
  <h1>Tenno Arşivi'ne hoş geldin</h1>
  <p>Warframe'ler, silahlar, modlar ve Origin Sistemi hakkında herkesin düzenleyebildiği bir wiki.
  Şu anda <strong>${total}</strong> sayfa var.</p>
</section>
<section class="cards">${cards}</section>
<section>
  <h2>Son değişiklikler</h2>
  ${recentList(recent)}
  <p><a href="/son-degisiklikler">Tümünü gör →</a></p>
</section>`,
  });
}

function recentList(rows) {
  if (!rows.length) return '<p class="muted">Henüz değişiklik yok.</p>';
  return `<ul class="changes">${rows
    .map(
      (r) => `<li><time>${e(r.created_at)}</time>
      <a href="/wiki/${e(r.slug)}">${e(r.title)}</a>
      <span class="muted">— ${e(r.author)}${r.comment ? `: <em>${e(r.comment)}</em>` : ''}</span>
      <a class="small" href="/wiki/${e(r.slug)}/gecmis/${r.rev_id}">(sürüm)</a></li>`
    )
    .join('')}</ul>`;
}

function recentPage(rows) {
  return layout({ title: 'Son değişiklikler', body: `<h1>Son değişiklikler</h1>${recentList(rows)}` });
}

function infobox(page) {
  const cat = BY_KEY[page.category];
  const fields = cat ? cat.fields : Object.keys(page.infobox).map((k) => [k, k]);
  const rows = fields
    .filter(([k]) => page.infobox[k])
    .map(([k, label]) => `<tr><th>${e(label)}</th><td>${e(page.infobox[k])}</td></tr>`)
    .join('');
  const img = page.infobox.image
    ? `<img src="${e(page.infobox.image)}" alt="${e(page.title)}">`
    : `<div class="placeholder">${cat ? cat.icon : '❖'}</div>`;
  return `<aside class="infobox">
    <div class="infobox-title">${e(page.title)}</div>
    ${img}
    <div class="infobox-cat">${e(categoryName(page.category))}</div>
    ${rows ? `<table>${rows}</table>` : ''}
  </aside>`;
}

function article({ page, html, toc, oldRevision = false }) {
  const tocHtml =
    toc.length > 2
      ? `<nav class="toc"><strong>İçindekiler</strong><ol>${toc
          .map((t) => `<li class="lvl${t.level}"><a href="#${t.id}">${e(t.text)}</a></li>`)
          .join('')}</ol></nav>`
      : '';
  const banner = oldRevision
    ? `<div class="notice">Bu sayfanın <strong>${e(page.created_at)}</strong> tarihli eski bir sürümünü görüntülüyorsun.
       <a href="/wiki/${e(page.slug)}">Güncel sürüme git</a></div>`
    : '';
  return layout({
    title: page.title,
    body: `
${banner}
<div class="page-head">
  <div>
    <div class="crumbs"><a href="/kategori/${e(page.category)}">${e(BY_KEY[page.category]?.name || page.category)}</a></div>
    <h1>${e(page.title)}</h1>
    ${page.summary ? `<p class="lead">${e(page.summary)}</p>` : ''}
  </div>
  <div class="tabs">
    <a href="/wiki/${e(page.slug)}">Oku</a>
    <a href="/wiki/${e(page.slug)}/duzenle">Düzenle</a>
    <a href="/wiki/${e(page.slug)}/gecmis">Geçmiş</a>
  </div>
</div>
<article class="article">
  ${infobox(page)}
  ${tocHtml}
  ${html}
</article>
<p class="meta muted">Son düzenleme: ${e(page.updated_at || page.created_at)} — ${e(page.author)}</p>`,
  });
}

function editForm({ page, isNew, error, slug }) {
  const cat = page.category || CATEGORIES[0].key;
  const catOptions = CATEGORIES.map(
    (c) => `<option value="${c.key}"${c.key === cat ? ' selected' : ''}>${e(c.singular)}</option>`
  ).join('');
  // Render every category's fields; CSS/JS shows only the selected group.
  const fieldGroups = CATEGORIES.map(
    (c) => `<fieldset class="fields" data-cat="${c.key}"${c.key === cat ? '' : ' hidden'}>
      <legend>${e(c.singular)} bilgi kutusu</legend>
      ${c.fields
        .map(
          ([k, label]) => `<label>${e(label)}
            <input name="info_${c.key}_${k}" value="${c.key === cat ? e(page.infobox?.[k] || '') : ''}"></label>`
        )
        .join('')}
    </fieldset>`
  ).join('');
  const action = isNew ? '/yeni' : `/wiki/${e(slug)}/duzenle`;
  return layout({
    title: isNew ? 'Yeni sayfa' : `${page.title} düzenleniyor`,
    body: `
<h1>${isNew ? 'Yeni sayfa oluştur' : `Düzenle: ${e(page.title)}`}</h1>
${error ? `<div class="error">${e(error)}</div>` : ''}
<form class="edit" method="post" action="${action}">
  <div class="row">
    <label>Başlık <input name="title" required value="${e(page.title || '')}"></label>
    <label>Kategori <select name="category" id="category">${catOptions}</select></label>
  </div>
  <label>Kısa özet <input name="summary" maxlength="300" value="${e(page.summary || '')}"></label>
  <label>Görsel URL'si (isteğe bağlı) <input name="image" type="url" value="${e(page.infobox?.image || '')}"></label>
  ${fieldGroups}
  <label>İçerik (Markdown — iç bağlantı için <code>[[Sayfa Adı]]</code> veya <code>[[Sayfa|metin]]</code>)
    <textarea name="body" rows="20">${e(page.body || '')}</textarea></label>
  <div class="row">
    <label>Adın <input name="author" maxlength="60" placeholder="Anonim"></label>
    <label>Değişiklik açıklaması <input name="comment" maxlength="200"></label>
  </div>
  <div class="actions">
    <button type="submit" class="btn">Kaydet</button>
    <a href="${isNew ? '/' : `/wiki/${e(slug)}`}">İptal</a>
  </div>
</form>
<script>
  document.getElementById('category').addEventListener('change', function () {
    document.querySelectorAll('fieldset.fields').forEach(function (fs) {
      fs.hidden = fs.dataset.cat !== this.value;
    }, this);
  });
</script>`,
  });
}

function historyPage({ page, revs }) {
  const rows = revs
    .map(
      (r, i) => `<tr>
      <td><a href="/wiki/${e(page.slug)}/gecmis/${r.id}">${e(r.created_at)}</a>${i === 0 ? ' <span class="tag">güncel</span>' : ''}</td>
      <td>${e(r.author)}</td><td>${e(r.comment)}</td><td>${r.size} bayt</td>
      <td>${i === 0 ? '' : `<form method="post" action="/wiki/${e(page.slug)}/geri-al/${r.id}"><button class="link">Bu sürüme dön</button></form>`}</td>
    </tr>`
    )
    .join('');
  return layout({
    title: `${page.title} geçmişi`,
    body: `<h1>Geçmiş: <a href="/wiki/${e(page.slug)}">${e(page.title)}</a></h1>
<table class="grid"><thead><tr><th>Tarih</th><th>Yazar</th><th>Açıklama</th><th>Boyut</th><th></th></tr></thead>
<tbody>${rows}</tbody></table>`,
  });
}

function categoryPage({ cat, pages }) {
  const list = pages.length
    ? `<ul class="plist">${pages
        .map((p) => `<li><a href="/wiki/${e(p.slug)}">${e(p.title)}</a>${p.summary ? ` <span class="muted">— ${e(p.summary)}</span>` : ''}</li>`)
        .join('')}</ul>`
    : '<p class="muted">Bu kategoride henüz sayfa yok.</p>';
  return layout({
    title: cat.name,
    body: `<h1>${cat.icon} ${e(cat.name)}</h1>${list}
<p><a class="btn" href="/yeni?kategori=${cat.key}">+ Yeni ${e(cat.singular)} sayfası</a></p>`,
  });
}

function allPages({ pages }) {
  return layout({
    title: 'Tüm sayfalar',
    body: `<h1>Tüm sayfalar</h1><ul class="columns">${pages
      .map((p) => `<li><a href="/wiki/${e(p.slug)}">${e(p.title)}</a></li>`)
      .join('')}</ul>`,
  });
}

function searchPage({ q, results }) {
  const list = results.length
    ? `<ul class="results">${results
        .map(
          (r) => `<li><a href="/wiki/${e(r.slug)}">${e(r.title)}</a>
          <div class="snip">${e(r.snip).replace(/\[\[\[/g, '<mark>').replace(/\]\]\]/g, '</mark>')}</div></li>`
        )
        .join('')}</ul>`
    : `<p>“${e(q)}” için sonuç bulunamadı. <a href="/yeni?baslik=${encodeURIComponent(q)}">Bu sayfayı oluştur</a></p>`;
  return layout({ title: `Arama: ${q}`, q, body: `<h1>Arama sonuçları</h1>${q ? list : '<p>Bir arama terimi gir.</p>'}` });
}

function notFound({ slug }) {
  return layout({
    title: 'Sayfa bulunamadı',
    body: `<h1>Sayfa bulunamadı</h1>
<p><strong>${e(slug.replace(/_/g, ' '))}</strong> adında bir sayfa henüz yok.</p>
<p><a class="btn" href="/yeni?baslik=${encodeURIComponent(slug.replace(/_/g, ' '))}">Bu sayfayı oluştur</a></p>`,
  });
}

module.exports = {
  layout, home, recentPage, article, editForm, historyPage, categoryPage, allPages, searchPage, notFound,
};
