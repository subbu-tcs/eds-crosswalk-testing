/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the "partner-detail" template: Mileage partner detail (Star Alliance airline, credit card, lifestyle): banner, text, earning tables.
 * Generated from tools/importer/page-templates.json; parsers and transformers do the work.
 */
import heroParser from './parsers/hero.js';
import tableParser from './parsers/table.js';
import cardsLogosParser from './parsers/cards-logos.js';
import columnsParser from './parsers/columns.js';
import accordionParser from './parsers/accordion.js';
import thaiairwaysMetadataTransformer from './transformers/thaiairways-metadata.js';
import thaiairwaysSectionsTransformer from './transformers/thaiairways-sections.js';
import thaiairwaysCleanupTransformer from './transformers/thaiairways-cleanup.js';

const PAGE_TEMPLATE = {
  "name": "partner-detail",
  "description": "Mileage partner detail (Star Alliance airline, credit card, lifestyle): banner, text, earning tables",
  "urls": [
    "https://www.thaiairways.com/en-th/content/earn-miles/star-alliance-airlines/eva-air-br/",
    "https://www.thaiairways.com/en-th/content/earn-miles/credit-card-partners/thai-american-express-platinum-credit-card/",
    "https://www.thaiairways.com/en-th/content/earn-miles/lifestyle-promotion-partners/miles-with-dining/",
    "https://www.thaiairways.com/en-th/content/earn-miles/star-alliance-airlines/lot-polishairlines-lo/",
    "https://www.thaiairways.com/en-th/content/earn-miles/credit-card-partners/aeon/",
    "https://www.thaiairways.com/en-th/content/earn-miles/star-alliance-airlines/united-airlines-ua/",
    "https://www.thaiairways.com/en-th/content/earn-miles/credit-card-partners/tmb-thanachart-ttb/",
    "https://www.thaiairways.com/en-th/content/earn-miles/star-alliance-airlines/brussels-airlines-sn/",
    "https://www.thaiairways.com/en-th/content/earn-miles/credit-card-partners/diners-club-international/",
    "https://www.thaiairways.com/en-th/content/earn-miles/star-alliance-airlines/air-china-ca/",
    "https://www.thaiairways.com/en-th/content/earn-miles/credit-card-partners/k-credit-card/",
    "https://www.thaiairways.com/en-th/content/earn-miles/star-alliance-airlines/air-new-zealand-nz/",
    "https://www.thaiairways.com/en-th/content/earn-miles/credit-card-partners/sumitomo-mitsui/",
    "https://www.thaiairways.com/en-th/content/earn-miles/star-alliance-airlines/air-india-ai/",
    "https://www.thaiairways.com/en-th/content/earn-miles/credit-card-partners/ktc-royal-orchid-plus/"
  ],
  "representativeUrl": "https://www.thaiairways.com/en-th/content/earn-miles/star-alliance-airlines/united-airlines-ua/",
  "extraRepresentatives": [
    "https://www.thaiairways.com/en-th/content/earn-miles/credit-card-partners/aeon/"
  ],
  "urlPattern": "/en-th/content/earn-miles/*/*",
  "blocks": [
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
    },
    {
      "name": "cards-logos",
      "instances": [
        ".experiencefragment .heading-multiImage"
      ]
    },
    {
      "name": "columns",
      "instances": [
        ".leftImageRightContent"
      ]
    },
    {
      "name": "accordion",
      "instances": [
        ".multiAccordion"
      ]
    }
  ],
  "sections": [
    {
      "id": "section-1",
      "name": "Partner content",
      "selector": [
        "div.root.container.responsivegrid > div.cmp-container > div.aem-Grid > div.responsivegrid.aem-GridColumn",
        "body > div.root.container.responsivegrid > div.cmp-container > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.responsivegrid.aem-GridColumn.aem-GridColumn--default--12"
      ],
      "style": null,
      "blocks": [
        "hero",
        "table",
        "cards-logos",
        "columns",
        "accordion"
      ],
      "defaultContent": [
        "div.root.container.responsivegrid > div.cmp-container > div.aem-Grid > div.responsivegrid.aem-GridColumn > div.aem-Grid > div.information",
        ".buttonComponent",
        ".experiencefragment .information"
      ]
    }
  ],
  "variantInfo": {
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
    },
    "cards-logos": {
      "baseBlock": "cards",
      "options": [
        "logos"
      ]
    },
    "columns": {
      "baseBlock": "columns",
      "options": [],
      "notes": [
        ".leftImageRightContent: text column (label \u2192 h2, text, link/button) and image column; one row, 2 columns"
      ]
    },
    "accordion": {
      "baseBlock": "accordion",
      "options": []
    }
  }
};

const parsers = {
  'hero': heroParser,
  'table': tableParser,
  'cards-logos': cardsLogosParser,
  'columns': columnsParser,
  'accordion': accordionParser,
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
