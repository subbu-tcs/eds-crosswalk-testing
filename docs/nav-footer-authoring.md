# Authoring the header and footer in Universal Editor

The header and footer are built from two AEM pages at the site root: **nav** and **footer**. Both pages already exist with the boilerplate placeholder content; replace that content with the sections below, then publish both pages. Every page on the site picks up the change; no page needs editing.

This guide matches the editor-friendly layout the header and footer code reads (tested in the local preview). Copy the text and links exactly; the section order matters where noted.

**Shortcut:** `tools/aem-package/nav-footer-from-guide.mjs` builds both pages from this guide as a content package (see `tools/aem-package/README.md`). Installing it gives the same result as authoring them by hand. Edit this guide first if the content changes, so the two stay in step.

## Before you start: images

Upload these images to AEM Assets (for example to a `thaiairways/navigation` folder) and pick them in the Image components:

`thai-logo.svg`, `world-map.webp`, `promo-hkt.webp`, `promo-nrt.webp`, `promo-han.webp`, `promo-isb.webp`, `promo-bom.webp`, `promo-book.webp`, `promo-baggage-guide.webp`, `promo-travel-class.webp`, `promo-rop.webp`, `promo-charter.webp`, `help-baggage-policies.webp`, `help-manage-booking.webp`, `search-faqs.webp`, `search-baggage-policies.webp`, `search-special-assistance.webp`, `search-manage-booking.webp`, `app-icon.webp`, `footer-newsletter-bg.webp`, `footer-star-alliance.svg`

## Rules

- **Sections**: each "Section" below is one Section in the page, added in the order shown. Inside a section, add the components (Title, Text, Image) in the order shown.
- **Text**: a Text component (rich text). `[label](url)` is a link with that label and URL; `**text**` is bold; `- item` is a bulleted list, and indented items are a nested list (use the indent button). `Heading 3: text` is a Heading 3 from the text format menu.
- **One list per Text**: a menu column, or any list, is its own Text component. Don't put two lists in one Text component.
- **Icons**: icons ship with the site code. Type the icon name between colons inside the link text, for example `[:search: Search](#search)`. The text next to the icon is what screen readers announce; on icon-only links (search, cart, social links, app badges) it isn't shown, but it's required. Available icons: `location`, `contact`, `user`, `search`, `cart`, `youtube`, `facebook`, `instagram`, `x`, `line`, `tiktok`, `app-store`, `google-play`, `appgallery`.
- **Images**: an Image component on its own. Set the alt text as given; "(empty, decorative)" means leave the alt text empty.
- **Cards**: an Image followed by a Text with a bold title, an optional description and a link becomes a card.

## Header (nav page)

- Sections 1 to 3 must stay first, in this order: logo, main menu, tools. The logo links to the home page automatically.
- Each main-menu item opens the panel section whose Heading 2 has exactly the same text. A main-menu item that is a link to another page stays a plain link.
- Tools links starting with `#` open the panel whose Heading 2 matches: `#contact-us` opens "Contact Us", `#location-language` opens "Location & Language" and `#search` opens "Search" (lowercase, spaces and symbols become a single hyphen).
- In the Search panel, the link whose URL ends with `query=` becomes the search field; its label is the placeholder text.
- A section without a heading (section 13) is the app banner shown on small screens.

### Header section 1: Logo

**Image**: `thai-logo.svg`, alt text: "Thai Airways home"

### Header section 2: Main menu

**Text** (a list)

- Plan Trip
- Book
- Travel Information
- Experience
- Royal Orchid Plus
- For Business

### Header section 3: Tools

**Text** (a list)

