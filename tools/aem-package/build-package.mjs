#!/usr/bin/env node
/*
 * Builds an AEM content package (Package Manager zip) from imported pages.
 *
 *   node tools/aem-package/build-package.mjs [--name NAME] [--version X.Y.Z] [--out DIR]
 *     [page.plain.html...]
 *
 * Without page arguments it packages every page listed in tools/importer/page-templates.json.
 * Each content/<path>.plain.html becomes /content/eds-crosswalk-testing/<path> (html2md, then
 * md2jcr with the project's component models, as the Universal Editor conversion does), with
 * values stored the way Universal Editor writes them. Its images (/media-da/…) become dam:Asset
 * nodes under /content/dam/eds-crosswalk-testing/<market>/imported/.
 *
 * Installing replaces only the packaged pages' own content (not their child pages) and the
 * imported-assets folder. Missing parent pages are created as empty pages; existing ones are
 * left alone.
 */
/* eslint-disable no-restricted-syntax, no-await-in-loop, no-console -- a Node command-line tool:
   pages convert one after another (a large batch doesn't run hundreds of conversions at once),
   and it reports on the console */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MODULES = process.env.EXCAT_IMPORT_MODULES
  || '/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-content-import/scripts/node_modules';
const { html2md } = await import(`${MODULES}/@adobe/helix-html2md/src/index.js`);
const { md2jcr } = await import(`${MODULES}/@adobe/helix-md2jcr/src/index.js`);

const SITE = '/content/eds-crosswalk-testing';
const DAM = '/content/dam/eds-crosswalk-testing';
const SILENT = {
  info() {}, debug() {}, trace() {}, warn() {}, error() {},
};
// multiselect "classes" fields (stored as String[]); columns are matched by resource type
const MULTI = new Set(['accordion', 'booking-widget', 'cards', 'carousel', 'hero', 'listing', 'table', 'tabs']);
const BLOCK_TAGS = 'h[1-6]|ul|ol|table|blockquote|pre';
const JCR_TYPES = 'String|Binary|Long|Double|Decimal|Date|Boolean|Name|Path|Reference|WeakReference|URI';
const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const [value] = args.splice(i, 2).slice(1);
  return value;
};
const NAME = opt('name', 'eds-crosswalk-testing-imported-pages');
const VERSION = opt('version', '1.0.0');
const OUT = path.resolve(opt('out', path.join(REPO, 'tools/aem-package/dist')));

const json = (f) => JSON.parse(fs.readFileSync(path.join(REPO, f), 'utf8'));
const models = { models: json('component-models.json'), definition: json('component-definition.json'), filters: json('component-filters.json') };

function pageFiles() {
  if (args.length) return args.map((f) => path.resolve(f));
  return json('tools/importer/page-templates.json').templates
    .flatMap((t) => t.urls)
    .map((u) => path.join(REPO, 'content', `${new URL(u).pathname.replace(/\/$/, '').toLowerCase()}.plain.html`));
}

