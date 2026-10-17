# Universal Editor pilot checklist

Every block was built and tested against markup shaped like Universal Editor output, not against real authored content. This pilot authors each block once in Universal Editor, previews it, and checks the result, so problems surface before bulk migration.

**How to report**: for each test, note pass or fail. For a failure, send the preview URL. The block's published markup is public at `…/page.plain.html` on `*.aem.page`, so it can be diagnosed from the URL alone.

**Where**: create the pilot pages under the English Thailand market (`/content/eds-crosswalk-testing/en-th/pilot/…`), so the market-dependent features are tested too. Use the branch preview `https://main--eds-crosswalk-testing--subbu-tcs.aem.page/en-th/pilot/…`.

**Shortcut**: the content package in [`tools/ue-pilot/`](../tools/ue-pilot/README.md) creates these pages, already authored, so you can open them in Universal Editor and go straight to previewing and checking. The pilot landing page is `pilot` itself rather than `pilot/index`.

Priority: **P1** = an assumption the code depends on that hasn't been checked in Universal Editor; **P2** = layout or behaviour check.

---

## 0. Before the blocks

| # | Do | Expect | Checks | Priority |
|---|---|---|---|---|
| 0.1 | Create and preview `/content/eds-crosswalk-testing/en-th/pilot/index` with one Text component | It previews at `/en-th/pilot` (no `/content/eds-crosswalk-testing` in the URL) | URL mapping: the repo has no `paths.json`; market features need `/en-th/` as the first URL segment | P1 |
| 0.2 | Open 0.1 and inspect `<html lang>` | `en-TH` | Page language from the market | P1 |
| 0.3 | Create `/en-th/pilot/child` under it, set **Breadcrumb title** "Pilot child", preview | Breadcrumb "Home › Pilot › Pilot child" once the index is rebuilt (before that: "Home › Pilot child") | Page properties render as `<meta name="breadcrumbtitle">`; index property | P1 |
| 0.4 | On 0.3, turn on **Hide breadcrumb** | No breadcrumb bar | Boolean page property renders as `true` | P1 |
| 0.5 | Author the **nav** and **footer** pages with `docs/nav-footer-authoring.md`, preview both | Header and footer as on the current local preview | See §3 | P1 |

## 1. Blocks

### Hero
| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| H1 | Hero in the first section: Image, Alt "Cabin", Text = Heading 1 "Pilot hero" + paragraph + bold link | 298px banner on desktop, uppercase title over the gradient, primary button | `image` / `imageAlt` / `text` rows; bold link becomes a button | P1 |
| H2 | Add a **Mobile image** | Mobile image below 600px, main image above | `mobileImage` reference renders as its own row | P1 |
| H3 | Option **Image only** | Full image without overlay | `classes` multiselect becomes a block class | P2 |

### Cards
| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| C1 | Cards, 3 cards with image, alt, text (Heading 3 + paragraph + one link) | 3 columns; whole card clickable | Card rows: image + text cells | P1 |
| C2 | Options **Overlay** + one card with a description | Square tiles; description on hover | `classes` with several values | P2 |
| C3 | Options **Profile** + **Feature the first card** | First card alone, centred | Combined options | P2 |
| C4 | Options **Logos**, link text = partner name | Logos only; link names read by screen readers | | P2 |

### Columns
| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| CO1 | Columns 2×1: Image in one cell, Title + Text + link in the other | Side by side on desktop, image first on mobile, "Learn More →" link | Columns component markup; Options field on columns | P1 |
| CO2 | Section style **Dark** + **Warm**, Columns with **Center content vertically** + **Image fills its column** | Near-black band, image to the band edges | Section multiselect styles; columns `classes` | P1 |
| CO3 | Options **First column narrow** + **Framed portrait photo** | 1:2 split, oval frame | | P2 |

### Accordion
| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| A1 | Accordion with 3 items (Summary + Body with a list and a link), **no** Search label | Items open and close; no search field | Block rows when `searchLabel` and `noResultsMessage` are **empty**: items must not be read as settings | P1 |
| A2 | Same with Search label "Search FAQs", No results "No match", option **FAQ search** | Search field filters items; no-results message | Settings rows read in order | P1 |
| A3 | Option **One item open at a time** | Opening one closes the others | | P2 |

### Tabs
| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| T1 | Section with a heading and a Tabs block; then 3 sections each with **Tab label** (One, Two, Three) and content; then a section without a label | 3 tabs; the unlabelled section stays outside | Section property `tabLabel` reaches the page (section metadata) | P1 |
| T2 | Tabs with option **Jump links** | Sticky link bar; all sections visible | | P2 |
| T3 | Leave the Tabs **Label** empty | Tab list named by the heading above | Empty `label` row | P1 |

### Carousel
| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| CA1 | Carousel with 5 slides (image, alt, text), Previous/Next labels set | Arrows and indicators; 3 slides in view on desktop | Settings rows (`label`, `previousLabel`, `nextLabel`) before slide rows | P1 |
| CA2 | Same with **Label** empty and both button labels empty | No arrows; indicators still work; first slide not mistaken for a setting | Empty settings rows | P1 |
| CA3 | Option **Hero** with a Mobile image on one slide | Full-width slides; mobile crop below 600px | | P2 |