- [:location: Thailand-English](#location-language)
- [:contact: Contact Us](#contact-us)
- :user: [Sign In](/en-th/sign-in/) / [Join Now](/en-th/sign-up/)

**Text** (a list)

- [:search: Search](#search)
- [:cart: Cart](/en-th/sign-in/)

### Header section 4: Plan Trip panel

**Title** (Heading 2): Plan Trip

**Image**: `world-map.webp`, alt text: (empty, decorative)

**Text** (a list)

- [Where we fly](/en-th/content/where-we-fly/)
  - [Thailand](/en-th/content/where-we-fly/thailand/)
  - [Asia](/en-th/content/where-we-fly/asia/)
  - [Europe](/en-th/content/where-we-fly/europe/)
  - [Australia](/en-th/content/where-we-fly/australia/)

**Text** (a list)

- [Offers & Promotions](/en-th/content/offers-Promotions)
  - [Special Offers](/en-th/content/offers-Promotions?tab=specialOffers)
  - [Partner Previleges](/en-th/content/offers-Promotions?tab=partners)
  - [Royal Orchid Plus](/en-th/content/offers-Promotions?tab=rop)
  - [Royal Orchid Holidays](/en-th/content/offers-Promotions?tab=roh)
- [Airport Information](/en-th/content/airport-information)
- [Flight Schedule](/en-th/plan-trip/flight-schedule)

**Text** (a list)

- [Popular Destinations](https://www.thaiairways.com/flights/en-th/)
  - [Bangkok to Phuket](https://www.thaiairways.com/flights/en-th/flights-from-bangkok-to-phuket)
  - [Bangkok to Japan](https://www.thaiairways.com/flights/en-th/flights-from-bangkok-to-japan)
  - [Thailand to Vietnam](https://www.thaiairways.com/flights/en-th/flights-from-thailand-to-vietnam)
  - [Thailand to Pakistan](https://www.thaiairways.com/flights/en-th/flights-from-bangkok-to-phuket)
  - [Thailand to India](https://www.thaiairways.com/flights/en-th/flights-from-thailand-to-india)

**Image**: `promo-hkt.webp`, alt text: (empty, decorative)

**Text**

**Bangkok to Phuket**

[Book Now](https://www.thaiairways.com/flights/en-th/flights-from-bangkok-to-phuket)

**Image**: `promo-nrt.webp`, alt text: (empty, decorative)

**Text**

**Bangkok to Japan**

[Book Now](https://www.thaiairways.com/flights/en-th/flights-from-bangkok-to-japan)

**Image**: `promo-han.webp`, alt text: (empty, decorative)

**Text**

**Thailand to Vietnam**

[Book Now](https://www.thaiairways.com/flights/en-th/flights-from-thailand-to-vietnam)

**Image**: `promo-isb.webp`, alt text: (empty, decorative)

**Text**

**Thailand to Pakistan**

[Book Now](https://www.thaiairways.com/flights/en-th/flights-from-thailand-to-pakistan)

**Image**: `promo-bom.webp`, alt text: (empty, decorative)

**Text**

**Thailand to India**

[Book Now](https://www.thaiairways.com/flights/en-th/flights-from-thailand-to-india)

### Header section 5: Book panel

**Title** (Heading 2): Book

**Image**: `promo-book.webp`, alt text: (empty, decorative)

**Text**

**Explore the world with us**

[Book a Flight](/en-th/book/book-flight)

**Text** (a list)

- [Book Flight](/en-th/book/book-flight)
- [My Trips](/en-th/book/my-trips)
  - [Upcoming Trips](/en-th/book/my-trips)
  - [Past Trips](/en-th/book/my-trips/past-trips)
- [Check-in](/en-th/content/check-in)
  - [Online Check-in](/en-th/content/check-in#checkinStandalone)
  - [Mobile Check-in](/en-th/content/check-in#section1)
  - [Self Check-in](/en-th/content/check-in#section2)
  - [Counter Check-in](/en-th/content/check-in#section3)

**Text** (a list)

- [More Services](/en-th/content/more-services)
  - [Preferred Seats](/en-th/content/more-services/preferred-seats/)
  - [Pre-Select Meals](/en-th/content/more-services/pre-select-meals)
  - [Special In-Flight Meals](/en-th/content/more-services/special-in-flight-meals)
  - [Online Excess Baggage](/en-th/content/more-services/online-excess-baggage)
  - [Standby Upgrade](/en-th/content/more-services/standby-upgrade)
  - [Airport Services](/en-th/content/more-services/airport-services)
  - [Transportation](/en-th/content/more-services/transportation)
  - [Hotels](/en-th/content/more-services/hotels)
  - [Insurance](/en-th/content/more-services/insurance)
  - [Royal Orchid Holidays](/en-th/content/more-services/royal-orchid-holidays)
  - [THAI Shop](https://thaishop.thaiairways.com/web/)
  - [Pre-order Duty Free](/en-th/content/more-services/pre-order-duty-free)
  - [Other Services](/en-th/content/more-services/other-services)

**Text** (a list)

- [Flight Status](/en-th/book/flight-status)
- [e-Receipt](/en-th/book/e-Receipt)

### Header section 6: Travel Information panel

**Title** (Heading 2): Travel Information

**Image**: `promo-baggage-guide.webp`, alt text: (empty, decorative)

**Text**

**Baggage Guide**

[Learn More](/en-th/content/baggage)

**Text** (a list)

- [Baggage](/en-th/content/baggage)
  - [Checked Baggage](/en-th/content/baggage/checked-baggage)
  - [Carry-on Baggage](/en-th/content/baggage/carry-on-baggage)
  - [Excess Baggage](/en-th/content/baggage/excess-baggage)
  - [Special Baggage](/en-th/content/baggage/special-baggage)
  - [Restricted Baggage](/en-th/content/baggage/restricted-baggage)
  - [Dangerous Goods](/en-th/content/baggage/dangerous-goods)
  - [Delayed Baggage](/en-th/content/baggage/delayed-baggage)
  - [Damaged Baggage](/en-th/content/baggage/damaged-baggage)
  - [Bag Drop](/en-th/content/baggage/bagdrop)
- [Baggage Tracking](/en-th/travel-information/baggage/baggage-tracking)

**Text** (a list)

- [Special Assistance](/en-th/content/special-assistance)
  - [Unaccompanied Minors](/en-th/content/special-assistance/unaccompanied-minors)
  - [Traveling with Infants](/en-th/content/special-assistance/traveling-with-infants)
  - [Traveling with Pets](/en-th/content/special-assistance/travel-with-pets)
  - [Wheelchair](/en-th/content/special-assistance/traveling-with-a-wheelchair)
  - [Advice for Elderly Passengers](/en-th/content/special-assistance/advice-for-elderly-passenger)
  - [Advice for Sick Passengers](/en-th/content/special-assistance/advice-for-sick-passengers)
  - [Health and Well-being Onboard](/en-th/content/special-assistance/health-andwell-being-onboard)

**Text** (a list)

- [Travel Document](/en-th/content/travel-document)

### Header section 7: Experience panel

**Title** (Heading 2): Experience

**Image**: `promo-travel-class.webp`, alt text: (empty, decorative)

**Text**

**Explore our classes**

[Travel Classes](/en-th/content/travel-class)

**Text** (a list)

- [Ground Services](/en-th/content/ground-services)
  - [Lounges](/en-th/content/ground-services/lounges)
  - [Gold Track](/en-th/experience/ground-services/gold-track)
  - [Star Alliance Services](https://www.staralliance.com/en/home)
- [Our Fleet](/en-th/content/our-fleet)

**Text** (a list)

- [Travel Classes](/en-th/content/travel-class)
  - [Royal First](/en-th/content/travel-class/royal-first/)
  - [Royal Silk](/en-th/content/travel-class/royal-silk/)
  - [Premium Economy](/en-th/content/travel-class/premium-economy/)
  - [Economy](/en-th/content/travel-class/economy/)

**Text** (a list)

- [In-Flight Experience](/en-th/content/in-flight-experience)
  - [In-Flight Cuisine](/en-th/content/in-flight-experience/in-flight-cuisine)
  - [Sawasdee Magazine](https://sawasdee.thaiairways.com/)
  - [In-Flight Entertainment](/en-th/content/in-flight-experience/in-flight-entertainment)
  - [In-Flight Connectivity](/en-th/content/in-flight-experience/in-flight-connectivity)
  - [Use of Electric Device](/en-th/content/in-flight-experience/use-of-electronic-device)
  - [In-Flight Duty Free](/en-th/content/in-flight-experience/in-flight-duty-free)
  - [e-Library](/en-th/content/in-flight-experience/e-library)

### Header section 8: Royal Orchid Plus panel

**Title** (Heading 2): Royal Orchid Plus

**Image**: `promo-rop.webp`, alt text: (empty, decorative)

**Text**

**Exclusive Benefits Await For You**

[Sign In / Join Royal Orchid Plus](/en-th/sign-up)

**Text** (a list)

- [About Royal Orchid Plus](/en-th/content/about-royal-orchid-plus)
- [Status and Benefits](/en-th/content/status-and-benefits)

**Text** (a list)

- [Miles Calculator](/en-th/rop/miles-calculator)
- [Earn Miles](/en-th/content/earn-miles)
- [Spend Miles](/en-th/content/spend-miles)
  - [Search By Miles](/en-th/rop/spend-miles/search-by-miles)
  - [Air Awards](/en-th/content/spend-miles/air-awards)
  - [Non-Air Awards](/en-th/content/spend-miles/non-air-awards)
  - [Flight Upgrades](/en-th/content/spend-miles/flight-upgrades)
  - [ROP Smart Miles Pay](/en-th/content/spend-miles/rop-smart-miles-pay)
  - [ROP Smart Miles Pay Lite](/en-th/content/spend-miles/rop-smart-miles-pay-lite)
  - [Donations](/en-th/content/spend-miles/donation)

**Text** (a list)

- [Promotions and Offers](/en-th/content/offers-Promotions?tab=rop)
- [Royal Orchid Plus News](/en-th/content/royal-orchid-plus/royal-orchid-plus-news)
  - [Royal Orchid Plus Newsletter](/en-th/content/royal-orchid-plus/royal-orchid-plus-newsletter)

### Header section 9: For Business panel

**Title** (Heading 2): For Business

**Text** (a list)

- [Corporate](/en-th/content/corporate/guest/)
- [Agency](/en-th/agency/agency-login/)
- [MICE](/en-th/content/mice)
- [Charter Flight](/en-th/content/charter-flights)

**Image**: `promo-charter.webp`, alt text: (empty, decorative)

**Text**

**Charter Flights**

[Book Now](/en-th/content/charter-flights)

### Header section 10: Contact Us panel

**Title** (Heading 2): Contact Us

**Text** (a list)

- [FAQ](/en-th/content/help/faq/)
- [THAI World Wide Offices](/en-th/content/help/thai-worldwide-offices/)

**Text** (a list)

- [Flight Support](/en-th/help/flight-support)
- [Special Service Request & Assistance](/en-th/help/service-request)
- [Royal Orchid Plus Service](/en-th/help/royal-orchid-plus-services)

**Text** (a list)

- [Flight Disruption](/en-th/content/help/flight-disruption/)
- [Lost and Found](/en-th/help/lost-and-found)
- [My Request](/en-th/help/my-requests)

**Image**: `help-baggage-policies.webp`, alt text: (empty, decorative)

**Text**

**Baggage Policies**

[Learn More](/en-th/content/baggage/)

**Image**: `help-manage-booking.webp`, alt text: (empty, decorative)

**Text**

**Manage Booking**

[Learn More](/en-th/book/my-trips)

### Header section 11: Location & Language panel

**Title** (Heading 2): Location & Language

**Text**

Heading 3: Asia-Pacific

**Text** (a list)

- **Australia** [English](/en-au/)
- **Bangladesh** [English](/en-bd/)
- **Cambodia** [English](/en-kh/)
- **China** [简体中文](/zh-cn/) | [English](/en-cn/)
- **Hong Kong - China** [繁體中文](/zh-hk/) | [English](/en-hk/)
- **India** [English](/en-in/)
- **Indonesia** [English](/en-id/)
- **Japan** [日本語](/ja-jp/) | [English](/en-jp/)
- **Korea** [한국어](/ko-kr/) | [English](/en-kr/)
- **Laos** [English](/en-la/)
- **Malaysia** [English](/en-my/)
- **Myanmar** [English](/en-mm/)
- **Nepal** [English](/en-np/)
- **New Zealand** [English](/en-nz/)
- **Pakistan** [English](/en-pk/)
- **Philippines** [English](/en-ph/)
- **Singapore** [English](/en-sg/)
- **Sri Lanka** [English](/en-lk/)
- **Taiwan - China** [繁體中文](/zh-tw/) | [English](/en-tw/)
- **Thailand** [ไทย](/th-th/) | [English](/en-th/)
- **Vietnam** [Tiếng Việt](/vi-vn/) | [English](/en-vn/)

**Text**

Heading 3: Europe

**Text** (a list)

- **Belgium** [English](/en-be/)
- **Denmark** [English](/en-dk/)
- **France** [Français](/fr-fr/)
- **Germany** [Deutsch](/de-de/)
- **Italy** [Italiano](/it-it/)
- **Netherlands** [English](/en-nl/)
- **Norway** [Norwegian](/no-no/) | [English](/en-no/)
- **Spain** [Español](/es-es/)
- **Sweden** [Svenska](/sv-se/) | [English](/en-se/)
- **Switzerland** [English](/en-ch/)
- **Türkiye (Turkey)** [Türkçe](/tr-tr/)
- **United Kingdom** [English](/en-gb/)

**Text**

Heading 3: The Americas

**Text** (a list)

- **Canada** [English](/en-ca/)
- **United States of America** [English](/en-us/)

### Header section 12: Search panel

**Title** (Heading 2): Search

**Text**

[Search For...](/en-th/content/search?query=)

Heading 3: Popular Keywords

**Text** (a list)

- [Help](/en-th/content/search?query=Help)
- [Online Check-in](/en-th/content/search?query=Online%20Check-in)
- [Manage Booking](/en-th/content/search?query=Manage%20Booking)
- [Destinations](/en-th/content/search?query=Destinations)
- [Wi-fi](/en-th/content/search?query=Wi-fi)

**Text**

Heading 3: Looking for one of these pages?

**Image**: `search-faqs.webp`, alt text: (empty, decorative)

**Text**

**FAQs**

View useful information for your trip.

[FAQs](/en-th/content/help/faq/)

**Image**: `search-baggage-policies.webp`, alt text: (empty, decorative)

**Text**

**Baggage Policies**

See fees and policies for checked and carry-on bags

[Baggage Policies](/en-th/content/baggage/)

**Image**: `search-special-assistance.webp`, alt text: (empty, decorative)

**Text**

**Special Assistance**

Unaccompanied minors, travelling with infant and more

[Special Assistance](/en-th/content/special-assistance)

**Image**: `search-manage-booking.webp`, alt text: (empty, decorative)

**Text**

**Manage Booking**

Receive information regarding flight status

[Manage Booking](/en-th/book/my-trips)

### Header section 13: App banner (small screens)

**Image**: `app-icon.webp`, alt text: (empty, decorative)

**Text**

**Thai Airways**

Smooth as silk.

[View](https://app.thaiairways.com/utils/qrdownload)


## Footer (footer page)

- In the newsletter card, the bold link is the primary button; the other link is secondary.
- Links to other sites and to PDF files open in a new tab automatically.
- On small screens the link columns become an accordion automatically.

### Footer section 1: Link columns

**Title** (Heading 2): ABOUT THAI

**Text** (a list)

- [Company Profile](/en-th/content/company-profile/)
- [Board of Directors](/en-th/content/board-of-directors/)
- [Executive Management Team](/en-th/content/executive-management/)
- [Star Alliance](/en-th/content/star-alliance/)
- [Sustainable Development](/en-th/content/sustainable-development/)
- [Investor Relations](https://ir.thaiairways.com/)
- [Careers / Join us](https://career.thaiairways.com/)
- [Procurement & Supplier](/en-th/content/procurement-supplier/)
- [Modern Slavery Statement](/content/dam/thaiairways/pdf/footer/Anti_Slavery_Statement.pdf)
- [Good Corporate Governance](/en-th/content/good-corporate-governance/)

**Title** (Heading 2): Travel Policies

**Text** (a list)

- [Reservation & Ticketing](/en-th/content/reservation-ticketing-terms-and-conditions/)
- [Conditions of Contract](/en-th/content/conditions-of-contract/)
- [Conditions of Carriage](/en-th/content/condition-of-carriage/)
- [Domestic Ceiling Fares (CAAT)](/en-th/content/domestic-ceiling-fares/)
- [Agency Debit Memo Policy](/content/dam/thaiairways/pdf/footer/Agency_Debit_Memo_Policy.pdf)
- [Procedures for Thai Airways Ticket Agents](/content/dam/thaiairways/pdf/footer/procedures-for-thai-airways-ticket-agents.pdf)

**Title** (Heading 2): Legal Information

**Text** (a list)

- [Terms of Use](/en-th/content/terms-of-use/)
- [Passenger Rights](/en-th/content/passenger-rights/)
- [Privacy Notice](/en-th/content/privacy-notice/)
- [Cookie Notice](/en-th/content/cookie-notice/)

**Title** (Heading 2): POPULAR FLIGHTS

**Text** (a list)

- [Flights from Thailand](https://www.thaiairways.com/flights/en-th/flights-from-thailand/)
- [Flights to Udon Thani](https://www.thaiairways.com/flights/en-th/flights-to-udon-thani/)
- [Flights to Chiang Rai](https://www.thaiairways.com/flights/en-th/flights-to-chiang-rai/)
- [Flights to Hanoi](https://www.thaiairways.com/flights/en-th/flights-to-hanoi/)
- [Flights to Beijing](https://www.thaiairways.com/flights/en-th/flights-to-beijing/)
- [Flights to Sydney](https://www.thaiairways.com/flights/en-th/flights-to-sydney/)
- [Flights to Istanbul](https://www.thaiairways.com/flights/en-th/flights-to-istanbul/)

### Footer section 2: Social links

**Title** (Heading 2): Connect with us

**Text** (a list)

- [:youtube: Youtube](https://www.youtube.com/ThaiAirwaysChannel)
- [:facebook: Facebook](https://www.facebook.com/ThaiAirways.TH/)
- [:instagram: Instagram](https://instagram.com/ThaiAirways/)
- [:x: X](https://x.com/ThaiAirways/)
- [:line: Line](https://lin.ee/uTkEULC)
- [:tiktok: Tiktok](https://www.tiktok.com/@thaiairwaysinternational?_t=ZS-8vZOXIJoCkW&_r=1)

### Footer section 3: Newsletter card

**Image**: `footer-newsletter-bg.webp`, alt text: (empty, decorative)

**Title** (Heading 2): Subscribe to our newsletter

**Text**

Stay in the loop with the latest updates and promotions delivered straight to your inbox.

**[Subscribe to Offers](/en-th/subscribe/)**

[Unsubscribe](/en-th/unsubscribe/)

### Footer section 4: App promotion

**Title** (Heading 2): Stay in control throughout Your Journey.

**Text**

Easily manage, track, and modify your trip on the go. All your plans in one comprehensive digital travel companion.

Heading 3: Download Now

**Text** (a list)

- [:app-store: App Store](https://apps.apple.com/th/app/thai-airways/id1393912966)
- [:google-play: Play Store](https://play.google.com/store/apps/details?id=com.thaiairways.mobile&hl=en&gl=US)
- [:appgallery: Huawei Store](https://appgallery.huawei.com/app/C101200261)

### Footer section 5: Bottom bar

**Text**

Copyright © 2026 Thai Airways International Public Company Limited (THAI). All rights reserved.

**Image**: `footer-star-alliance.svg`, alt text: "Star Alliance"

## Notes on the content

Copied from the current site as-is; check these while authoring:

- Plan Trip > Popular Destinations: "Thailand to Pakistan" links to the Bangkok to Phuket page (the promo card for it links to the Pakistan page).
- Plan Trip > Offers & Promotions: "Partner Previleges" is spelled as on the current site.

## After authoring

1. Preview the nav and footer pages, then open any site page and check the header and footer.
2. Publish the nav and footer pages.
