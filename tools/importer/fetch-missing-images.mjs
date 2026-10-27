#!/usr/bin/env node
/*
 * Downloads source images that imported pages still reference on the source host (the
 * snapshot capture missed them: lazy, feed-driven or interaction-only images) and adds them to
 * the image map (sidecar) of every page that uses them, so a re-import uses local copies.
 *
 *   node tools/importer/fetch-missing-images.mjs [page.plain.html...]
 *
 * Without arguments it checks every content/**\/*.plain.html. Downloads go through the Bright
 * Data browser (the source blocks plain requests), one session per image. Images that are
 * missing on the source too (404) are reported and left as they are.
 */
/* eslint-disable no-console, no-restricted-syntax, no-await-in-loop, import/no-unresolved,
   import/no-absolute-path -- an import-environment tool, like the importer: images download one
   after another through the Bright Data helper installed with the import tooling */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { connectBrowser } from '/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-scrape-webpage/scripts/browser-source.js';

const SOURCE = 'https://www.thaiairways.com';
const SNAP = 'tools/importer/bd-snapshots/www.thaiairways.com';
const IMAGE = /\.(png|jpe?g|gif|webp|svg)$/i;
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

const pages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : execFileSync('find', ['content', '-name', '*.plain.html']).toString().split('\n').filter(Boolean);
const byUrl = new Map();
pages.forEach((p) => {
  const html = fs.readFileSync(p, 'utf8');
  [...html.matchAll(/https:\/\/www\.thaiairways\.com\/[^"'?\s)]+/g)].forEach(([url]) => {
    if (!IMAGE.test(url)) return;
    if (!byUrl.has(url)) byUrl.set(url, new Set());
    byUrl.get(url).add(p);
  });
});

async function download(url) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    let browser;
    try {
      browser = await connectBrowser('bd');
      const page = await (browser.contexts()[0] || await browser.newContext()).newPage();
      const res = await page.goto(url, { waitUntil: 'load', timeout: 90000 });
      const type = res.headers()['content-type'] || '';
      if (res.status() === 200 && /^image\//.test(type)) return { body: await res.body() };
      if (res.status() === 404) return { status: 404 };
      console.log(`.. ${url} attempt ${attempt}: ${res.status()} ${type}`);
    } catch (e) {
      console.log(`.. ${url} attempt ${attempt}: ${e.message.split('\n')[0]}`);
    } finally {
      await browser?.close().catch(() => {});
    }
    await sleep(6000 * attempt);
  }
  return {};
}

/** Adds the local copy to the image map of every page that uses the image. */
function addToMaps(url, local, users) {
  users.forEach((p) => {
    const rel = p.replace(/^content/, '').replace(/\.plain\.html$/, '');
    // snapshot folders keep the source's mixed case
    const sidecar = execFileSync('find', [SNAP, '-ipath', `${SNAP}${rel}.images.json`]).toString().split('\n')[0];
    if (!sidecar) {
      console.log(`   no image map for ${rel}`);
      return;
    }
    const map = JSON.parse(fs.readFileSync(sidecar, 'utf8'));
    map[url] = local;
    fs.writeFileSync(sidecar, JSON.stringify(map, null, 2));
  });
}

for (const [url, users] of byUrl) {
  const local = `/media-da/${crypto.createHash('md5').update(url).digest('hex')}${path.extname(new URL(url).pathname).toLowerCase()}`;
  let ok = fs.existsSync(`content${local}`);
  if (!ok) {
    const { body, status } = await download(url);
    if (body) {
      fs.writeFileSync(`content${local}`, body);
      ok = true;
    } else console.log(`${status === 404 ? 'MISSING ON SOURCE' : 'FAIL'} ${url}`);
  }
  if (ok) {
    addToMaps(url, local, users);
    console.log(`OK ${url.replace(SOURCE, '')} -> ${local} (${users.size} page(s))`);
  }
}
