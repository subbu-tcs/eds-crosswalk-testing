/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the "news-article" template: News and announcement article: headline, date, article body.
 * Generated from tools/importer/page-templates.json; parsers and transformers do the work.
 */
import tableParser from './parsers/table.js';
import thaiairwaysMetadataTransformer from './transformers/thaiairways-metadata.js';
import thaiairwaysSectionsTransformer from './transformers/thaiairways-sections.js';
import thaiairwaysCleanupTransformer from './transformers/thaiairways-cleanup.js';

const PAGE_TEMPLATE = {
  "name": "news-article",
  "description": "News and announcement article: headline, date, article body",
  "urls": [
    "https://www.thaiairways.com/en-th/content/news-and-announcements/thai-announces-baggage-policy-for-economy-class/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/thai-vitallife-bumrungrad-healthy-destinations-inflight-wellness/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/thai-airways-unveils-rop-the-new-chapter-begins/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/operational-update/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/thai-airways-celebrates-the-33rd-anniversary-of-royal-orchid-plus/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/thai-reports-operating-results-for-the-first-quarter-of-2026/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/resumes-full-flight/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/skytrax-awards-2024/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/updated-baggage-procedure-for-connections-to-yangon-via-bangkok/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/thai-launches-direct-flights-to-amsterdam/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/thai-hosts-thai-talk/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/thai-airways-cellars-in-the-sky-awards-2026/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/thai-welcomes-its-first-airbus-a321neo/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/introducing-thai-airways-new-distribution-capability/",
    "https://www.thaiairways.com/en-th/content/news-and-announcements/service-fee-travel-agents/"
  ],
  "representativeUrl": "https://www.thaiairways.com/en-th/content/news-and-announcements/service-fee-travel-agents/",
  "extraRepresentatives": [
    "https://www.thaiairways.com/en-th/content/news-and-announcements/operational-update/"
  ],
  "urlPattern": "/en-th/content/news-and-announcements/*",
  "blocks": [
    {
      "name": "table",
      "instances": [
        ".newsannouncementdetails .news-text table"
      ]
    }
  ],
  "sections": [
    {
      "id": "section-1",
      "name": "Article body",
      "selector": [
        "div.root.container.responsivegrid > div.cmp-container > div.aem-Grid > div.responsivegrid.aem-GridColumn",
        "body > div.root.container.responsivegrid > div.cmp-container > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.responsivegrid.aem-GridColumn.aem-GridColumn--default--12"
      ],
      "style": null,
      "blocks": [
        "table"
      ],
      "defaultContent": [
        ".newsannouncementdetails .news-header",
        ".newsannouncementdetails img.news-banner",
        ".newsannouncementdetails .news-text > p",
        ".newsannouncementdetails .news-text > ol"
      ]
    }
  ],
  "variantInfo": {
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
