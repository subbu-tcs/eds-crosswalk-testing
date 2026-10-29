# Your Project's Title...
Your project's description...

## Environments
- Preview: https://main--{repo}--{owner}.aem.page/
- Live: https://main--{repo}--{owner}.aem.live/

## Documentation

Before using the aem-boilerplate, we recommend you to go through the documentation on [www.aem.live](https://www.aem.live/docs/), more specifically:
1. [AEM Authoring](https://www.aem.live/docs/aem-authoring)
2. [Universal Editor Tutorial](https://www.aem.live/developer/ue-tutorial)
3. [Component Model Definitions](https://www.aem.live/developer/component-model-definitions)
4. [Authoring Path Mapping](https://www.aem.live/developer/authoring-path-mapping)

## Prerequisites

- nodejs 20 or newer
- AEM Cloud Service release 2026.4 or newer

## Installation

```sh
npm i
```

## Linting

```sh
npm run lint
```

## Blocks

Before migrating content, run the Universal Editor pilot in [docs/ue-pilot-checklist.md](docs/ue-pilot-checklist.md). It authors each block once and checks the assumptions the code makes about the editor's output.

### Accordion

Expandable list built on native `<details>`/`<summary>`. Everything works without JavaScript; the script only adds search, deep links and the one-open option. Place a heading as default content above the block: the block itself never adds headings.

**Content model** (`blocks/accordion/_accordion.json`)

| Level | Field | Type | Required | Notes |
|---|---|---|---|---|
| Block | `classes` | multiselect | no | Options below |
| Block | `searchLabel` | text | no | FAQ search label; empty hides the search |
| Block | `noResultsMessage` | text | no | Shown and announced when a search finds nothing |
| Item | `summary` | text | yes | Question or title. Items without it show their content unwrapped |
| Item | `body` | richtext | no | Answer; may contain lists, tables, links and images |

**Options (combinable)**

| Option | Value | Behaviour |
|---|---|---|
| FAQ search | `faq` | Search field above the items; hides non-matching items |
| Inline row on desktop | `inline` | Cards in 2 columns from 600px; from 900px one white bar of items with dividers, where an open item drops down below the bar (home page services strip) |
| One item open at a time | `single` | Opening an item closes the others (native `name`, with a script fallback) |

**Behaviour**: each item gets a stable `id`, so `#id` links open and scroll to it. All items expand when printing. Every item stays open while authoring in Universal Editor. The indicator only animates when the visitor allows motion.

### Tabs

Tabs are built from sections, so each panel can hold any content (text, tables, columns, cards, accordion). Add a Tabs block, then give each following section a **Tab label**. The block groups the consecutive labelled sections directly after its own section and stops at the first section without a label. Sections are never moved. Without JavaScript they show stacked, each under its own heading.

**Content model**

| Where | Field | Type | Required | Notes |
|---|---|---|---|---|
| Tabs block | `classes` | multiselect | no | Options below |
| Tabs block | `label` | text | no | Accessible name for the tab list; defaults to the heading above the block |
| Section | `tabLabel` | text | yes, for a panel | Text on the tab; keep it short and unique |

**Options**

| Option | Value | Behaviour |
|---|---|---|
| (default) | — | WAI-ARIA tabs: one panel visible; arrow keys, Home and End move between tabs |
| Jump links | `anchor` | Sticky link bar below the header; all sections stay visible and the one in view is marked current. Sticky only when the block is alone in its section |

**Behaviour**: a link to any `#id` inside a panel opens that tab. All panels show when printing. Every panel stays visible while authoring in Universal Editor. Transitions run only when the visitor allows motion.

### Carousel

Horizontal slides built on a native scroll-snap list. Without JavaScript the slides can still be swiped or scrolled. The script adds previous/next buttons, slide indicators and current-slide tracking. There is no autoplay. Use `cards` for 3 or more items; for 1–2 items a Cards block is simpler.

**Content model**

| Level | Field | Type | Required | Notes |
|---|---|---|---|---|
| Block | `classes` | multiselect | no | `hero` = one full-width slide |
| Block | `label` | text | no | Accessible name; defaults to the heading above the block |
| Block | `previousLabel`, `nextLabel` | text | no | Screen-reader names for the arrow buttons; both empty hides the arrows |
| Slide | `image` + `imageAlt` | reference + text | no | Alt text required unless decorative; don't put text in the image |
| Slide | `mobileImage` | reference | no | Hero only: crop shown below 600px |
| Slide | `text` | richtext | no | Title (bold or a heading), description, optional link or button |

**Variants**

| Variant | Layout |
|---|---|
| Cards (default) | About 1.15 slides visible on mobile, 2 from 600px, 3 from 900px |
| Hero (`hero`) | Full-bleed; text below the image on mobile and over a gradient from 600px, with the arrows and dots centred over the bottom of the image; 400px tall at 1440px. The first image loads eagerly when the block is in the first section |

**Behaviour**: indicators are named after each slide's title (or image alt text, or slide number). Arrows show as unavailable at the ends. All slides stay in the Tab order, and focusing one scrolls it into view. Smooth scrolling and transitions run only when the visitor allows motion.

### Listing

Lists published pages from a folder (for example Offers or News) using the shared query index (`/query-index.json`, configured in `helix-query.yaml`). Items come from each page's metadata, so nothing is maintained twice. Because the items are loaded at runtime, place a heading and any "Show all" link as default content above the block.

**Page metadata used** (page properties in Universal Editor)

| Field | Used for |
|---|---|
| Title, Description | Card title and text |
| `image` (Listing image) | Card image (decorative; the title is the link text) |
| `category` | Card label and filter. Free text; reuse the exact wording per market |
| `date` | Shown and used for sorting (newest first); otherwise the last-modified date is used |
| `validfrom`, `validto` | Pages outside this window are hidden. A date-only end date counts as the whole day |

**Block fields**

| Field | Type | Required | Notes |
|---|---|---|---|
| `classes` | multiselect | no | `featured`, `list`, `slider`, `filter` (see below) |
| `folder` | aem-content | yes | Lists the pages inside this folder |
| `categories` | text | no | Comma-separated categories to include; empty includes all |
| `limit` | number | no | Maximum items shown (applied per filter selection) |

**Options (combinable)**

| Option | Behaviour |
|---|---|
| (default) | Card grid: 1 column on mobile, 2 from 600px, 3 from 900px |
| Featured first item (`featured`) | First card spans the full row on tablet; on desktop it spans two columns of the first row (400px) with text over the image, then rows of three |
| List rows (`list`) | One card per row, image beside the text from 600px. With `featured`, on desktop: the first card fills the left column with text over the image and the others are text-only rows beside it (home page news) |
| Slider (`slider`) | Cards scroll sideways (3 in view on desktop, 2 on tablet, one and a peek on mobile) with previous/next buttons and one dot per card below. Button labels: `listing-previous` / `listing-next` in the placeholders sheet |
| Show category filter (`filter`) | Toggle buttons for the categories found (shown when there are 2 or more); none pressed shows all |

**Behaviour**: card titles are headings one level below the heading above the block (default `h2`), styled the same at every level. With one category set in `categories`, cards don't repeat it. In the section above a listing, a last paragraph that is a single link ("Show All Offers") sits on the heading's line, at the right, from 900px. Dates use `<time>` and the page language. If nothing matches, or the index can't be loaded, the block hides itself. After changing `helix-query.yaml`, the index needs rebuilding so existing pages pick up the new properties.

### Booking Widget

Mounts the existing Thai Airways **React booking widget** (the standalone bundle provisioned in AEM, `/content/dam/thaiairways/scripts/standalone-react/bookingwidget.bundle.min.js`). The block doesn't reimplement any booking logic: the widget renders the form and calls its own backend APIs.

**Block fields**

| Field | Type | Notes |
|---|---|---|
| `classes` | multiselect | `promo-code` shows the promo code field; `fixed-route` limits From/To to the listed airports |
| `origin` | text | Optional IATA code pre-selected as From, e.g. `BKK` |
| `destinations` | text | Optional comma-separated IATA codes, e.g. `TPE, KHH` |

**How it works**

- The block creates `<div id="bookFlightStandalone">` with the full `data-*` attribute set that the AEM `offers-bookingwidget` component emits (`WIDGET_DEFAULTS` in `booking-widget.js`), plus the authored values. The widget needs the full set; with fewer attributes it renders only part of the form on mobile.
- The about 7 MB bundle loads only after the page `load` event, after the visitor's first interaction (pointer move or press, touch, wheel or key), and when the block is within 300px of the viewport. Space is reserved (540px, or 336px from 900px) so the page doesn't shift.
  - Page-speed tests never interact, so the bundle doesn't count against the score.
  - Scroll and focus don't count as interactions, because page scripts cause them too (carousels resetting, the consent banner taking focus).
- The widget expects Bootstrap and react-datepicker CSS from the hosting page. The block fetches both once from jsDelivr and confines them with `@layer booking-widget-vendor` and `@scope (#bookFlightStandalone)`, so Bootstrap can't restyle the rest of the page. The airline's `clientlib-bootstrap` is stock Bootstrap 5.3.3, which is the version loaded. One parity rule from the AEM component (brand airport-code pills) sits in the earlier `booking-widget-parity` layer.
- Only one widget per page is possible, because the bundle looks up a fixed `id`. Further Booking Widget blocks hide themselves and log a warning.
- In Universal Editor the bundle isn't loaded; the block shows the configured values.
- If the bundle can't load, the block hides itself and logs the error.

**Off the airline's domain** (`*.aem.page`, `*.aem.live`, local): the widget calls its services with paths relative to the page (`/common/*`, `/content/*`, `/custom_config/*`, …), which our host doesn't have. So the block:

- rewrites those calls (XHR and fetch, paths in `SERVICES`) to `https://www.thaiairways.com`;
- points the widget's fonts (`/osci/assets/*.ttf`) at the site's own Inter and Bellefair in `/fonts`;
- relies on `404.html`, which forwards `/pss_router/*` and `/booking/*` (where Search Flights sends the visitor) to the same path on the airline's site.

On `www.thaiairways.com` none of this applies.

The airline answers cross-origin calls for `/common/*` (airports, fares, calendar prices). Six configuration files under `/content/*` are refused: the airport configuration, the market rollout plan, the flight listing config and three label files. Without them, the airport fields find no airports. [docs/booking-widget-hosting.md](docs/booking-widget-hosting.md) has the request for the airline's web team.

### Hero

Full-bleed page banner with the page title. It matches the source content-page banner: 298px tall on desktop, image cover, dark gradient, uppercase title bottom-aligned to the content width. Place breadcrumbs as default content above it.

**Content model**

| Field | Type | Required | Notes |
|---|---|---|---|
| `classes` | multiselect | no | `image` = image only, no text overlay |
| `image` + `imageAlt` | reference + text | no | Wide image (about 4.8:1). Alt text required unless decorative; if the image contains text, repeat it in the alt text |
| `mobileImage` | reference | no | Crop shown below 600px; uses the main alt text. Empty uses the main image |
| `text` | richtext | no | Title as Heading 1, optional subtitle, optional link. Bold link = primary button, italic link = secondary button |

**Variants**

| Variant | Layout |
|---|---|
| Default | Text over the image and gradient. Minimum height 200px on mobile, 240px from 600px, 298px from 900px; taller when the text needs it, so nothing is clipped |
| Image only (`image`) | The full image at its own proportions, no overlay; any authored text sits below it |

**Behaviour**: without an image the banner uses the brand purple background; without text the image is shown at its own proportions. A hero in the first section loads its image eagerly with high fetch priority (it's usually the LCP). Images are served at 2000px wide from 1200px, 1200px from 600px and 750px below. Document-style content with the picture and text in one cell is also supported.

### Cards

One block for the source card grids (service and city tiles, help cards, hotel cards, board-of-directors portraits, partner logo walls). The layout is a block option, not a separate block.

**Content model**

| Level | Field | Type | Required | Notes |
|---|---|---|---|---|
| Block | `classes` | multiselect | no | One layout (`overlay`, `compact`, `profile`, `logos`), optionally with `featured` |
| Card | `image` + `imageAlt` | reference + text | yes | Alt text required unless decorative; for logos, the partner name |
| Card | `text` | richtext | no | Title (heading or bold paragraph), optional description, up to 2 links. Profile: name as title, then the role. Logos: one link named after the partner |

**Options**

| Option | Layout |
|---|---|
| (default) | White card, 3:2 image, title, text and links. 1 column, 2 from 600px, 3 from 900px |
| Overlay (`overlay`) | Title and arrow on the image over a dark gradient; 16:9 on mobile, square from 900px. On a card that is one link, the description shows on hover or keyboard focus (wide screens); otherwise it stays visible |
| Compact (`compact`) | One card per row; image above the text on mobile, beside it from 900px |
| Profile (`profile`) | 267px portrait cards in centred rows |
| Logos (`logos`) | Linked images only, no frame: 2, 3, 4 and 6 per row at 0/600/900/1200px; the text is kept for screen readers |
| Feature first (`featured`) | The first card covers 2 columns (and 2 rows from 900px). With `profile`, the first card sits alone in the first row |

**Behaviour**: a card with exactly one link is clickable as a whole, with the focus ring drawn on the card; a card with two links keeps them as separate actions. Links to other sites get an external-link icon. Images load lazily at 750px wide (600px for profiles, 400px for logos).
**Note**: if an image contains text, repeat it in the alt text.

### Columns

Side-by-side text and images (Royal Silk content, the in-flight wifi band, board-member profiles, the homepage loyalty band). Background differences come from section styles, not from the block: use **Dark** + **Warm** for the near-black loyalty band and **Tinted** for light lavender bands.

**Content model**: the standard Universal Editor columns component (number of columns and rows; each cell holds text, image, button or title) plus an Options field. Use 2 or 3 columns. Every image needs alt text.

**Options (combinable)**

| Option | Layout |
|---|---|
| (default) | Equal columns with a 32px gap, top aligned; images have 8px rounded corners |
| First column narrow (`narrow-first`) / Last column narrow (`narrow-last`) | 1:2 or 2:1 split (2 columns only) |
| Center content vertically (`middle`) | Columns aligned on their centre |
| Image fills its column (`flush`) | Square corners; the image covers the full column height. Alone in a coloured section, the block meets the section's top and bottom edges |
| Framed portrait photo (`portrait`) | 2:3 photo in a rounded frame with a lavender ring (249px wide on desktop, up to 294px on mobile) |

**Behaviour**: below 900px the columns stack and a cell holding only an image comes first. A link alone in its paragraph is shown as a bold link with an arrow ("Learn More →"); bold and italic links become primary and secondary buttons as everywhere else.

### Search

Site search for the search page, using the shared query index (`/query-index.json`) in the browser: no search service or vendor is needed. The header search panel submits to `/{market}/content/search?query=…`, so place the block on that page. Popular keywords and suggested pages stay as default content or blocks next to it.

**Block fields**

| Field | Required | Notes |
|---|---|---|
| `label` | yes | Names the field for screen readers and is the button text, e.g. "Search" |
| `placeholder` | no | Hint inside the field |
| `resultsMessage` | yes | `{count}` and `{query}` are filled in; singular and plural forms separated by `\|`, e.g. `{count} result for "{query}" \| {count} results for "{query}"` |
| `noResultsMessage` | yes | `{query}` is filled in |

**Behaviour**
- Searches the title, keywords and description of the current market's pages (the first path segment, e.g. `/en-th/`). Pages marked `noindex`, untitled pages, nav, footer and fragments are left out.
- Every word must match. Title matches rank first, then keywords, then the description. Matching ignores case and Latin accents; Thai text is matched as typed.
- Results update as you type and on Enter, and the `query` parameter in the address bar follows, so results can be shared and the back button works. Without JavaScript, the form still submits to the same page.
- The result count is announced to screen readers. Result titles are headings one level below the heading above the block, and the matched words are highlighted.

**Index**: `keywords` was added to `helix-query.yaml`; after deploying, the index needs rebuilding so existing pages pick it up. Search quality depends on page titles, descriptions and keywords, because page body text isn't indexed.

### Locator

One block for the **airport information** and **worldwide offices** pages. It reads either the current AEM feeds or a published sheet; the format is detected from the data, so moving to sheets later only means changing the data address.

**Block fields**

| Field | Required | Notes |
|---|---|---|
| `classes` | yes | `airports` or `offices` |
| `source` | yes | AEM feed, e.g. `/bin/modal/v1/airportinformation.json?en-th` or `/bin/modal/thaiworldwideOfficesv1.json?en-th`, or a sheet, e.g. `/en-th/data/airports.json` |
| `defaultLocation` | no | Airports: an airport or country code (`BKK`, `TH`). Offices: a country code or city name (`TH`, `BANGKOK (Suvarnabhumi)`) |
| `labels` | yes | Separated by `\|`. Airports: picker title \| location field. Offices: picker title \| country \| city \| office |

**Airports**: a location picker (cities grouped by country), then the airport name, links to its sections, the banner image and each section (contact information, check-in counter, check-in service, lounges, basic facts). Field groups are cards of icon, label and value; lounges are image cards; basic facts are formatted text.
**Offices**: country, city and office pickers, then the city and its offices by type, each a card of fields.

**Behaviour**
- Choices update the results straight away, and the address bar follows (`?location=BKK`, `?country=TH&city=…&office=…`), so a location can be shared and links can open it directly.
- Phone numbers, e-mail addresses and web addresses become links; fax and licence numbers stay text. Field icons follow the label and value.
- HTML in the data is cleaned to paragraphs, lists, emphasis and safe links. The feeds' variants of one office type ("<p>Reservation &amp; Ticketing</p>", …) are merged.
- Headings start one level below the heading above the block. If the data can't be loaded, the block hides its picker and logs the error.

**Sheets (one row per field)**
- Airports: `Country`, `Country code`, `City`, `City code`, `Airport`, `Image`, `Section`, `Group`, `Label`, `Value`, `Link`, `Link text`. A row without a section sets the city's banner `Image`; a row without a group is the section introduction; rows with an `Image` make the group an image card.
- Offices: `Country`, `Country code`, `City`, `Category`, `Name`; every other column (`Phone`, `Fax`, `Email`, `Location`, `Operation time`, …) is shown as a field.
- `tools/locator/feed-to-sheet.py` converts the current feeds into these rows.

**Environment requirement**: the AEM feeds and the airport and lounge images (`/content/dam/…`) only respond on the production domain, where the CDN routes those paths to AEM. On `*.aem.page` / `*.aem.live` use a sheet to see data.

### Fare Widget

The homepage "Trending destinations from [origin]" row of live fares. It calls the airline's own fares service (`POST /common/calendarPricing/popular-fares` with the trip type and origin, as the current site does) or reads a published sheet. Put the fare note ("*Fares displayed have been collected within the last 48hrs…") as default content after the block.

**Block fields** (a key-value block: each field is a labelled row, so the order doesn't matter)

| Field | Required | Notes |
|---|---|---|
| `origins` | yes | `Bangkok (BKK), Chiang Mai (CNX)`; the first is shown first. With one origin there is no picker |
| `source` | yes | `/common/calendarPricing/popular-fares`, or a sheet ending in `.json` |
| `journey` | no | `ROUND_TRIP` (default) or `ONE_WAY` |
| `limit` | no | Maximum fares shown |
| `link` | no | Book now target, with `{origin}`, `{destination}`, `{date}`, `{returnDate}`, `{journey}`, e.g. `/en-th/book/book-flight?from={origin}&to={destination}`. Without it the tiles aren't links |
| `heading`, `from`, `to`, `price`, `book`, `roundtrip`, `oneway`, `previous`, `next` | — | Text: heading before the origin, picker label (screen readers), "To", price text with `{currency}` and `{price}`, button text, trip type words, scroll button names |

**Layout**: an edge-to-edge row of 3:5 tiles: 350 × 583 at 1440px (about 4 in view), 2 from 600px, 1 on mobile. Each tile shows the destination image under a dark gradient, "To", the city, trip and cabin, and the price. Previous and next buttons scroll the row.

**Behaviour**
- Arrows and one dot per fare sit over the bottom of the tiles, centred. Prices use the page language's number format ("From THB 3,850*").
- The whole tile links to the Book now target.
- On wide screens with a pointer, Book now and a slow zoom appear on hover or keyboard focus; on touch screens Book now is always shown.
- The fares of each origin are fetched once per page view. Space for the tiles is reserved while they load.
- If the fares can't be loaded, or there are none, the block hides itself and logs the error.

**Sheet**: columns `Origin`, `Destination`, `City`, `Image`, `Date`, `Return date`, `Journey`, `Price`, `Currency`, `Cabin`. Rows are filtered by origin and trip type.

**Fares service**: a source on this host other than a `.json` sheet (for example `/common/calendarPricing/popular-fares`, which published pages hold as a link) is called on `https://www.thaiairways.com` when the page isn't on that domain. The service answers cross-origin calls, so live fares show on `*.aem.page` and `*.aem.live` too. The booking page may not prefill from the link parameters, since on the current site that hand-off happens inside the app.

### Table

Data tables such as baggage allowances, fleet specifications and mileage charts. Put a heading just above the block: it names the table. Footnotes ("*Saver Class…") go as default content below it.

**Content model**: the Table block has **Options** and **Columns** (1–7). Columns sets the row type authors can add (`table-col-1` … `table-col-7`), and each row has one rich-text field per column. The rendered markup is the standard one (rows of cells), so document-authored tables work too. Rows of 5–7 cells are allowed in `.eslintrc.js` (`xwalk/max-cells`). Imported content carries the Columns setting as a first row (`table-4`) and each row's model in a leading cell (`table-col-4`), which the conversion to Universal Editor needs; the block drops both if they reach the page.

**Options (combinable)**

| Option | Effect |
|---|---|
| (default) | The first row is the header row: bold white text on `--color-purple-900`. Body cells are 14px, centred, with light borders and alternating `neutral-50` / `neutral-25` bands |
| No header row (`no-header`) | Every row is a body row |
| First column as row headers (`header-column`) | The first cell of each row is a row header |
| Left-aligned cells (`left`) | Text starts at the left instead of the centre |
| No row bands (`plain`) | White body rows |

**Behaviour**
- **Group rows:** a row with only its first cell filled becomes a group heading across the table, such as "Business Class" in the partner mileage charts. It starts a new row group and is styled lavender with bold purple text. Real merged cells aren't supported.
- **Shorter rows:** missing cells are padded, so every row has the full column count.
- **Width:** below 600px, tables get at least 140px per column. Wider tables scroll sideways inside a focusable region named by the heading, instead of widening the page.

### Breadcrumb

Built automatically on every page except market home pages (`/`, `/en-th/`); authors don't add it.

**How it works**
- `scripts.js` reserves a 41px bar between the header and `main` while the page first renders. The breadcrumb block (`blocks/breadcrumb/`) fills it after the main content has loaded, so it neither delays the largest paint nor moves the page.
- The trail is the market home, then every ancestor path that is a published page (from `/query-index.json`), then the current page. Path parts without a page, such as `/en-th/content`, are skipped.
- Each label is the page's **Breadcrumb title**, otherwise its title without the site name. The current page falls back to its main heading.

**Page properties**

| Field | Notes |
|---|---|
| Breadcrumb title (`breadcrumbtitle`) | Short name in breadcrumbs, e.g. "Checked Baggage", or "MR. LAVARON SANGSNIT" on a page whose heading is "Board of directors". On a market home page it sets the "Home" label, e.g. "หน้าแรก" |
| Hide breadcrumb (`hidebreadcrumb`) | No breadcrumb on this page, e.g. campaign landing pages |

**Behaviour**
- Ancestors are purple links (Inter Medium 14/22.4); the current page is grey text marked `aria-current="page"`. The trail is a `nav` named "Breadcrumb" containing an ordered list.
- Below 600px only the last two items are shown, and a long current title is shortened with an ellipsis.
- A `BreadcrumbList` structured-data script is added for search engines.
- If the index can't be loaded, the trail is the home page and the current page.

**Index**: `breadcrumbtitle` was added to `helix-query.yaml`. After deploying, rebuild the index so ancestors use their breadcrumb titles.

### Notification ticker

The notice bar under the header on every page, built automatically like the breadcrumb.

**Data**: each market's notifications sheet, published at `/{market}/notifications.json` (e.g. `/en-th/notifications.json`). If a market has no sheet, the current AEM feed `/bin/banner/notification.json?{market}` is used; that feed only responds on the production domain.

| Sheet column | Notes |
|---|---|
| `Heading` | Shown in the bar and as the notice title in the list |
| `Message` | Text (blank lines start new paragraphs) or simple HTML: paragraphs, lists, bold, italic, links |
| `Link`, `Link text` | Optional link under the message |
| `Start`, `End` | ISO date-times (`2026-10-01T09:00:00+07:00`) or dates; empty means always. Only notices active now are shown, and a date-only end covers the whole day |

**Behaviour**
- **Bar:** a 40px gradient bar with an info icon. One heading shows at a time and rotates every 6 seconds.
  - Rotation pauses on hover or focus and with the pause button; with reduced motion there's no rotation and no pause button.
  - A heading, or **See All**, opens a "Notice" dialog listing every active notice (a native modal: Escape, the close button or a click outside closes it).
  - The close button dismisses the bar until the set of notices changes.
- **Contrast:** the gradient uses `purple-800` → `purple-700`, so white text passes 4.5:1. The source's lavender end gives 1.82:1.
- **No layout shift on later pages:** `scripts.js` adds the slot between the header and the breadcrumb. It reserves the 40px height when this market showed notices on the previous page of the visit, so only the first page can shift. With no active notices, the slot is removed.
- **Labels:** "See All", "Notice" and the button names come from the labels sheet (`notifications-*` keys, see Interface labels), with English defaults.

### Interface labels (placeholders sheet)

Words that belong to the interface rather than to a page (button names, screen-reader labels) come from a **placeholders** spreadsheet with `Key` and `Text` columns. Create one at the site root (`/placeholders`) for site-wide wording and one per market (`/en-th/placeholders`, `/th-th/placeholders`), then publish them. The market sheet wins; an empty or missing entry keeps the English default. `fetchPlaceholders()` and `getLabels()` in `scripts.js` load both sheets once per page view.

The page language also comes from the market: `/th-th/…` is `lang="th-TH"`, `/en-th/…` is `en-TH`, other pages `en`. It drives Thai line breaking and fonts, screen-reader pronunciation, Listing dates and Search plurals.

| Key | English default |
|---|---|
| `header-open-menu` / `header-close-menu` | Open navigation / Close navigation |
| `header-back` | Back |
| `header-close` | Close |
| `header-clear` | Clear |
| `header-sub-menu` | sub-menu (added after the group name on drill-down buttons) |
| `footer-new-tab` | (opens in a new tab) |
| `footer-back-to-top` | Scroll page to top |
| `breadcrumb-nav` | Breadcrumb |
| `breadcrumb-home` | Home (a Breadcrumb title on the market home page takes priority) |
| `notifications-region` | Notices |
| `notifications-see-all` | See All |
| `notifications-dialog` | Notice |
| `notifications-close` | Close |
| `notifications-dismiss` | Dismiss notices |
| `notifications-pause` / `notifications-play` | Pause notices / Play notices |

Keys are matched case-insensitively and spaces count as hyphens, so `Header Open Menu` works too. Publish the site and market sheets even if they're empty (the same goes for each market's `notifications` sheet): a missing sheet still works, but the browser logs the 404 as a console error, which Lighthouse counts against Best Practices. Labels that authors set on a block (Search, Locator, Fare Widget, Carousel, Accordion) stay block fields, because they can differ per page.

### Consent, tags and chat (late-loading extras)

`scripts/delayed.js` loads these 3 seconds after the page, so they don't affect the largest paint or interaction readiness. IDs and addresses are in its `CONFIG`.

| Feature | Details |
|---|---|
| Cookie consent | OneTrust (`otSDKStub.js`, domain script `280ff691-ab58-4610-bccb-330a6a94ec40`), as on the current site; the banner and preference centre are configured in OneTrust |
| Google Tag Manager | Containers `GTM-PDXBB9T`, `GTM-NZRTJC`, `GTM-ML57FLPX`, which bring GA4 and Google Ads. Skipped in the airline app's in-app browser, as today. Meta pixels and Salesforce Personalization (hard-coded on the current site) belong in Tag Manager |
| Chat | The existing chat widget (`genai-api.thaiairways.com` webchat, `lang` from the page language) as a 70px launcher bubble bottom right, kept above the back-to-top button while that shows. When the chat sends `BUBBLE_CHAT_OPENED` it grows to full screen on small screens and to a 420 × 680px panel from 900px; a `…CLOSED` message shrinks it back. Only messages from the chat's own frame and origin count |

**Behaviour**
- Nothing loads when the page is inside a frame, so Universal Editor stays free of consent banners, tags and chat.
- They load on every domain, previews included, as chosen. OneTrust only shows its banner on domains configured for the domain script.
- Dropped from the current site: legacy Universal Analytics (`ga.js`, `analytics.js`; Google retired it), Firebase push notifications, and the Eruda debug console loader.

**To confirm with the chat team**: the desktop open size, and the close message name. The current site's handling sits inside its app bundle; only the open message was observed. Also whether `BUBBLE_CHAT_LOGIN_REQUIRED` expects the page to pass a signed-in member's token.

### Header and footer

Built from the **nav** and **footer** pages (fetched as `/nav.plain.html` and `/footer.plain.html`; `/content/…` first for local preview). All copy, links and images live in those pages; the code only adds controls and layout. Step-by-step authoring instructions with the full content are in [docs/nav-footer-authoring.md](docs/nav-footer-authoring.md).

Both blocks read two equivalent layouts, so the same code works with migrated HTML and with Universal Editor content:

| Part | Migrated HTML | Universal Editor |
|---|---|---|
| Logo | Image inside a link | Image component; linked to the home page (or to a link in the same section) |
| Megamenu | Label paragraph + menu inside the main-menu list item | Main-menu item text (or `#slug` link) matching a section's Heading 2; the section holds the menu |
| Link columns | One list, one item per column | Consecutive lists, one per column (one Text component each) |
| Icons (tools, social, app badges) | Image inside the link, named by its alt text | `:name:` in the link text (SVGs in `/icons`); the text beside it is the hidden accessible name |

**Header sections**: logo, main menu and tools come first, in that order. Further sections are panels keyed by the slug of their first heading (opened by a main-menu item or a `#slug` tools link); a panel with a link whose query ends with an empty parameter becomes the search panel, one with Heading 3 groups becomes the region list. A section without a heading is the small-screen app banner. On small screens the header reserves the banner's 82px until it loads. It records whether the banner showed (`nav-banner:{market}` in localStorage), so after a visitor dismisses it, or when the nav has none, the next pages start with only the 54px bar and don't shift. A new banner the visitor hasn't dismissed still appears, shifting once on that page.

**Footer sections** are classified by content: several headings each followed by a list are link columns (an accordion below 900px), a heading with a list of icon links is the social row, a section starting with an image is a card (bold link = primary button), the last section without a heading is the bottom bar, and anything else is a promo.

## Content import

Imports source pages into this project's blocks and packages them for AEM. The page inventory and migration plan are in [docs/page-inventory.md](docs/page-inventory.md). The home page, a React app on the source, is mapped section by section in [docs/home-page-map.md](docs/home-page-map.md).

- **Import** (`tools/importer/`): five page templates (offer detail, partner detail, news article, landing page, content page) in `page-templates.json`, each with an `import-<template>.js` script. The scripts run the block parsers in `parsers/` and the site transformers in `transformers/`:
  - `thaiairways-cleanup.js` strips chrome, fixes images, headings and links;
  - `thaiairways-sections.js` adds sections and tab labels;
  - `thaiairways-metadata.js` writes page properties. For offer pages, category, valid from and valid to come from the offers feed, matched by the offer's slug. `node tools/importer/home-feeds.mjs <snapshot> <feeds-dir> offers` embeds that feed in an offer snapshot. When an offer isn't in the feed, the end date comes from the capture of the offers page on 17 October, or else from the booking, sales or promotion period the page states (never a travel or stay period). The offers feed is per market.

  The source site is bot-protected, so pages are imported from browser snapshots in `tools/importer/bd-snapshots/`. Those snapshots, the bundles and the reports aren't committed. `fetch-missing-images.mjs` downloads images an imported page still points at on the source (lazy or feed-driven images the snapshot missed) and adds them to the page's image map for the next import.
- **Home page** (template `home-page`): the source home page is a React app, so its import reads the app's content feeds:
  1. `node tools/importer/home-feeds.mjs <snapshot> <feeds-dir>` embeds the banner carousel, services and offers feeds in the snapshot.
  2. `thaiairways-home.js` marks the sections by their content.
  3. The `home-*` parsers turn them into blocks.

  The section map is in [docs/home-page-map.md](docs/home-page-map.md).
- **Package** (`tools/aem-package/`): `build-package.mjs` turns the imported pages and their images into a Package Manager zip, and `check-package.py` checks the result; see its [README](tools/aem-package/README.md).
