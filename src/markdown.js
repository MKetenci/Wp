'use strict';
const { Marked } = require('marked');
const sanitizeHtml = require('sanitize-html');
const { slugify } = require('./db');

const marked = new Marked({ gfm: true, breaks: false });

/**
 * Renders wiki markdown to safe HTML.
 * Supports [[Sayfa]] and [[Sayfa|görünen metin]] internal links;
 * links to missing pages get the "new" class (red links, like MediaWiki).
 */
function renderMarkdown(src, { exists = () => true } = {}) {
  const withLinks = String(src || '').replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    const slug = slugify(target);
    const text = (label || target).trim().replace(/[[\]]/g, '');
    const cls = exists(slug) ? 'wikilink' : 'wikilink new';
    return `<a class="${cls}" href="/wiki/${encodeURIComponent(slug)}">${escapeHtml(text)}</a>`;
  });

  const html = marked.parse(withLinks);
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'del', 'details', 'summary']),
    allowedAttributes: {
      a: ['href', 'title', 'class'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      th: ['align'],
      td: ['align'],
      code: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

/** Adds ids to h2/h3 and builds a table of contents. */
function withToc(html) {
  const toc = [];
  const used = new Set();
  const out = html.replace(/<(h[23])>(.*?)<\/\1>/g, (_, tag, inner) => {
    const text = inner.replace(/<[^>]+>/g, '');
    let id = slugify(text) || 'bolum';
    while (used.has(id)) id += '_';
    used.add(id);
    toc.push({ level: tag === 'h2' ? 2 : 3, id, text });
    return `<${tag} id="${id}">${inner}</${tag}>`;
  });
  return { html: out, toc };
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { renderMarkdown, withToc, escapeHtml };
