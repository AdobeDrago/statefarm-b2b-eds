/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import columnsAuthParser from './parsers/columns-auth.js';
import cardsServiceParser from './parsers/cards-service.js';
import columnsPromoParser from './parsers/columns-promo.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/statefarm-cleanup.js';
import sectionsTransformer from './transformers/statefarm-sections.js';

// PARSER REGISTRY
const parsers = {
  'columns-auth': columnsAuthParser,
  'cards-service': cardsServiceParser,
  'columns-promo': columnsPromoParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'b2b-portal-home',
  description: 'State Farm B2B portal home page with header (utility links + megamenu), hero/authentication section, service cards, insurance product section, and footer starting at the red slogan banner.',
  urls: [
    'https://b2b.statefarm.com/b2b-content',
  ],
  blocks: [
    {
      name: 'columns-auth',
      instances: [
        '#b2b-edge-content .authentication-container:not(.-oneX-d-none) .htmlComponent > .-oneX-row',
      ],
    },
    {
      name: 'cards-service',
      instances: [
        '#b2b-edge-content .gridComponent.parsys',
      ],
    },
    {
      name: 'columns-promo',
      instances: [
        '#b2b-edge-content #xd-container-9bd333c99c',
      ],
    },
  ],
  sections: [
    {
      id: 'section-2-hero',
      name: 'Hero / Authentication',
      selector: '#b2b-edge-content .authentication-container:not(.-oneX-d-none) .htmlComponent > .-oneX-row',
      style: null,
      blocks: ['columns-auth'],
      defaultContent: [],
    },
    {
      id: 'section-3-cards',
      name: 'Service Cards Grid',
      selector: '#b2b-edge-content .gridComponent.parsys',
      style: null,
      blocks: ['cards-service'],
      defaultContent: [],
    },
    {
      id: 'section-4-promo',
      name: 'Insurance Product Section',
      selector: '#b2b-edge-content #xd-container-9bd333c99c',
      style: null,
      blocks: ['columns-promo'],
      defaultContent: [],
    },
  ],
};

// TRANSFORMER REGISTRY - cleanup runs first, sections after (in each hook)
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Array of block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. Execute beforeTransform transformers (scope to #b2b-edge-content, cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return; // Already replaced by earlier parser
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Execute afterTransform transformers (final cleanup + section breaks)
    executeTransformers('afterTransform', main, payload);

    // 5. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''),
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
