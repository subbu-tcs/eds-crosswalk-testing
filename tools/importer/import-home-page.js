/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the "home-page" template: the en-th home page, a React app on the source.
 * Generated from tools/importer/page-templates.json; parsers and transformers do the work.
 */
import homeCarouselParser from './parsers/home-carousel.js';
import homeBookingParser from './parsers/home-booking.js';
import homeServicesParser from './parsers/home-services.js';
import homeListingParser from './parsers/home-listing.js';
import homeFaresParser from './parsers/home-fares.js';
import homeRopParser from './parsers/home-rop.js';
import thaiairwaysMetadataTransformer from './transformers/thaiairways-metadata.js';
import thaiairwaysHomeTransformer from './transformers/thaiairways-home.js';
import thaiairwaysSectionsTransformer from './transformers/thaiairways-sections.js';
import thaiairwaysCleanupTransformer from './transformers/thaiairways-cleanup.js';

const PAGE_TEMPLATE = {
  "name": "home-page",
  "description": "Home page (a React app on the source): sections recognised by thaiairways-home.js; carousel and services from the content feeds embedded by tools/importer/home-feeds.mjs",
  "urls": [
    "https://www.thaiairways.com/en-th/"
  ],
  "representativeUrl": "https://www.thaiairways.com/en-th/",
  "blocks": [
    {
      "name": "home-carousel",
      "instances": [
        "[data-home=\"carousel\"]"
      ]
    },
    {
      "name": "home-booking",
      "instances": [
        "[data-home=\"booking\"]"
      ]
    },
    {
      "name": "home-services",
      "instances": [
        "[data-home=\"services\"]"
      ]
    },
    {
      "name": "home-listing",
      "instances": [
        "[data-home=\"offers\"]",
        "[data-home=\"partners\"]",
        "[data-home=\"news\"]"
      ]
    },
    {
      "name": "home-fares",
      "instances": [
        "[data-home=\"fares\"]"
      ]
    },
    {
      "name": "home-rop",
      "instances": [
        "[data-home=\"rop\"]"
      ]
    }
  ],
  "urlPattern": "/en-th/",
  "sections": [
    {
      "id": "section-1",
      "name": "carousel",
      "selector": [
        "[data-home=\"carousel\"]"
      ],
      "style": null,
      "blocks": [
        "home-carousel"
      ],
      "defaultContent": []
    },
    {
      "id": "section-2",
      "name": "booking",
      "selector": [
        "[data-home=\"booking\"]"
      ],
      "style": null,
      "blocks": [
        "home-booking"
      ],
      "defaultContent": []
    },
    {
      "id": "section-3",
      "name": "services",
      "selector": [
        "[data-home=\"services\"]"
      ],
      "style": null,
      "blocks": [
        "home-services"
      ],
      "defaultContent": []
    },
    {
      "id": "section-4",
      "name": "offers",
      "selector": [
        "[data-home=\"offers\"]"
      ],
      "style": null,
      "blocks": [
        "home-listing"
      ],
      "defaultContent": []
    },
    {
      "id": "section-5",
      "name": "partners",
      "selector": [
        "[data-home=\"partners\"]"
      ],
      "style": null,
      "blocks": [
        "home-listing"
      ],
      "defaultContent": []
    },
    {
      "id": "section-6",
      "name": "fares",
      "selector": [
        "[data-home=\"fares\"]"
      ],
      "style": null,
      "blocks": [
        "home-fares"
      ],
      "defaultContent": []
    },
    {
      "id": "section-7",
      "name": "rop",
      "selector": [
        "[data-home=\"rop\"]"
      ],
      "style": "dark, warm",
      "blocks": [
        "home-rop"
      ],
      "defaultContent": []
    },
    {
      "id": "section-8",
      "name": "news",
      "selector": [
        "[data-home=\"news\"]"
      ],
      "style": null,
      "blocks": [
        "home-listing"
      ],
      "defaultContent": []
    }
  ],
  "variantInfo": {
    "home-carousel": {
      "baseBlock": "carousel",
      "options": [
        "hero"
      ]
    },
    "home-booking": {
      "baseBlock": "booking-widget",
      "options": [
        "promo-code"
      ]
    },
    "home-services": {
      "baseBlock": "accordion",
      "options": [
        "inline"
      ]
    },
    "home-listing": {
      "baseBlock": "listing",
      "options": [
        "featured"
      ],
      "notes": [
        "offers and news featured; partners plain"
      ]
    },
    "home-fares": {
      "baseBlock": "fare-widget",
      "options": []
    },
    "home-rop": {
      "baseBlock": "columns",
      "options": [
        "middle",
        "flush"
      ]
    }
  }
};

const parsers = {
  'home-carousel': homeCarouselParser,
  'home-booking': homeBookingParser,
  'home-services': homeServicesParser,
  'home-listing': homeListingParser,
  'home-fares': homeFaresParser,
  'home-rop': homeRopParser,
};

// metadata reads the untouched source DOM, so it runs first; the home transformer marks the
// sections the section and block selectors use; cleanup runs last
const transformers = [thaiairwaysMetadataTransformer, thaiairwaysHomeTransformer, thaiairwaysSectionsTransformer, thaiairwaysCleanupTransformer];

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
