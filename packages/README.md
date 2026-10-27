# Trial batch packages: 75 en-th pages (1.0.1)

AEM content packages with the 75-page English (Thailand) trial batch, built with `tools/aem-package/build-package.mjs --max-mb 90`. Split into three files because GitHub rejects files over 100 MB.

| Package | Size | Contents |
|---|---:|---|
| `eds-crosswalk-testing-en-th-trial-images-1-1.0.1.zip` | 87.5 MB | 197 images |
| `eds-crosswalk-testing-en-th-trial-images-2-1.0.1.zip` | 32.0 MB | 56 images |
| `eds-crosswalk-testing-en-th-trial-pages-1.0.1.zip` | 0.2 MB | 75 pages and 5 empty parent pages |

**1.0.1:** 25 images have a file name that doesn't match their content, for example JPEG photos named `.png`, because the source site serves them that way. They now declare their real type, so AEM can process them. The pages are unchanged from 1.0.0.

## Install

1. In AEM, open **Tools → Deployment → Packages**.
2. Upload and install the two image packages first, then the pages package. When updating from 1.0.0, only the image packages need installing again.
3. Process the images, which creates their thumbnails and web renditions. Package installs don't, so until then every image shows a placeholder in Assets.
   1. In Assets, open `/content/dam/eds-crosswalk-testing/en-th/imported`.
   2. Select all images and choose **Reprocess Assets**, then **Full Process**.
4. Open the pages (`/content/eds-crosswalk-testing/en-th/content/…`) in Universal Editor and publish them to preview. Publish the offer and news pages before checking the landing pages, because their listings read the published pages.

**What installing changes:**
- Each page replaces only its own content, never its child pages.
- Each image replaces only itself.
- Missing parent pages are created empty; existing ones are left alone.
- The site root `/content/eds-crosswalk-testing` must already exist.

## Home page (1.0.0)

`eds-crosswalk-testing-en-th-home-1.0.0.zip` (3.9 MB) holds the English (Thailand) home page as the `en-th` page, plus its 9 images. It's built from the home page's content feeds and rendered page; see `docs/home-page-map.md`.

| Section | Block |
|---|---|
| Hero, 8 slides from the banner feed | Carousel (hero) |
| Book Flight | Booking Widget (origin BKK, promo code) |
| Hotels, Transportation, Insurance, Airport Services | Accordion (inline) |
| Discover your next adventure | Listing (featured): Special Offers, 5 |
| Exclusive deals with our partners | Listing: Partners (no slider yet) |
| Trending destinations from | Fare Widget (origin Bangkok) |
| Royal Orchid Plus band | Columns (middle, flush) in a Dark + Warm section |
| News & Announcements | Listing (featured): news, 3 |

**Install** it like the others, then run **Reprocess Assets** on its images in `/content/dam/eds-crosswalk-testing/en-th/imported`.
- It replaces only the `en-th` page's own content, never the pages under it.
- If the trial pages package created an empty `en-th` page, this fills it.

The listings fill in once the offer and news pages are published. The booking and fare widgets get live data only on the production domain.

This branch only carries the files for download. It is not meant to be merged.
