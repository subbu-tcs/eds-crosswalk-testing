"""Writes the Universal Editor pilot pages as EDS markdown (grid tables with field hints)."""
import os
import sys
import textwrap

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'md')
DAM = '/content/dam/eds-crosswalk-testing/pilot'
SITE = '/content/eds-crosswalk-testing/en-th/pilot'


def img(name, alt=''):
    return f'![{alt}]({DAM}/{name})'


def hint(field, content):
    """A cell value preceded by its field hint; empty content stays an empty cell."""
    return f'<!-- field:{field} -->\n{content}' if content else ''


def grid(header, rows):
    """A grid table: the header spans all columns; rows may have fewer cells (the last spans)."""
    cols = max([len(r) for r in rows] + [1])
    lines_of = lambda c: (c or '').split('\n')
    width = max([len(header)] + [len(l) for r in rows for c in r for l in lines_of(c)] + [8]) + 2

    def bounds(n):
        # column indexes where a cell starts, for a row of n cells on the cols grid
        return list(range(n - 1)) + [n - 1] if n == cols else list(range(n))

    def span_widths(n):
        if n == cols:
            return [width] * n
        return [width] * (n - 1) + [width * (cols - n + 1) + (cols - n)]

    def border(prev_n, next_n, char='-'):
        marks = set()
        for n in (prev_n, next_n):
            if n:
                pos = 0
                for w in span_widths(n):
                    marks.add(pos)
                    pos += w + 1
                marks.add(pos)
        total = width * cols + cols
        return ''.join('+' if i in marks else char for i in range(total + 1))

    def render(cells):
        widths = span_widths(len(cells))
        texts = [lines_of(c) for c in cells]
        height = max(len(t) for t in texts)
        out = []
        for i in range(height):
            parts = [f' {(t[i] if i < len(t) else ""):<{w - 1}}' for t, w in zip(texts, widths)]
            out.append('|' + '|'.join(parts) + '|')
        return out

    out = [border(1, 1), *render([header])]
    prev = 1
    for k, row in enumerate(rows):
        out.append(border(prev, len(row), '=' if k == 0 else '-'))
        out += render(row)
        prev = len(row)
    out.append(border(prev, prev))
    return '\n'.join(out)


def metadata(pairs, name='Metadata'):
    return grid(name, [[k, v] for k, v in pairs])


def page(path, *sections, meta=None):
    parts = []
    for i, section in enumerate(sections):
        if i:
            parts.append('---')
        parts.append(textwrap.dedent(section).strip() if isinstance(section, str) else '\n\n'.join(section))
    if meta:
        parts.append(metadata(meta))
    file = os.path.join(OUT, f'{path}.md')
    os.makedirs(os.path.dirname(file), exist_ok=True)
    open(file, 'w').write('\n\n'.join(parts) + '\n')


rt = lambda *paras: '\n\n'.join(paras)

# --- index, child, hidden -------------------------------------------------------------------
page('index', """
# Universal Editor pilot

Pilot pages for docs/ue-pilot-checklist.md. Each page tests a group of blocks.

- [Child page (breadcrumb title)](/content/eds-crosswalk-testing/en-th/pilot/child)
- [Hidden breadcrumb](/content/eds-crosswalk-testing/en-th/pilot/hidden)
- [Hero, Cards, Columns](/content/eds-crosswalk-testing/en-th/pilot/hero-cards-columns)
- [Accordion, Tabs, Carousel](/content/eds-crosswalk-testing/en-th/pilot/accordion-tabs-carousel)
- [Table](/content/eds-crosswalk-testing/en-th/pilot/table)
- [Listing](/content/eds-crosswalk-testing/en-th/pilot/listing)
- [Search](/content/eds-crosswalk-testing/en-th/pilot/search)
- [Integrations and default content](/content/eds-crosswalk-testing/en-th/pilot/integrations)
""", meta=[('title', 'Universal Editor pilot'), ('description', 'Pilot pages for the Universal Editor checklist.')])

page('child', """
# Child page

Test 0.3: the breadcrumb should end with "Pilot child".
""", meta=[('title', 'Pilot child page'), ('breadcrumbtitle', 'Pilot child')])

page('hidden', """
# Hidden breadcrumb

Test 0.4: no breadcrumb bar on this page.
""", meta=[('title', 'Pilot hidden breadcrumb'), ('hidebreadcrumb', 'true')])