### Table
| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| TA1 | Heading "Checked baggage", then Table with **Columns = 2**; check the Add menu offers "Row" with 2 cells; add 4 rows | Purple header row, banded body, named by the heading | The `filter` field switches the row type (`table-col-2`) | P1 |
| TA2 | Change to **Columns = 4** and add rows | New rows have 4 cells | Filter change | P1 |
| TA3 | A row with only the first cell filled ("Business Class") | Full-width lavender group row | Empty cells render as empty cells | P1 |
| TA4 | 5- and 6-column tables | Render; scroll sideways on mobile | Rows of 5–6 fields | P2 |

### Listing
| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| L1 | 3 pages under `/en-th/pilot/offers/` with Listing image, Category, Date, Valid from/to; rebuild the index | `/query-index.json` lists them with those properties | Page properties reach the index | P1 |
| L2 | Listing: Pages under `/en-th/pilot/offers`, **Only these categories empty**, Maximum items 2 | 2 cards, newest first | Empty `categories` row must not shift `limit` | P1 |
| L3 | Options **Featured first item** + **Show category filter** | Featured layout; category buttons | | P2 |

### Booking Widget
| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| B1 | Booking Widget, Origin "BKK", Destinations empty | In Universal Editor: configured values shown, no widget. On the preview: the widget renders (data only on production) | Empty `destinations` row | P1 |

### Search
| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| S1 | Page `/en-th/content/search` with Heading 1 and Search: Field label "Search", **Placeholder empty**, Results "{count} result for \"{query}\" \| {count} results for \"{query}\"", No results "No results for \"{query}\"" | Searching the pilot pages lists them; plural message | Empty `placeholder` row must not shift the messages | P1 |
| S2 | Use the header search panel | Lands on the search page with results | Header ↔ search page | P2 |

### Locator
| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| LO1 | Publish an airports sheet (`tools/locator/feed-to-sheet.py airports …`) at `/en-th/pilot/airports`; Locator **Shows = Airports**, Data address `/en-th/pilot/airports.json`, **Default location empty**, Labels "Select location \| City / Country" | Picker with cities; first city shown | `classes` from a select; empty `defaultLocation` row | P1 |
| LO2 | Same with **Shows = Offices** and an offices sheet, Default "BANGKOK (Suvarnabhumi)" | Country, city and office pickers | | P2 |

### Fare Widget
| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| F1 | Publish a fares sheet (README columns) at `/en-th/pilot/fares`; Fare Widget with Origins "Bangkok (BKK), Chiang Mai (CNX)", Fares address `/en-th/pilot/fares.json`, other fields left at their defaults | Tiles from the sheet; origin picker | Key-value block: each field renders as a labelled row; template defaults appear | P1 |
| F2 | Leave **Maximum fares** and **Book link** empty | All fares; tiles not linked | Empty key-value rows | P1 |

### Fragment
| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| FR1 | A fragment page with a heading and text; a Fragment block referencing it | The fragment content shows in place | Existing boilerplate block | P2 |

## 2. Default content

| # | Author | Expect | Checks | Priority |
|---|---|---|---|---|
| D1 | Text with bold link, italic link, and bold + italic link, each alone in a paragraph | Primary, secondary and accent buttons | Button decoration | P2 |
| D2 | A rich-text **table** in a Text component, if the editor allows it | Note whether it publishes as a `<table>` | Decides whether rich-text tables need styling (the Table block covers it otherwise) | P2 |
| D3 | Text with `:search:` typed in a paragraph | Search icon | Icon notation in authored content | P1 |

## 3. Site-wide pieces

| # | Do | Expect | Checks | Priority |
|---|---|---|---|---|
| G1 | Preview nav and footer (0.5) and open a pilot page at 1440px and 375px | Logo links home; menus open with images, columns and cards; tool icons; footer social icons and app badges | Editor-friendly nav layout: menus as sections, consecutive lists as columns, `:icon:` names in link text | P1 |
| G2 | Publish `/en-th/placeholders` (Key, Text) with `header-open-menu` = "Open menu" | The mobile menu button's accessible name changes | Placeholders sheet | P1 |
| G3 | Publish `/en-th/notifications` with one active row | Ticker under the header; See All dialog | Notifications sheet | P1 |
| G4 | Leave `/en-th/placeholders` and `/en-th/notifications` published but empty | No 404s in the browser console | Empty sheets | P2 |
| G5 | Open a pilot page in Universal Editor | No cookie banner, tags or chat in the editor; blocks stay editable | Delayed scripts skip frames | P2 |
| G6 | Open a pilot page on a phone, dismiss the app banner, open another page | The second page doesn't jump | Banner state | P2 |

## 4. Results

| Test | Pass / fail | Preview URL (if failed) | Notes |
|---|---|---|---|
| | | | |
