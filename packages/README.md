# Trial batch packages: 75 en-th pages (1.0.0)

AEM content packages with the 75-page English (Thailand) trial batch, built with `tools/aem-package/build-package.mjs --max-mb 90`. Split into three files because GitHub rejects files over 100 MB.

| Package | Size | Contents |
|---|---:|---|
| `eds-crosswalk-testing-en-th-trial-images-1-1.0.0.zip` | 87.5 MB | 197 images |
| `eds-crosswalk-testing-en-th-trial-images-2-1.0.0.zip` | 32.0 MB | 56 images |
| `eds-crosswalk-testing-en-th-trial-pages-1.0.0.zip` | 0.2 MB | 75 pages and 5 empty parent pages |

## Install

1. In AEM, open **Tools → Deployment → Packages**.
2. Upload and install the two image packages first, then the pages package.
3. In Assets, select `/content/dam/eds-crosswalk-testing/en-th/imported` and run **Reprocess Assets**. Package installs don't create web renditions.
4. Open the pages (`/content/eds-crosswalk-testing/en-th/content/…`) in Universal Editor and publish them to preview. Publish the offer and news pages before checking the landing pages, because their listings read the published pages.

**What installing changes:**
- Each page replaces only its own content, never its child pages.
- Each image replaces only itself.
- Missing parent pages are created empty; existing ones are left alone.
- The site root `/content/eds-crosswalk-testing` must already exist.

This branch only carries the files for download. It is not meant to be merged.