# --- hero, cards, columns -------------------------------------------------------------------
card = lambda image, alt, text: [hint('image', img(image, alt)), hint('text', text)]
page(
    'hero-cards-columns',
    [grid('Hero', [
        [hint('image', img('promo-travel-class.webp', 'Royal Silk cabin'))],
        [hint('mobileImage', img('promo-rop.webp'))],
        [hint('text', rt('# Pilot hero', 'Tests H1 and H2: title over the gradient, mobile crop below 600px.', '**[Book a flight](/en-th/book/book-flight)**'))],
    ])],
    ['## Hero image only (H3)', grid('Hero (image)', [
        [hint('image', img('promo-book.webp', 'Explore the world with us'))], [''], [''],
    ])],
    ['## Cards (C1)', grid('Cards', [
        card('promo-hkt.webp', 'Phuket bay', rt('### Phuket', 'Beaches and islands.', '[Discover Phuket](/en-th/where-we-fly/thailand)')),
        card('promo-nrt.webp', 'Tokyo street', rt('### Tokyo', 'Food and neon.', '[Discover Tokyo](/en-th/where-we-fly/asia)')),
        card('promo-han.webp', 'Hanoi lake', rt('### Hanoi', 'Old quarter and lakes.', '[Discover Hanoi](/en-th/where-we-fly/asia)')),
    ])],
    ['## Cards overlay (C2)', grid('Cards (overlay)', [
        card('promo-hkt.webp', 'Phuket bay', rt('#### [Thailand](/en-th/where-we-fly/thailand)')),
        card('promo-nrt.webp', 'Tokyo street', rt('#### [THAI](/en-th/earn-miles/thai)', 'Enjoy greater mileage earning and elevated privileges when you travel with THAI.')),
        card('promo-isb.webp', 'Islamabad', rt('#### [Europe](/en-th/where-we-fly/europe)')),
    ])],
    ['## Cards profile, featured (C3)', grid('Cards (profile, featured)', [
        card('promo-charter.webp', 'Mr. Example Chair', rt('**MR. EXAMPLE CHAIR**', 'DIRECTOR', 'CHAIRMAN OF THE BOARD')),
        card('promo-bom.webp', 'Ms. Example Director', rt('**MS. EXAMPLE DIRECTOR**', 'INDEPENDENT DIRECTOR')),
        card('promo-han.webp', 'Mr. Example Member', rt('**MR. EXAMPLE MEMBER**', 'DIRECTOR')),
    ])],
    ['## Cards logos (C4)', grid('Cards (logos)', [
        card('thai-logo.svg', 'Thai Airways', rt('[Thai Airways](/en-th/)')),
        card('footer-star-alliance.svg', 'Star Alliance', rt('[Star Alliance](https://www.staralliance.com/)')),
    ])],
    ['## Columns (CO1)', grid('Columns', [
        [img('promo-travel-class.webp', 'Royal Silk seat'), rt('## Thai Sky Connect', 'Catch up on the world of business and social media on board.', '[Learn More](/en-th/sky-connect)')],
    ])],
    [grid('Columns (middle, flush)', [
        [rt('## More than a journey', 'Make every journey remarkable with Royal Orchid Plus.', '*[Join Now](/en-th/rop/join)*', '[Learn More](/en-th/rop)'), img('promo-rop.webp', 'Two passengers in Royal First seats')],
    ]), grid('Section Metadata', [['style', 'dark, warm']])],
    ['## Columns narrow first, portrait (CO3)', grid('Columns (narrow-first, portrait)', [
        [img('promo-charter.webp', 'Mr. Example Chair'), rt('## Mr. Example Chair', '**DIRECTOR**', '**CHAIRMAN OF THE BOARD**')],
    ])],
    meta=[('title', 'Pilot: Hero, Cards, Columns')],
)

