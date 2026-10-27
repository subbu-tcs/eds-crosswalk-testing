#!/usr/bin/env node
/*
 * Builds the nav and footer pages from docs/nav-footer-authoring.md, in the editor-friendly
 * layout the guide describes, as page files the package builder takes:
 *
 *   node tools/aem-package/nav-footer-from-guide.mjs <out-dir>
 *   node tools/aem-package/build-package.mjs --root <out-dir> --name … \
 *     <out-dir>/nav.plain.html <out-dir>/footer.plain.html
 *
 * The guide is the source of truth: each "### Header/Footer section N" becomes a section, and
 * its components (Image, Title, Text) become default content in the order given. Images are
 * the files named in the guide, from content/images/ (the builder makes them DAM assets).
 *
 * Notation read from the guide:
 *   **Image**: `file`, alt text: "…" | (empty, decorative)
 *   **Title** (Heading N): text
 *   **Text** / **Text** (a list), then paragraphs or a "- " list (two-space indents nest);
 *   inside text: [label](url), **bold**, `Heading 3: text` lines, :icon: names kept as typed.
 */
/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] || '');
if (!process.argv[2]) {
  console.error('usage: node tools/aem-package/nav-footer-from-guide.mjs <out-dir>');
  process.exit(1);
}
const guide = fs.readFileSync(path.join(REPO, 'docs/nav-footer-authoring.md'), 'utf8').split('\n');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/**
 * Links to content pages use the Edge Delivery URL (lower case, no trailing slash), as the
 * importer's cleanup does; the guide copies the source's /offers-Promotions/… links as-is.
 */
const pageLink = (href) => href.replace(/^(?:https?:\/\/www\.thaiairways\.com)?(\/[a-z]{2}-[a-z]{2}\/content\/[^?#]*)/i, (m, p) => p.replace(/\/+$/, '').toLowerCase());
const inline = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => `<a href="${pageLink(href).replace(/"/g, '&quot;')}">${label}</a>`);

/** "- " list lines (two-space indents nest) -> nested <ul>. */
function list(lines) {
  let html = '';
  const stack = [];
  lines.forEach((line) => {
    const depth = Math.floor(line.match(/^ */)[0].length / 2);
    const item = inline(line.trim().replace(/^- /, ''));
    if (depth + 1 > stack.length) {
      html += '<ul>';
      stack.push(depth);
    } else {
      html += '</li>';
      while (depth + 1 < stack.length) {
        html += '</ul></li>';
        stack.pop();
      }
    }
    html += `<li>${item}`;
  });
  while (stack.length) {
    html += '</li></ul>';
    stack.pop();
  }
  return html;
}

/** Paragraph lines; "Heading 3: text" lines are headings. */
function paragraphs(lines) {
  return lines.map((l) => {
    const h = l.match(/^Heading (\d): (.+)$/);
    return h ? `<h${h[1]}>${inline(h[2])}</h${h[1]}>` : `<p>${inline(l)}</p>`;
  }).join('');
}

function build(prefix) {
  const sections = [];
  let current = null;
  let i = 0;
  const flushBlock = (kind, lines) => {
    const body = lines.filter((l) => l.trim());
    if (!body.length) return;
    // a block of text may mix paragraphs, "Heading 3:" lines and a list
    let buf = [];
    let mode = null;
    const emit = () => {
      if (!buf.length) return;
      current.push(mode === 'list' ? list(buf) : paragraphs(buf));
      buf = [];
    };
    body.forEach((l) => {
      const m = /^\s*- /.test(l) ? 'list' : 'para';
      if (m !== mode) emit();
      mode = m;
      buf.push(l);
    });
    emit();
    if (kind === 'list' && !body.some((l) => /^\s*- /.test(l))) console.warn(`  ${prefix}: "Text (a list)" without list items`);
  };
  while (i < guide.length) {
    const line = guide[i];
    const sec = line.match(new RegExp(`^### ${prefix} section \\d+: `));
    if (sec) {
      current = [];
      sections.push(current);
      i += 1;
      continue; // eslint-disable-line no-continue
    }
    if (current && /^##+ /.test(line)) current = null;
    if (!current) {
      i += 1;
      continue; // eslint-disable-line no-continue
    }
    const img = line.match(/^\*\*Image\*\*: `([^`]+)`, alt text: (.+)$/);
    const title = line.match(/^\*\*Title\*\* \(Heading (\d)\): (.+)$/);
    const text = line.match(/^\*\*Text\*\*( \(a list\))?$/);
    if (img) {
      const alt = /^\(empty/.test(img[2]) ? '' : img[2].replace(/^"|"$/g, '');
      if (!fs.existsSync(path.join(REPO, 'content/images', img[1]))) console.warn(`  missing image ${img[1]}`);
      current.push(`<p><img src="images/${img[1]}" alt="${esc(alt)}"></p>`);
      i += 1;
    } else if (title) {
      current.push(`<h${title[1]}>${inline(title[2])}</h${title[1]}>`);
      i += 1;
    } else if (text) {
      const lines = [];
      i += 1;
      while (i < guide.length && !/^\*\*(Image|Title|Text)\*\*/.test(guide[i]) && !/^#/.test(guide[i])) {
        lines.push(guide[i]);
        i += 1;
      }
      flushBlock(text[1] ? 'list' : 'text', lines);
    } else i += 1;
  }
  return sections.map((s) => `<div>${s.join('')}</div>`).join('\n');
}

fs.mkdirSync(out, { recursive: true });
[['nav', 'Header'], ['footer', 'Footer']].forEach(([name, prefix]) => {
  const html = build(prefix);
  fs.writeFileSync(path.join(out, `${name}.plain.html`), `${html}\n`);
  console.log(`${path.join(out, `${name}.plain.html`)}: ${(html.match(/<div>/g) || []).length} sections`);
});