/** Stores values the way Universal Editor writes them; fixes md2jcr's rich-text wrapping. */
function fix(xml, damFolder) {
  let out = xml;
  // rich text: md2jcr wraps headings and lists in <p>; lists come out loose
  out = out.replace(new RegExp(`&lt;p&gt;(&lt;(?:${BLOCK_TAGS})(?: [^&]*?)?&gt;)`, 'g'), '$1');
  out = out.replace(new RegExp(`(&lt;/(?:${BLOCK_TAGS})&gt;)&lt;/p&gt;`, 'g'), '$1');
  out = out.replace(/&lt;li&gt; &lt;p&gt;(.*?)&lt;\/p&gt; &lt;\/li&gt;/g, '&lt;li&gt;$1&lt;/li&gt;');
  // multiselect options as String[]; html2md writes block options with spaces ("promo code"),
  // the model values are class names ("promo-code")
  const option = (s) => s.trim().toLowerCase().replace(/\s+/g, '-');
  out = out.replace(/<(?:block|columns)[\w-]* [^>]*>/g, (tag) => {
    const model = (tag.match(/ model="([^"]+)"/) || [])[1];
    if (!tag.includes('columns/v1/columns') && !MULTI.has(model)) return tag;
    return tag.replace(/ classes="([^"[]+)"/, (m, v) => ` classes="[${v.split(',').map(option).join(',')}]"`);
  });
  // typed page properties
  out = out.replace(/ (date|validfrom|validto)="(\d{4}-\d\d-\d\d)"/g, ' $1="{Date}$2T00:00:00.000+07:00"');
  out = out.replace(/ hidebreadcrumb="true"/g, ' hidebreadcrumb="{Boolean}true"');
  out = out.replace(/(<block[\w-]* [^>]*model="listing"[^>]*?) limit="(\d+)"/g, '$1 limit="{Long}$2"');
  // images: local import copies -> DAM assets
  out = out.replace(/\/media-da\//g, `${damFolder}/`);
  // FileVault reads a leading "{" as a type and "\" as an escape
  out = out.replace(/\\/g, '\\\\');
  out = out.replace(new RegExp(`="\\{(?!(?:${JCR_TYPES})\\})`, 'g'), '="\\{');
  return out;
}

const pageXml = (title) => `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:cq="http://www.day.com/jcr/cq/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0" jcr:primaryType="cq:Page">
  <jcr:content cq:template="/libs/core/franklin/templates/page" sling:resourceType="core/franklin/components/page/v1/page" jcr:primaryType="cq:PageContent" jcr:title="${title}"/>
</jcr:root>
`;
const folderXml = (title) => `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0" jcr:primaryType="sling:OrderedFolder" jcr:title="${title}"/>
`;
const titleOf = (segment) => segment.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

fs.mkdirSync(OUT, { recursive: true });
const work = fs.mkdtempSync(path.join(OUT, '.build-'));
const root = path.join(work, 'jcr_root');
const pages = [];
const images = new Map(); // DAM path -> local file
const failures = [];

for (const file of pageFiles()) {
  const rel = path.relative(path.join(REPO, 'content'), file).replace(/\.plain\.html$/, '');
  const jcrPath = `${SITE}/${rel}`;
  const market = rel.split('/')[0];
  const damFolder = `${DAM}/${market}/imported`;
  try {
    const html = fs.readFileSync(file, 'utf8');
    const md = await html2md(html.includes('<main') ? html : `<body><main>${html}</main></body>`, { log: SILENT });
    const xml = fix(await md2jcr(md, { ...models, log: SILENT }), damFolder);
    [...xml.matchAll(new RegExp(`${damFolder}/([\\w.-]+)`, 'g'))].forEach(([, name]) => {
      images.set(`${damFolder}/${name}`, path.join(REPO, 'content/media-da', name));
    });
    write(path.join(root, jcrPath, '.content.xml'), xml);
    pages.push(jcrPath);
  } catch (e) {
    failures.push(`${rel}: ${e.message.split('\n')[0]}`);
  }
}

// parent pages that aren't packaged: created only when missing (outside every filter)
const packaged = new Set(pages);
pages.forEach((p) => {
  const parts = p.split('/');
  for (let i = 3; i < parts.length; i += 1) {
    const parent = parts.slice(0, i).join('/');
    if (parent !== SITE && !packaged.has(parent) && !fs.existsSync(path.join(root, parent, '.content.xml'))) {
      write(path.join(root, parent, '.content.xml'), pageXml(titleOf(parts[i - 1])));
    }
  }
});

// assets
const missing = [];
const damFolders = new Set();
images.forEach((src, damPath) => {
  if (!fs.existsSync(src)) {
    missing.push(damPath);
    return;
  }
  damFolders.add(path.dirname(damPath));
  const mime = MIME[path.extname(src).toLowerCase()] || 'application/octet-stream';
  const asset = path.join(root, damPath);
  write(path.join(asset, '.content.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:dam="http://www.day.com/dam/1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:nt="http://www.jcp.org/jcr/nt/1.0" jcr:primaryType="dam:Asset">
  <jcr:content jcr:primaryType="dam:AssetContent">
    <metadata jcr:primaryType="nt:unstructured" dc:format="${mime}"/>
    <related jcr:primaryType="nt:unstructured"/>
    <renditions jcr:primaryType="nt:folder"/>
  </jcr:content>
</jcr:root>
`);
  write(path.join(asset, '_jcr_content/renditions/original.dir/.content.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0" jcr:primaryType="nt:file">
  <jcr:content jcr:primaryType="nt:resource" jcr:mimeType="${mime}"/>
</jcr:root>
`);
  fs.copyFileSync(src, path.join(asset, '_jcr_content/renditions/original'));
});
damFolders.forEach((folder) => {
  const parts = folder.split('/');
  for (let i = 4; i <= parts.length; i += 1) {
    const f = parts.slice(0, i).join('/');
    const file = path.join(root, f, '.content.xml');
    if (!fs.existsSync(file)) write(file, folderXml(parts[i - 1]));
  }
});

// vault metadata: each page replaces only itself and its jcr:content, never its child pages
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const filters = [
  ...pages.map((p) => `    <filter root="${p}">
        <include pattern="${esc(p)}"/>
        <include pattern="${esc(p)}/jcr:content(/.*)?"/>
    </filter>`),
  ...[...damFolders].map((f) => `    <filter root="${f}"/>`),
];
write(path.join(work, 'META-INF/vault/filter.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
${filters.join('\n')}
</workspaceFilter>
`);
write(path.join(work, 'META-INF/vault/properties.xml'), `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
<comment>FileVault Package Properties</comment>
<entry key="name">${NAME}</entry>
<entry key="group">eds-crosswalk-testing</entry>
<entry key="version">${VERSION}</entry>
<entry key="description">${pages.length} imported pages under ${SITE} with ${images.size - missing.length} images under ${DAM}.</entry>
<entry key="packageType">content</entry>
<entry key="requiresRoot">false</entry>
<entry key="allowIndexDefinitions">false</entry>
</properties>
`);
write(path.join(work, 'META-INF/vault/config.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<vaultfs version="1.1"/>\n');

const zip = path.join(OUT, `${NAME}-${VERSION}.zip`);
if (fs.existsSync(zip)) fs.rmSync(zip);
// python's zipfile: no zip binary needed
execFileSync('python3', ['-c', `
import os, sys, zipfile
with zipfile.ZipFile(sys.argv[1], 'w', zipfile.ZIP_DEFLATED) as z:
    for top in ('META-INF', 'jcr_root'):
        for folder, _, files in os.walk(top):
            for f in sorted(files):
                z.write(os.path.join(folder, f))
`, zip], { cwd: work });
fs.rmSync(work, { recursive: true });

console.log(`${path.relative(REPO, zip)}: ${pages.length} pages, ${images.size - missing.length} images`);
if (missing.length) console.log(`images referenced but not found locally (${missing.length}):\n  ${missing.join('\n  ')}`);
if (failures.length) {
  console.log(`pages that failed to convert (${failures.length}):\n  ${failures.join('\n  ')}`);
  process.exitCode = 1;
}