# --- accordion, tabs, carousel --------------------------------------------------------------
item = lambda summary, body: [hint('summary', summary), hint('body', body)]
slide = lambda image, alt, text, mobile='': [hint('image', img(image, alt)), hint('mobileImage', img(mobile) if mobile else ''), hint('text', text)]
page(
    'accordion-tabs-carousel',
    ['## Accordion, settings empty (A1)', grid('Accordion', [
        [''], [''],
        item('What can I bring on board?', rt('- One carry-on bag', '- One personal item', '[Carry-on baggage](/en-th/content/baggage/carry-on-baggage)')),
        item('How do I check in?', rt('Online, mobile, kiosk or counter.')),
        item('Can I change my booking?', rt('Yes, in **My Trips**.')),
    ])],
    ['## Accordion FAQ search (A2)', grid('Accordion (faq)', [
        [hint('searchLabel', 'Search FAQs')], [hint('noResultsMessage', 'No match. Try another word.')],
        item('Baggage allowance', rt('Depends on the cabin and route.')),
        item('Seat selection', rt('Choose seats when booking or in My Trips.')),
    ])],
    ['## Accordion one open (A3)', grid('Accordion (single)', [
        [''], [''],
        item('First', rt('First answer.')),
        item('Second', rt('Second answer.')),
    ])],
    ['## Tabs (T1, T3: label empty)', grid('Tabs', [['']])],
    [rt('### Panel one', 'Content of the first tab.'), grid('Section Metadata', [['tabLabel', 'One']])],
    [rt('### Panel two', 'Content of the second tab.'), grid('Section Metadata', [['tabLabel', 'Two']])],
    [rt('### Panel three', 'Content of the third tab.'), grid('Section Metadata', [['tabLabel', 'Three']])],
    [rt('## After the tabs', 'This section has no Tab label and must stay outside the tabs.')],
    ['## Jump links (T2)', grid('Tabs (anchor)', [[hint('label', 'Jump to')]])],
    [rt('### Overview', 'Overview section.'), grid('Section Metadata', [['tabLabel', 'Overview']])],
    [rt('### Cabin', 'Cabin section.'), grid('Section Metadata', [['tabLabel', 'Cabin']])],
    ['## Carousel (CA1)', grid('Carousel', [
        [hint('label', 'Destinations')], [hint('previousLabel', 'Previous slide')], [hint('nextLabel', 'Next slide')],
        slide('promo-hkt.webp', 'Phuket', rt('**Phuket**', 'Beaches.')),
        slide('promo-nrt.webp', 'Tokyo', rt('**Tokyo**', 'City lights.')),
        slide('promo-han.webp', 'Hanoi', rt('**Hanoi**', 'Lakes.')),
        slide('promo-isb.webp', 'Islamabad', rt('**Islamabad**', 'Mountains.')),
        slide('promo-bom.webp', 'Mumbai', rt('**Mumbai**', 'Sea front.')),
    ])],
    ['## Carousel, settings empty (CA2)', grid('Carousel', [
        [''], [''], [''],
        slide('promo-hkt.webp', 'Phuket', rt('**Phuket**')),
        slide('promo-nrt.webp', 'Tokyo', rt('**Tokyo**')),
        slide('promo-han.webp', 'Hanoi', rt('**Hanoi**')),
    ])],
    ['## Carousel hero (CA3)', grid('Carousel (hero)', [
        [hint('label', 'Offers')], [hint('previousLabel', 'Previous offer')], [hint('nextLabel', 'Next offer')],
        slide('promo-book.webp', 'Plane wing', rt('## Explore the world with us', '**[Book a Flight](/en-th/book/book-flight)**'), 'promo-rop.webp'),
        slide('promo-travel-class.webp', 'Cabin', rt('## Explore our classes')),
    ])],
    meta=[('title', 'Pilot: Accordion, Tabs, Carousel')],
)

