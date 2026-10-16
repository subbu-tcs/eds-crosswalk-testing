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
| Inline row on desktop | `inline` | Cards in 2 columns from 600px, auto-fit row from 900px |
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
| Hero (`hero`) | Full-bleed; text below the image on mobile and over a gradient from 600px. The first image loads eagerly when the block is in the first section |

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
| `classes` | multiselect | no | `featured`, `list`, `filter` (see below) |
| `folder` | aem-content | yes | Lists the pages inside this folder |
| `categories` | text | no | Comma-separated categories to include; empty includes all |
| `limit` | number | no | Maximum items shown (applied per filter selection) |

**Options (combinable)**

| Option | Behaviour |
|---|---|
| (default) | Card grid: 1 column on mobile, 2 from 600px, 3 from 900px |
| Featured first item (`featured`) | First card spans the full row on tablet; 2×2 with text over the image on desktop |
| List rows (`list`) | One card per row, image beside the text from 600px |
| Show category filter (`filter`) | Toggle buttons for the categories found (shown when there are 2 or more); none pressed shows all |

**Behaviour**: card titles are headings one level below the heading above the block (default `h2`). Dates use `<time>` and the page language. If nothing matches, or the index can't be loaded, the block hides itself. After changing `helix-query.yaml`, the index needs rebuilding so existing pages pick up the new properties.

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
- The about 7 MB bundle loads only after the page `load` event, and when the block is within 300px of the viewport. Space is reserved (540px, or 336px from 900px) so the page doesn't shift.
- The widget expects Bootstrap and react-datepicker CSS from the hosting page. The block fetches both once and confines them with `@layer booking-widget-vendor` and `@scope (#bookFlightStandalone)`, so Bootstrap can't restyle the rest of the page. One parity rule from the AEM component (brand airport-code pills) sits in the earlier `booking-widget-parity` layer.
- Only one widget per page is possible, because the bundle looks up a fixed `id`. Further Booking Widget blocks hide themselves and log a warning.
- In Universal Editor the bundle isn't loaded; the block shows the configured values.
- If the bundle can't load, the block hides itself and logs the error.

**Environment requirement**: the widget calls `/common/*`, `/bin/*`, `/content/*`, `/osci/*` and `/pss_router/*` on the page's own domain, and loads Bootstrap from `/etc.clientlibs/*`. It receives live data only on the production domain, where the CDN routes those paths to the existing AEM and API origin. On `*.aem.page` / `*.aem.live` the form renders partially but its data doesn't load.

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

### Header and footer

Built from the **nav** and **footer** pages (fetched as `/nav.plain.html` and `/footer.plain.html`; `/content/…` first for local preview). All copy, links and images live in those pages; the code only adds controls and layout. Step-by-step authoring instructions with the full content are in [docs/nav-footer-authoring.md](docs/nav-footer-authoring.md).

Both blocks read two equivalent layouts, so the same code works with migrated HTML and with Universal Editor content:

| Part | Migrated HTML | Universal Editor |
|---|---|---|
| Logo | Image inside a link | Image component; linked to the home page (or to a link in the same section) |
| Megamenu | Label paragraph + menu inside the main-menu list item | Main-menu item text (or `#slug` link) matching a section's Heading 2; the section holds the menu |
| Link columns | One list, one item per column | Consecutive lists, one per column (one Text component each) |
| Icons (tools, social, app badges) | Image inside the link, named by its alt text | `:name:` in the link text (SVGs in `/icons`); the text beside it is the hidden accessible name |

**Header sections**: logo, main menu and tools come first, in that order. Further sections are panels keyed by the slug of their first heading (opened by a main-menu item or a `#slug` tools link); a panel with a link whose query ends with an empty parameter becomes the search panel, one with Heading 3 groups becomes the region list. A section without a heading is the small-screen app banner.

**Footer sections** are classified by content: several headings each followed by a list are link columns (an accordion below 900px), a heading with a list of icon links is the social row, a section starting with an image is a card (bold link = primary button), the last section without a heading is the bottom bar, and anything else is a promo.
