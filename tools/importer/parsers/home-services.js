/* eslint-disable */
/* global WebImporter */

/**
 * Parser for home-services (project block "accordion", option inline).
 * Source: the home page services strip (Hotels, Transportation, Insurance, Airport Services),
 * read from its content feed (moreservices.model.json, embedded by tools/importer/home-feeds.mjs):
 *   moreServices[].groupItems[]: categoryTitle, icon, categoryItems[]: serviceName, serviceRedURL
 * Model (blocks/accordion/_accordion.json):
 *   block: classes (inline), searchLabel, noResultsMessage -> two empty settings rows;
 *   item (accordion-item): summary (category) | body (list of partner links).
 * The category icons are decoration and are not imported.
 */
const value = (v) => (v && v !== 'None' ? String(v).trim() : '');

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

export default function parse(element, { document }) {
  const feed = element.querySelector('[data-excat-feed="moreservices"]');
  let groups = [];
  try {
    groups = JSON.parse(feed ? feed.textContent : '{}').moreServices || [];
  } catch (e) {
    groups = [];
  }
  const categories = groups.flatMap((g) => g.groupItems || []);
  if (!categories.length) return;

  const cells = [[''], ['']];
  categories.forEach((c) => {
    const ul = document.createElement('ul');
    (c.categoryItems || []).forEach((item) => {
      const name = value(item.serviceName);
      const href = value(item.serviceRedURL);
      if (!name) return;
      const li = document.createElement('li');
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = name;
        li.append(a);
      } else li.textContent = name;
      ul.append(li);
    });
    cells.push([
      hinted(document, 'summary', [document.createTextNode(value(c.categoryTitle))]),
      ul.children.length ? hinted(document, 'body', [ul]) : '',
    ]);
  });
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name: 'accordion', variants: ['inline'], cells }));
}