# --- table ------------------------------------------------------------------------------------
cells = lambda n, values: [f'table-col-{n}'] + [hint(f'column{i + 1}', v) for i, v in enumerate(values)]
page(
    'table',
    ['## Checked baggage (TA1)', grid('Table', [
        ['table-2'],
        cells(2, ['Categories', 'Maximum combined weight']),
        cells(2, ['Royal Silk Class', '40 kg (88 pounds)']),
        cells(2, ['Economy Plus', '35 kg (77 pounds)']),
        cells(2, ['Economy Class', '23 - 30 kg (55 - 66 pounds)*']),
    ]), '*Saver Class 25 kg before 01 APR 25.'],
    ['## Piece concept (TA2)', grid('Table', [
        ['table-4'],
        cells(4, ['Class', 'Pieces', 'Weight per piece', 'Size per piece']),
        cells(4, ['Royal First', '2', '32 kg (70 lb)', '158 cm (62 in)']),
        cells(4, ['Economy', '2', '23 kg (50 lb)', '158 cm (62 in)']),
    ])],
    ['## Mileage accrual, group rows (TA3)', grid('Table (left)', [
        ['table-2'],
        cells(2, ['Booking class', 'Percentage of actual miles flown']),
        cells(2, ['Business Class', '']),
        cells(2, ['A, C, D, Z', '125%']),
        cells(2, ['Economy Class', '']),
        cells(2, ['Y, B, M', '100%']),
    ])],
    ['## Five columns (TA4)', grid('Table', [
        ['table-5'],
        cells(5, ['Zone', 'First bag', 'Second bag', 'Third bag', 'Notes']),
        cells(5, ['1', 'THB 1,000', 'THB 1,500', 'THB 2,000', 'Asia']),
    ])],
    ['## Six columns (TA4)', grid('Table (header-column, plain)', [
        ['table-6'],
        cells(6, ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
        cells(6, ['TG 600', 'Yes', 'No', 'Yes', 'No', 'Yes']),
    ])],
    meta=[('title', 'Pilot: Table')],
)

# --- listing and offers -----------------------------------------------------------------------
for i, (title, category, date, image) in enumerate([
    ('Fly to Tokyo', 'Special Offers', '2026-10-01', 'promo-nrt.webp'),
    ('Phuket getaway', 'Special Offers', '2026-09-15', 'promo-hkt.webp'),
    ('Partner hotel deal', 'Partner Privileges', '2026-10-10', 'promo-han.webp'),
], start=1):
    page(f'offers/offer-{i}', f"""
    # {title}

    Pilot offer page {i} for the Listing tests.
    """, meta=[('title', title), ('description', f'{title} for the Listing pilot.'), ('image', f'{DAM}/{image}'),
               ('category', category), ('date', date), ('validfrom', '2026-01-01'), ('validto', '2027-12-31')])
page('offers/index', '# Pilot offers', meta=[('title', 'Pilot offers')])
page(
    'listing',
    ['# Offers', '## Two newest (L2: categories empty, limit 2)', grid('Listing', [
        [hint('folder', f'[{SITE}/offers]({SITE}/offers)')], [''], [hint('limit', '2')],
    ])],
    ['## Featured with filter (L3)', grid('Listing (featured, filter)', [
        [hint('folder', f'[{SITE}/offers]({SITE}/offers)')], [''], [''],
    ])],
    meta=[('title', 'Pilot: Listing')],
)

# --- search ------------------------------------------------------------------------------------
page('search', ['# Search', grid('Search', [
    [hint('label', 'Search')], [''],
    [hint('resultsMessage', '{count} result for "{query}" | {count} results for "{query}"')],
    [hint('noResultsMessage', 'No results for "{query}". Try another word.')],
])], meta=[('title', 'Pilot: Search')])

# --- integrations and default content -----------------------------------------------------------
fare = [
    ('origins', 'Bangkok (BKK), Chiang Mai (CNX)'), ('source', '/en-th/pilot/fares.json'), ('journey', 'ROUND_TRIP'),
    ('limit', ''), ('link', ''), ('heading', 'Trending destinations from'), ('from', 'From'), ('to', 'To'),
    ('price', 'From {currency} {price}*'), ('book', 'Book now'), ('roundtrip', 'Round trip'), ('oneway', 'One way'),
    ('previous', 'Previous destinations'), ('next', 'Next destinations'),
]
page(
    'integrations',
    ['## Booking widget (B1: destinations empty)', grid('Booking Widget', [[hint('origin', 'BKK')], ['']])],
    ['## Airports (LO1: default location empty)', grid('Locator (airports)', [
        [hint('source', '/en-th/pilot/airports.json')], [''], [hint('labels', 'Select location | City / Country')],
    ])],
    ['## Offices (LO2)', grid('Locator (offices)', [
        [hint('source', '/en-th/pilot/offices.json')], [hint('defaultLocation', 'BANGKOK (Suvarnabhumi)')],
        [hint('labels', 'Select location | Country / Region | City | Office')],
    ])],
    [grid('Fare Widget', [[k, v] for k, v in fare]), '*Fares displayed have been collected within the last 48hrs and may no longer be available at time of booking.'],
    ['## Fragment (FR1)', grid('Fragment', [[hint('reference', f'[{SITE}/fragment]({SITE}/fragment)')]])],
    ['## Default content (D1, D3)', '**[Primary button](/en-th/book/book-flight)**', '*[Secondary button](/en-th/book/my-trips)*',
     '***[Accent button](/en-th/sign-up)***', 'Search icon: :search:'],
    meta=[('title', 'Pilot: Integrations and default content')],
)
page('fragment', '## Fragment content', 'This text comes from the pilot fragment page.', meta=[('title', 'Pilot fragment')])
print('written')
