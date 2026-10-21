/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the "offer-detail" template: Offer or promotion detail: title with image, offer text and terms, booking widget.
 * Generated from tools/importer/page-templates.json; parsers and transformers do the work.
 */
import tableLeftParser from './parsers/table-left.js';
import accordionParser from './parsers/accordion.js';
import cardsParser from './parsers/cards.js';
import bookingWidgetParser from './parsers/booking-widget.js';
import heroParser from './parsers/hero.js';
import tableParser from './parsers/table.js';
import thaiairwaysMetadataTransformer from './transformers/thaiairways-metadata.js';
import thaiairwaysSectionsTransformer from './transformers/thaiairways-sections.js';
import thaiairwaysCleanupTransformer from './transformers/thaiairways-cleanup.js';

const PAGE_TEMPLATE = {
  "name": "offer-detail",
  "description": "Offer or promotion detail: title with image, offer text and terms, booking widget",
  "urls": [
    "https://www.thaiairways.com/en-th/content/offers-Promotions/special-offers/thaiairwaysxsentosa/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/royal-orchid-plus/Centara-Maldives-1000Miles/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/partnerPrivileges/co-promotion-with-bangkok-bank-sep-nov26/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/special-offers/religious-fare-international/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/royal-orchid-plus/KTC-ROYAL-ORCHID-PLUS-Credit-Card/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/partnerPrivileges/RKTF2026-SCB-CARDX/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/special-offers/fly-with-love/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/royal-orchid-plus/Thipsamai-Flying-Padthai/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/partnerPrivileges/RKTF2026-TTB/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/special-offers/book-now-fly-later/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/royal-orchid-plus/ROP-CentaraThe1-1K-Miles/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/partnerPrivileges/fly-to-asia-australia-and-europe-with-the-1-credit-card/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/special-offers/fly-to-dom-2026/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/royal-orchid-plus/THAI-Junior-Sky-Explorers-Play-chef/",
    "https://www.thaiairways.com/en-th/content/offers-Promotions/partnerPrivileges/co-promotion-with-bangkok-bank/"
  ],
  "representativeUrl": "https://www.thaiairways.com/en-th/content/offers-Promotions/partnerPrivileges/co-promotion-with-bangkok-bank-sep-nov26/",
  "extraRepresentatives": [
    "https://www.thaiairways.com/en-th/content/offers-Promotions/special-offers/thaiairwaysxsentosa/"
  ],
  "urlPattern": "/en-th/content/offers-Promotions/*/*",
  "blocks": [
    {
      "name": "table-left",
      "instances": [
        ".tableComponent table"
      ]
    },
    {
      "name": "accordion",
      "instances": [
        ".multiAccordion"
      ]
    },
    {
      "name": "cards",
      "instances": [
        ".imagecardwithdescription"
      ]
    },
    {
      "name": "booking-widget",
      "instances": [
        ".offers-bookingwidget-1"
      ]
    },
    {
      "name": "hero",
      "instances": [
        ".banner"
      ]
    },
    {
      "name": "table",
      "instances": [
        ".generictable",
        ".information table"
      ]
    }
  ],
  "sections": [
    {
      "id": "section-1",
      "name": "Offer content",
      "selector": [
        "div.root.container.responsivegrid > div.cmp-container > div.aem-Grid > div.responsivegrid.aem-GridColumn",
        "body > div.root.container.responsivegrid > div.cmp-container > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.responsivegrid.aem-GridColumn.aem-GridColumn--default--12"
      ],
      "style": null,
      "blocks": [
        "table-left",
        "accordion",
        "cards",
        "booking-widget",
        "hero",
        "table"
      ],
      "defaultContent": [
        ".titlewithimage",
        "div.root.container.responsivegrid > div.cmp-container > div.aem-Grid > div.responsivegrid.aem-GridColumn > div.aem-Grid > div.information",
        ".tableComponent caption"
      ]
    }
  ],
  "variantInfo": {
    "table-left": {
      "baseBlock": "table",
      "options": [
        "left"
      ]
    },
    "accordion": {
      "baseBlock": "accordion",
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
    "booking-widget": {
      "baseBlock": "booking-widget",
      "options": []
    },
    "hero": {
      "baseBlock": "hero",
      "options": []
    },
    "table": {
      "baseBlock": "table",
      "options": [],
      "notes": [
        "partner-detail: .generictable holds several source <table>s that form one logical table (one block, group rows)"
      ]
    }
  }
};

const parsers = {
  'table-left': tableLeftParser,
  'accordion': accordionParser,
  'cards': cardsParser,
  'booking-widget': bookingWidgetParser,
  'hero': heroParser,
  'table': tableParser,
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
