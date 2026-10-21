/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the "content-page" template: Generic content page (thai-generic): banner, text, tables, accordions, tabs, image and text rows.
 * Generated from tools/importer/page-templates.json; parsers and transformers do the work.
 */
import heroParser from './parsers/hero.js';
import tabsAnchorParser from './parsers/tabs-anchor.js';
import cardsOverlayParser from './parsers/cards-overlay.js';
import cardsParser from './parsers/cards.js';
import carouselParser from './parsers/carousel.js';
import tableParser from './parsers/table.js';
import accordionParser from './parsers/accordion.js';
import columnsParser from './parsers/columns.js';
import thaiairwaysMetadataTransformer from './transformers/thaiairways-metadata.js';
import thaiairwaysSectionsTransformer from './transformers/thaiairways-sections.js';
import thaiairwaysCleanupTransformer from './transformers/thaiairways-cleanup.js';

const PAGE_TEMPLATE = {
  "name": "content-page",
  "description": "Generic content page (thai-generic): banner, text, tables, accordions, tabs, image and text rows",
  "urls": [
    "https://www.thaiairways.com/en-th/content/about-royal-orchid-plus/",
    "https://www.thaiairways.com/en-th/content/status-and-benefits/",
    "https://www.thaiairways.com/en-th/content/spend-miles/flight-upgrades/",
    "https://www.thaiairways.com/en-th/content/mice/",
    "https://www.thaiairways.com/en-th/content/in-flight-experience/",
    "https://www.thaiairways.com/en-th/content/charter-flights/",
    "https://www.thaiairways.com/en-th/content/sustainable-development/",
    "https://www.thaiairways.com/en-th/content/procurement-supplier/",
    "https://www.thaiairways.com/en-th/content/help/",
    "https://www.thaiairways.com/en-th/content/junior-sky-explorer/",
    "https://www.thaiairways.com/en-th/content/more-services/hotels/",
    "https://www.thaiairways.com/en-th/content/baggage/restricted-baggage/",
    "https://www.thaiairways.com/en-th/content/good-corporate-governance/roles-and-responsibilities-of-the-company-secretary/",
    "https://www.thaiairways.com/en-th/content/in-flight-experience/in-flight-duty-free/",
    "https://www.thaiairways.com/en-th/content/special-assistance/advice-for-elderly-passenger/"
  ],
  "representativeUrl": "https://www.thaiairways.com/en-th/content/charter-flights/",
  "extraRepresentatives": [
    "https://www.thaiairways.com/en-th/content/baggage/restricted-baggage/"
  ],
  "urlPattern": "/en-th/content/*",
  "blocks": [
    {
      "name": "hero",
      "instances": [
        ".banner"
      ]
    },
    {
      "name": "tabs-anchor",
      "instances": [
        ".multitabscrolling"
      ]
    },
    {
      "name": "cards-overlay",
      "instances": [
        ".carouselwithslider"
      ]
    },
    {
      "name": "cards",
      "instances": [
        ".highlightsBenefits .info-group",
        ".imagecardwithdescription",
        ".imageWithContent"
      ]
    },
    {
      "name": "carousel",
      "instances": [
        ".imagetitlewithcarousel"
      ]
    },
    {
      "name": "table",
      "instances": [
        ".generictable",
        ".information table",
        ".flightupgrades table"
      ]
    },
    {
      "name": "accordion",
      "instances": [
        ".multiAccordion"
      ]
    },
    {
      "name": "columns",
      "instances": [
        ".leftImageRightContent"
      ]
    }
  ],
  "sections": [
    {
      "id": "section-1",
      "name": "Page banner",
      "selector": [
        ".banner"
      ],
      "style": null,
      "blocks": [
        "hero"
      ],
      "defaultContent": []
    },
    {
      "id": "section-2",
      "name": "Jump-link bar",
      "selector": [
        ".multitabscrolling",
        "#passanger-charter > div.multitabscrolling"
      ],
      "style": null,
      "blocks": [
        "tabs-anchor"
      ],
      "defaultContent": []
    },
    {
      "id": "section-3",
      "name": "Anchor section 1 (About passenger charter)",
      "selector": [
        "#section1"
      ],
      "style": null,
      "blocks": [
        "cards-overlay"
      ],
      "defaultContent": [
        "#section1 .information",
        "#section1 .buttonComponent"
      ]
    },
    {
      "id": "section-4",
      "name": "Anchor section 2 (Why passenger charter ?)",
      "selector": [
        "#section2"
      ],
      "style": null,
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        "#section2 .highlightsBenefits p.heading-title"
      ]
    },
    {
      "id": "section-5",
      "name": "Anchor section 3 (Passenger charter aircraft)",
      "selector": [
        "#section3"
      ],
      "style": null,
      "blocks": [
        "carousel"
      ],
      "defaultContent": [
        "#section3 .information"
      ]
    },
    {
      "id": "section-6",
      "name": "Body content (Smart baggage)",
      "selector": [
        "div.root.container.responsivegrid > div.cmp-container > div.aem-Grid > div.responsivegrid.aem-GridColumn > div.aem-Grid > div.information"
      ],
      "style": null,
      "blocks": [
        "cards",
        "table",
        "accordion",
        "columns"
      ],
      "defaultContent": [
        "div.root.container.responsivegrid > div.cmp-container > div.aem-Grid > div.responsivegrid.aem-GridColumn > div.aem-Grid > div.information",
        "div.root.container.responsivegrid > div.cmp-container > div.aem-Grid > div.responsivegrid.aem-GridColumn > div.aem-Grid > div.highlightsBenefits p.heading-title"
      ]
    }
  ],
  "sectionMetadata": {
    "section-3": {
      "tabLabel": "About passenger charter"
    },
    "section-4": {
      "tabLabel": "Why passenger charter ?"
    },
    "section-5": {
      "tabLabel": "Passenger charter aircraft"
    }
  },
  "variantInfo": {
    "hero": {
      "baseBlock": "hero",
      "options": []
    },
    "tabs-anchor": {
      "baseBlock": "tabs",
      "options": [
        "anchor"
      ]
    },
    "cards-overlay": {
      "baseBlock": "cards",
      "options": [
        "overlay"
      ]
    },
    "cards": {
      "baseBlock": "cards",
      "options": [],
      "notes": [
        "offer-detail: consecutive .imagecardwithdescription siblings merge into one cards block",
        ".imageWithContent: one card per .card-content (logo image, h3 title, text, the card link as a text link)"
      ]
    },
    "carousel": {
      "baseBlock": "carousel",
      "options": []
    },
    "table": {
      "baseBlock": "table",
      "options": [],
      "notes": [
        "partner-detail: .generictable holds several source <table>s that form one logical table (one block, group rows)"
      ]
    },
    "accordion": {
      "baseBlock": "accordion",
      "options": []
    },
    "columns": {
      "baseBlock": "columns",
      "options": [],
      "notes": [
        ".leftImageRightContent: text column (label \u2192 h2, text, link/button) and image column; one row, 2 columns"
      ]
    }
  }
};

const parsers = {
  'hero': heroParser,
  'tabs-anchor': tabsAnchorParser,
  'cards-overlay': cardsOverlayParser,
  'cards': cardsParser,
  'carousel': carouselParser,
  'table': tableParser,
  'accordion': accordionParser,
  'columns': columnsParser,
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
