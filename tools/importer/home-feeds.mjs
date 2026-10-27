#!/usr/bin/env node
/*
 * Embeds the home page's content feeds in its import snapshot.
 *
 *   node tools/importer/home-feeds.mjs <snapshot.html> <feeds-dir>
 *
 * The current home page is a React app that renders from JSON exports of AEM components. The
 * home import reads those feeds, not the rendered carousel or menus: each one is added to the
 * snapshot as a hidden <div data-excat-feed="NAME"> holding the JSON as text, which the home
 * parsers read. (Not a <script>: the import pipeline removes scripts before it transforms.)
 *
 * Feeds (file names as saved from the source, matched by the component name in them):
 *   bannercarousel  …/homepage/json/bannercarousel/…/bannercarousel.model.json  (hero slides)
 *   moreservices    …/homepage/json/moreservices/…/moreservices.model.json      (services strip)
 *   offers          …/homepage/offers-Promotions/…/offers.model.json            (offers, dates)
 */
/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';

const FEEDS = {
  bannercarousel: /bannercarousel\.model\.json$/,
  moreservices: /moreservices\.model\.json$/,
  offers: /offers\.model\.json$/,
};

const [snapshot, dir] = process.argv.slice(2);
if (!snapshot || !dir) {
  console.error('usage: node tools/importer/home-feeds.mjs <snapshot.html> <feeds-dir>');
  process.exit(1);
}
// earlier runs' feeds are replaced
let html = fs.readFileSync(snapshot, 'utf8')
  .replace(/<script type="application\/json" data-excat-feed="[^"]+">[\s\S]*?<\/script>\n?/g, '')
  .replace(/<div hidden data-excat-feed="[^"]+">[\s\S]*?<\/div>\n?/g, '');
const escapeHtml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const files = fs.readdirSync(dir);
const added = [];
Object.entries(FEEDS).forEach(([name, re]) => {
  const file = files.find((f) => re.test(f));
  if (!file) return;
  const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const text = escapeHtml(JSON.stringify(data));
  html = html.replace(/<\/body>/i, `<div hidden data-excat-feed="${name}">${text}</div>\n</body>`);
  added.push(name);
});
fs.writeFileSync(snapshot, html);
console.log(`${snapshot}: embedded ${added.join(', ') || 'no feeds'}`);
