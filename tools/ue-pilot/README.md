# Universal Editor pilot package

`eds-crosswalk-testing-ue-pilot-1.0.0.zip` is an AEM content package with the pilot pages for [`docs/ue-pilot-checklist.md`](../../docs/ue-pilot-checklist.md), authored with the project's component models.

## Install

1. In AEM, open **Tools → Deployment → Packages**, upload the zip and click **Install**.
   - The package replaces only `/content/eds-crosswalk-testing/en-th/pilot` and `/content/dam/eds-crosswalk-testing/pilot`.
   - The `en-th` page is created if it is missing and left as it is if it exists. The site root `/content/eds-crosswalk-testing` must already exist.
2. Open the pages in Universal Editor and preview them. Preview the offer pages before the listing page, so they reach the index.

## Pages

| Page | Tests |
|---|---|
| `pilot` | 0.1, 0.2; links to the other pages |
| `pilot/child` (Breadcrumb title "Pilot child") | 0.3 |
| `pilot/hidden` (Hide breadcrumb) | 0.4 |
| `pilot/hero-cards-columns` | H1–H3, C1–C4, CO1–CO3 |
| `pilot/accordion-tabs-carousel` | A1–A3, T1–T3, CA1–CA3 |
| `pilot/table` | TA1–TA4 |
| `pilot/offers/offer-1..3`, `pilot/listing` | L1–L3 |
| `pilot/search` | S1 |
| `pilot/integrations` | B1, LO1, LO2, F1, F2, FR1, D1, D3 |
| `pilot/fragment` | Content for FR1 |

Fields that a test needs **empty** are empty, including the fare widget's Book link, which the component template would otherwise fill in. The images come from `content/images`.

Not included, author or publish these separately:
- the airports, offices and fares sheets at `/en-th/pilot/…` (LO1, LO2, F1);
- the nav and footer (0.5, G1);
- the placeholders and notifications sheets (G2–G4);
- the search page at `/en-th/content/search` (S2), left out so the package can't overwrite it;
- D2 (a table in rich text) and the column-count change in TA2, which are editor checks.

The Button component has no accent type, so D1's accent button is a bold + italic link in a Text component; the primary and secondary buttons are Button components.

## Rebuild

From the repository root, after `npm run build:json`:

```sh
python3 tools/ue-pilot/build-package.py
```

- `make-md.py` writes the pages as markdown with field hints.
- `build-package.py` converts them with [md2jcr](https://www.npmjs.com/package/@adobe/helix-md2jcr) (through `npx`, or a local copy set in `MD2JCR`).
- It then stores values the way Universal Editor writes them: multiselects as lists, dates, booleans and numbers typed, and headings and lists not wrapped in paragraphs.
- Finally it adds the images as assets and zips the package.
