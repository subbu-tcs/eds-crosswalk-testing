# Imported-pages content package

`build-package.mjs` turns imported pages (`content/**/*.plain.html`, written by the importer in `tools/importer/`) into an AEM content package for Package Manager.

```sh
node tools/aem-package/build-package.mjs --name eds-crosswalk-testing-en-th-trial --version 1.0.0
```

- Without page arguments it packages every URL in `tools/importer/page-templates.json`. Pass `.plain.html` files to package only those.
- The zip goes to `tools/aem-package/dist/`, which is not committed.

## What it does

1. **Pages:** each `content/<path>.plain.html` becomes the page `/content/eds-crosswalk-testing/<path>`. It is converted with html2md and md2jcr against the project's component models, the same conversion the importer's check uses. Values are then stored the way Universal Editor writes them:
   - multiselect options as lists, with html2md's `promo code` turned back into `promo-code`;
   - dates as typed dates;
   - headings and lists not wrapped in paragraphs;
   - a leading `{` and backslashes escaped.
2. **Images:** each `/media-da/…` image a page uses becomes a `dam:Asset` under `/content/dam/eds-crosswalk-testing/<market>/imported/`, and the page points at it.
3. **Parent pages:** parents that aren't packaged (for example `/en-th/content/baggage`) are added as empty pages. They are created only when missing and never overwrite an existing page.

## Install

In AEM, open **Tools → Deployment → Packages**, upload the zip and click **Install**.

- Each packaged page replaces only its own content. Its child pages are untouched, so packages can be installed in any order.
- The `imported` assets folder of each market is replaced as a whole.
- The site root `/content/eds-crosswalk-testing` must already exist.

After installing, open pages in Universal Editor and publish them to preview. Publish the offer and news pages before checking the landing pages: their Listing blocks read the published pages from the site index.

Asset processing doesn't run for package-installed assets. To get web renditions and metadata, select the `imported` folder in Assets and run **Reprocess Assets**.
