/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the "landing-page" template: Section landing and category pages: banner, intro, card grids or tabbed lists.
 * Generated from tools/importer/page-templates.json; parsers and transformers do the work.
 */
import cardsOverlayParser from './parsers/cards-overlay.js';
import tabsParser from './parsers/tabs.js';
import listingParser from './parsers/listing.js';
import heroParser from './parsers/hero.js';
import cardsParser from './parsers/cards.js';
import cardsLogosParser from './parsers/cards-logos.js';
import tableParser from './parsers/table.js';
import listingNewsParser from './parsers/listing-news.js';
import thaiairwaysMetadataTransformer from './transformers/thaiairways-metadata.js';
import thaiairwaysSectionsTransformer from './transformers/thaiairways-sections.js';
import thaiairwaysCleanupTransformer from './transformers/thaiairways-cleanup.js';

const PAGE_TEMPLATE = {
  "name": "landing-page",
  "description": "Section landing and category pages: banner, intro, card grids or tabbed lists",
  "urls": [
    "https://www.thaiairways.com/en-th/content/offers-Promotions/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/special-offers/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/partnerPrivileges/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/royal-orchid-plus/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/",
    "https://www.thaiairways.com/en-th/content/earn-miles/",
    "https://www.thaiairways.com/en-th/content/earn-miles/star-alliance-airlines/",
    "https://www.thaiairways.com/en-th/content/earn-miles/credit-card-partners/",
    "https://www.thaiairways.com/en-th/content/earn-miles/car-rental-partners/",
    "https://www.thaiairways.com/en-th/content/earn-miles/hotelpartners/",
    "https://www.thaiairways.com/en-th/content/earn-miles/online-service-partners/",
    "https://www.thaiairways.com/en-th/content/earn-miles/lifestyle-promotion-partners/",
    "https://www.thaiairways.com/en-th/content/earn-miles/thai/",
    "https://www.thaiairways.com/en-th/content/more-services/",
    "https://www.thaiairways.com/en-th/content/special-assistance/"
  ],
  "representativeUrl": "https://www.thaiairways.com/en-th/content/earn-miles/",
  "extraRepresentatives": [
    "https://www.thaiairways.com/en-th/content/offers-Promotions/"
  ],
  "urlPattern": "/en-th/content/*",
  "blocks": [
    {
      "name": "cards-overlay",
      "instances": [
        ".moreService .cms-card-container"
      ]
    },
    {
      "name": "tabs",
      "instances": [
        ".offers .navigation-section"
      ]
    },
    {
      "name": "listing",
      "instances": [
        "#offerContainer"
      ]
    },
    {
      "name": "hero",
      "instances": [
        ".banner"
      ]
    },
    {
      "name": "cards",
      "instances": [
        ".imageWithContent"
      ]
    },
    {
      "name": "cards-logos",
      "instances": [
        ".heading-multiImage"
      ]
    },
    {
      "name": "table",
      "instances": [
        ".generictable",
        ".information table"
      ]
    },
    {
      "name": "listing-news",
      "instances": [
        ".newsandannouncement"
      ]
    }
  ],
  "sections": [
    {
      "id": "section-1",
      "name": "Overview: title, intro and category cards",
      "selector": [
        ".h1tagseo"
      ],
      "style": null,
      "blocks": [
        "cards-overlay",
        "hero",
        "cards",
        "cards-logos",
        "table",
        "listing-news"
      ],
      "defaultContent": [
        ".h1tagseo h1.head-title",
        "div.root.container.responsivegrid > div.cmp-container > div.aem-Grid > div.responsivegrid.aem-GridColumn > div.aem-Grid > div.information .content"
      ]
    },
    {
      "id": "section-2",
      "name": "Category tab bar",
      "selector": [
        ".offers .navigation-section"
      ],
      "style": null,
      "blocks": [
        "tabs"
      ],
      "defaultContent": []
    },
    {
      "id": "section-3",
      "name": "Tab panel: All Promotions",
      "selector": [
        "#offerContainer",
        ".offers .offer-container"
      ],
      "style": null,
      "blocks": [
        "listing"
      ],
      "defaultContent": []
    },
    {
      "id": "section-4",
      "name": "Tab panel: Special Offers",
      "selector": [
        "#offerContainer > a.filter-specialOffers",
        ".offers .offer-container > a.filter-specialOffers"
      ],
      "style": null,
      "blocks": [
        "listing"
      ],
      "defaultContent": []
    },
    {
      "id": "section-5",
      "name": "Tab panel: Partners",
      "selector": [
        "#offerContainer > a.filter-partners",
        ".offers .offer-container > a.filter-partners"
      ],
      "style": null,
      "blocks": [
        "listing"
      ],
      "defaultContent": []
    },
    {
      "id": "section-6",
      "name": "Tab panel: Royal Orchid Plus",
      "selector": [
        "#offerContainer > a.filter-rop",
        ".offers .offer-container > a.filter-rop"
      ],
      "style": null,
      "blocks": [
        "listing"
      ],
      "defaultContent": []
    },
    {
      "id": "section-7",
      "name": "Tab panel: Royal Orchid Holidays",
      "selector": [
        "#offerContainer > a.filter-roh",
        ".offers .offer-container > a.filter-roh"
      ],
      "style": null,
      "blocks": [
        "listing"
      ],
      "defaultContent": []
    }
  ],
  "sectionMetadata": {
    "section-3": {
      "tabLabel": "All Promotions"
    },
    "section-4": {
      "tabLabel": "Special Offers"
    },
    "section-5": {
      "tabLabel": "Partners"
    },
    "section-6": {
      "tabLabel": "Royal Orchid Plus"
    },
    "section-7": {
      "tabLabel": "Royal Orchid Holidays"
    }
  },
  "variantInfo": {
    "cards-overlay": {
      "baseBlock": "cards",
      "options": [
        "overlay"
      ]
    },
    "tabs": {
      "baseBlock": "tabs",
      "options": []
    },
    "listing": {
      "baseBlock": "listing",
      "options": [],
      "notes": [
        "landing-page: the single .offer-container yields one listing block per tab panel section (categories = tabLabel, empty for All Promotions)"
      ]
    },
    "hero": {
      "baseBlock": "hero",
      "options": []
    },
    "cards": {
      "baseBlock": "cards",
      "options": [],
      "notes": [
        "offer-detail: consecutive .imagecardwithdescription siblings merge into one cards block",
        ".imageWithContent: one card per .card-content (logo image, h3 title, text, the card link as a text link)"
      ]
    },
    "cards-logos": {
      "baseBlock": "cards",
      "options": [
        "logos"
      ]
    },
    "table": {
      "baseBlock": "table",
      "options": [],
      "notes": [
        "partner-detail: .generictable holds several source <table>s that form one logical table (one block, group rows)"
      ]
    },
    "listing-news": {
      "baseBlock": "listing",
      "options": [
        "filter"
      ],
      "notes": [
        "news landing: one listing over the news folder; the category filter replaces the All/News/Announcements tabs"
      ]
    }
  }
};

const parsers = {
  'cards-overlay': cardsOverlayParser,
  'tabs': tabsParser,
  'listing': listingParser,
  'hero': heroParser,
  'cards': cardsParser,
  'cards-logos': cardsLogosParser,
  'table': tableParser,
  'listing-news': listingNewsParser,
};

// metadata reads the untouched source DOM, so it runs first; cleanup runs last
const transformers = [thaiairwaysMetadataTransformer, thaiairwaysSectionsTransformer, thaiairwaysCleanupTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); }
    catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    // standard Metadata block first: the metadata transformer adds its rows to it in afterTransform
    main.appendChild(document.createElement('hr'));
    WebImporter.rules.createMetadata(main, document);

    executeTransformers('afterTransform', main, payload);

    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
