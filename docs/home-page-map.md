# Home page section map: thaiairways.com/en-th

Captured on 27 October 2026 at 1440×900 and 390×844 through the protected browser. The captures (screenshots, rendered HTML, request lists and content feeds) are in `migration-work/home/`, which is local only and not committed.

## How the current home page is built

The home page is **one React application**. Everything between the header and the footer renders inside a single `#root` element: no AEM page components, no `thai-generic` template. The app is the `/osci/` webpack bundle, about 50 script chunks.

Most of its content isn't hard-coded, though. The app reads **JSON exports of AEM components** that authors maintain in a hidden content tree, `/content/thaiairways/th/en/homepage/json/…`, and live data from the airline's APIs:

| Feed | Feeds section |
|---|---|
| `…/json/bannercarousel/…/bannercarousel.model.json` | Hero carousel: 8 slides with image, title, subtitle, button text and URL |
| `…/homepage/offers-Promotions/…/offers.model.json` | Offers and partner deals: 79 offers with image, alt, title, description, **valid from / valid to**, category (`specialOffers`, `partners`, `rop`, `roh`), link and device |
| `…/json/moreservices/…/moreservices.model.json` | Services strip: 4 categories with partner links |
| `/bin/joinnow.json`, `/bin/newsandannouncement.json` | Royal Orchid Plus band, news. `/bin/` is disallowed in robots.txt; content taken from the rendered page |
| `/bin/banner/notification.json` | Notification ribbon: 18 notices with region, language, start and end time |
| `/common/calendarPricing/popular-fares`, `/common/airport/*` | Trending fares, airport lists (APIs) |
| `/content/dam/dapi-booking/…`, `…/mmb/…`, `…/dapicheckin/…` | Booking, manage-booking and check-in configuration |

So the content is authored in AEM today, just not as pages. The migration moves it from those JSON components into blocks on a real home page.

## Section map

| # | Section (top to bottom) | Today | Edge Delivery | Status |
|---|---|---|---|---|
| — | Header | React | `header` block from the authored nav page | Done |
| 1 | Notification ribbon ("PASSENGER NOTICE…", See All) | React, notification feed | `notifications`, automatic on every page, from `/en-th/notifications` | Exists; the sheet needs the 18 current notices |
| 2 | Personalisation slot (`#mcp-placeholder1`, empty for an anonymous visitor) | Salesforce Marketing Cloud Personalization (Evergage) fills it | Decision: keep (the Evergage script loads later and keeps an empty target section) or drop | **Decision** |
| 3 | Hero carousel, 8 slides ("Rise to Gold", domestic offer, Da Nang, Xiamen, Amsterdam…) | React, banner feed | `carousel (hero)`: slides with image, mobile image, title, text and button | Exists |
| 4 | Booking panel: tabs **Book Flight**, Manage Booking, Check-in, Flight Status; Return/One-way/Multi-city, promo code, Redeem Miles | React (home app) | Book Flight: `booking-widget`, which mounts the existing standalone React booking bundle. The other three tabs exist only inside the home app | **Gap**: Book Flight is covered; the other three need standalone bundles from the booking team, or tabs that link to the existing app pages |
| 5 | Services strip: Hotels, Transportation, Insurance, Airport Services, each expanding to partner links (desktop only; empty on phones) | React, services feed | `accordion (inline)`: 4 items, each with a list of links | Exists |
| 6 | "Discover your next adventure": the first 5 special offers, first one large, plus Show All Offers | React, offers feed | Heading, text and link as default content + `listing (featured)`, category Special Offers, limit 5 | Exists. **Decision**: the home page shows the feed's hand-set order; Listing shows newest first |
| 7 | "Exclusive deals with our partners": slider of the 21 partner offers with arrows and dots | React, offers feed | `listing`, category Partners | **Gap**: Listing has no slider layout; add a `slider` option (carousel behaviour) |
| 8 | "Trending destinations from [Bangkok]": origin picker, fare tiles with Book Now, fare note | React, popular-fares API | `fare-widget` + the fare note as default content | Exists (same API) |
| 9 | Royal Orchid Plus band, dark: "More than a journey…", Join Now, Learn More, image | React, join-now feed | `columns (middle, flush)` in a section styled Dark + Warm | Exists (pilot test CO2) |
| 10 | News & Announcements: 3 latest, first one large, Show All News | React, news feed | Heading and link + `listing (featured)` over the news folder, limit 3 | Exists; needs the news pages published (15 imported in the trial) |
| — | Footer, back-to-top button | React | `footer` block (it includes back to top) | Done |
| — | Chat bubble | Script | `scripts/delayed.js` | Done |

The offers feed also has a site-wide popup (`showPopup`, currently off) and `advertisementData.json` ("Inspiration destination: Winter in Niseko"), which wasn't visible in either capture. Check with marketing whether either is still used.

## What this means

- **8 of the 10 content sections map onto existing blocks.** The home page can be authored in Universal Editor from blocks the project already has. The Book Flight form stays React, as it is now.
- **Gaps:**
  1. **Manage Booking / Check-in / Flight Status tabs.** Ask the booking team whether standalone bundles exist, like the Book Flight one. If they do, the Booking Widget block can mount them in Tabs. If not, those tabs link to the existing app pages.
  2. **A slider layout for Listing**, for the partner deals row.
- **Decisions:**
  1. Keep or drop the personalisation slot.
  2. Hand-ordered or newest-first offers on the home page. Listing could support a pinned order if marketing needs it.
- **Bonus for the offers:** the offers feed has valid-from and valid-to dates for every offer, so the 10 trial offer pages without an end date can get one from it, and the bulk import needn't rely on the landing-page cards.

## Suggested next steps

1. Build the home page from the feeds rather than by scraping the rendered app: carousel slides from the banner feed, services from the services feed, the ROP band and section headings from the rendered page, plus Listing and Fare Widget settings. Package it with the trial batch's builder.
2. Fill the `/en-th/notifications` sheet from the notification feed.
3. Use the offers feed for offer dates in the importer's metadata transformer.
4. Close the gaps: ask the booking team about the three tabs, and build the Listing `slider` option.
