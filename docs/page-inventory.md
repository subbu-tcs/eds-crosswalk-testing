# Page inventory: thaiairways.com

Taken on 17 October 2026 from the sitemaps listed in the site's `robots.txt`: 44 market sitemaps and the `/flights/` sitemap index. Page types come from the URL structure, checked against 100 sampled `en-th` pages (template, components, word count). Requests followed the site's `Crawl-Delay: 5`. The site blocks plain requests, so they went through a browser service.

The full lists are in the migration work folder (local only, not committed):
- `pages.csv`: every URL with its market, language, section, type and last-modified date;
- `paths.csv`: each distinct path, with the markets that have it;
- `summary.json`.

## Totals

| | |
|---|---|
| Markets | 44 (30 English, plus `th-th`, `de-de`, `fr-fr`, `it-it`, `es-es`, `ja-jp`, `ko-kr`, `vi-vn`, `tr-tr`, `no-no`, `sv-se`, `zh-cn`, `zh-hk`, `zh-tw`) |
| URLs in the market sitemaps | **15,900** (257–597 per market; `th-th` 597 and `en-th` 591 are the largest) |
| Distinct paths | 1,700. Most markets repeat the same structure |
| English markets | 30 markets, 811 distinct paths. 210 paths are in all 30, 363 in one market only (mostly offers and news) |
| Other languages | 288–596 distinct paths each |
| Flight route pages (`/flights/…`) | 56 locales. Sampled: `en` 7,778, `en-th` 1,209, `th-th` 1,161, `de-de` 342. **Not AEM**, see below |

## Page types

| Type | All markets | `en-th` | Distinct paths | What the samples show | Blocks |
|---|---:|---:|---:|---|---|
| Generic content page | 6,810 | 174 | 501 | Template `thai-generic`. Banner/hero, text, tables, accordions, tabs, image + text rows, card grids | Hero, Columns, Table, Accordion, Tabs, Cards, default content |
| Offer / promotion detail | 3,684 | 247 | 527 | Title with image, text, booking widget | Hero (image), Booking Widget, default content |
| Mileage partner detail | 1,945 | 44 | 47 | Banner, text, earning tables, button | Hero, Table, default content |
| News article | 988 | 52 | 139 | Article body (`newsannouncementdetails`) | Default content, page metadata (date, category) |
| Fleet and aircraft | 405 | 9 | 18 | Aircraft carousels, seat/amenity tabs, modals | **Needs new blocks** (aircraft carousel, amenities) |
| Airport information | 368 | 1 | 328 | 109 airport pages each in `de-de`, `fr-fr`, `it-it`; `en-th` has only the landing. **Not sampled** | To check |
| Mileage partner landing and category pages | 353 | 8 | 9 | Card grids | Cards |
| Offers landing and category pages | 154 | 4 | 12 | Category navigation + tabbed offer lists | Tabs, Listing |
| News landing | 52 | 1 | 5 | News list | Listing |
| Home | 44 | 1 | 1 | Already migrated | Hero, Fare Widget, Cards, … |
| Board profiles | 40 | 20 | 20 | Profile cards, two-column profile (`en-th` and `th-th` only) | Cards (profile), Columns (portrait) |
| Booking / service applications | 573 | 19 | 82 | React apps (`/book`, `/rop`, `/help`, `/plan-trip`, `/content/book-flight`, `/content/e-receipt`, …), no AEM template | **Not content**, see below |
| Redirect stubs (`/content/redirect/…`) | 484 | 11 | 11 | Pages that forward to the apps | **Redirects, not pages** |

**What to migrate as AEM pages:** about **14,840 pages**. That's 15,900 minus the 573 application pages and 484 redirect stubs.

**Components without a block yet** (all from the samples):
- fleet pages: aircraft carousel, multi-tab scrolling, amenities, modal;
- `statusAndBenefits` comparison (Royal Orchid Plus tiers);
- `wifiComponent` (in-flight connectivity);
- `highlightsBenefits` (charter flights);
- the boarding pass page, which uses its own template (`boarding-pass-template`).

## Not part of the content migration

- **Flight route pages (`/flights/…`)** run on **EveryMundo airTRFX**, a third-party fare-marketing platform (Next.js, `em-frontend-assets.airtrfx.com`). That's more than 10,000 URLs, and they stay on airTRFX. The CDN must keep routing `/flights/*` to it.
- **Booking and service applications** (`/{market}/book/…`, `/rop/…`, `/help/…`, `/plan-trip/…`, `/experience/…`, `/travel-information/…` and a few `/content/` shells) are React applications. They need routing or embedding, not import. The booking team owns them, as for the Booking Widget.
- **Redirect stubs** (11 per market) belong in a redirects sheet, not as pages.

## Before the bulk import: decisions needed

1. **Stale offers.**
   - 581 offer pages have a past year in the URL, for example `…-2024` or `…-2025`. Another 178 mention 2026.
   - Marketing should confirm which offers are still live. Dropping expired ones could remove up to about 16% of the offer pages.
2. **Language copies vs. market pages.**
   - The 30 English markets share most paths. Do they hold the same text, maintained as AEM language or live copies?
   - If yes: import English once, then roll it out to the markets. Otherwise, import each market separately, which is about 30× the English volume.
   - The current AEM setup (MSM) decides this.
3. **Localized URLs.**
   - `de-de`, `fr-fr` and `it-it` use translated section names, for example `flughafen-informationen`, `offres-et-promotions` and `offerte-e-promozioni`.
   - AEM page names must keep them, or old URLs need redirects.
   - Case also varies: `offers-Promotions` vs. `offers-promotions`. Edge Delivery URLs are lowercase, so mixed-case paths need redirects.
4. **Airport information pages** (328 distinct, mostly `de-de`, `fr-fr`, `it-it`). Sample them and decide whether they become pages or a data-driven block.
5. **Search page.** `robots.txt` blocks `/content/search`, so it couldn't be sampled. It will be rebuilt with the Search block.

## Recommended order

1. **Templates.** Write import scripts for the five types that cover 90% of the pages:
   - generic content page,
   - offer detail,
   - partner detail,
   - news article,
   - landing/category pages.
2. **Trial batch** in `en-th`: about 15 pages per template (around 75 pages). Check them in Universal Editor and on the preview.
3. **Full `en-th`** (about 560 pages), then **`th-th`** (the second language, Thai script).
4. **Other markets:** English markets by rollout or import (decision 2), then the remaining languages.
5. **Alongside the imports:**
   - the fleet blocks and the other components without a block;
   - redirects (stubs, mixed-case and localized URLs);
   - the `/flights/*` and application routing at the CDN.
