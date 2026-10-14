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
