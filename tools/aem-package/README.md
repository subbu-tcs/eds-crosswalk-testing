# Imported-pages content package

`build-package.mjs` turns imported pages (`content/**/*.plain.html`, written by the importer in `tools/importer/`) into an AEM content package for Package Manager.

```sh
npm install
node tools/aem-package/build-package.mjs --name eds-crosswalk-testing-en-th-trial --version 1.0.0
```

- Without page arguments it packages every URL in `tools/importer/page-templates.json`. Pass `.plain.html` files to package only those.
- The zip goes to `tools/aem-package/dist/`, which is not committed.
- `--max-mb 90` splits the output into a pages package (`<name>-pages`) and image packages (`<name>-images-1`, `-2`, …) of at most that size each, for transfers with a file-size limit (GitHub rejects files over 100 MB).
- **It needs the imported pages.** They are the importer's output, `content/<path>.plain.html` plus their images in `content/media-da/`. That folder is local preview content and isn't in the repository, so run the builder where the import ran, or copy that `content/` folder into the project first. Without it, the script stops and says which pages are missing.
- The html2md and md2jcr converters are dev dependencies (`@adobe/helix-html2md`, `@adobe/helix-md2jcr`). Zipping uses the `zip` command, or Python 3 when `zip` isn't installed.

## What it does

1. **Pages:** each `content/<path>.plain.html` becomes the page `/content/eds-crosswalk-testing/<path>`. It is converted with html2md and md2jcr against the project's component models, the same conversion the importer's check uses. Values are then stored the way Universal Editor writes them:
   - multiselect options as lists, with html2md's `promo code` turned back into `promo-code`;
   - dates as typed dates;
   - headings and lists not wrapped in paragraphs;
   - a leading `{` and backslashes escaped.
2. **Images:** each `/media-da/…` image a page uses becomes a `dam:Asset` under `/content/dam/eds-crosswalk-testing/<market>/imported/`, and the page points at it. Its declared type comes from the file's content, not its name, because the source serves some JPEGs as `.png` and the reverse, and AEM's asset processing goes by the declared type.
3. **Parent pages:** parents that aren't packaged (for example `/en-th/content/baggage`) are added as empty pages. They are created only when missing and never overwrite an existing page.

## Install

In AEM, open **Tools → Deployment → Packages**, upload the zip(s) and click **Install** on each. For split packages, install the image packages before the pages package, so the pages open with their images.

- Each packaged page replaces only its own content. Its child pages are untouched, so packages can be installed in any order.
- Each image replaces only itself. Other images in the `imported` folder, from other packages or earlier batches, are left alone.
- The site root `/content/eds-crosswalk-testing` must already exist.

After installing, open pages in Universal Editor and publish them to preview. Publish the offer and news pages before checking the landing pages: their Listing blocks read the published pages from the site index.

Asset processing doesn't run for package-installed assets. To get web renditions and metadata, select the `imported` folder in Assets and run **Reprocess Assets**.
