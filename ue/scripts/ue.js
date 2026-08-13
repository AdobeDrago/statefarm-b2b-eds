/*
 * Universal Editor helpers for blocks that mutate their DOM after decoration.
 * Loaded from scripts/editor-support.js in the AEM Cloud / XWalk authoring context.
 */

import { moveInstrumentation } from './ue-utils.js';

const setupObservers = () => {
  const mutatingBlocks = document.querySelectorAll('div.cards, div.cards-service');
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type !== 'childList' || mutation.target.tagName !== 'DIV') return;

      const type = mutation.target.classList.contains('cards-card-image')
        || mutation.target.classList.contains('cards-service-card-image')
        ? 'cards-image'
        : mutation.target.getAttribute('data-aue-component');

      if (type === 'cards' || type === 'cards-service') {
        // handle card div > li replacements
        if (mutation.addedNodes.length === 1 && mutation.addedNodes[0].tagName === 'UL') {
          const ulEl = mutation.addedNodes[0];
          const removedDivEl = [...mutation.removedNodes].filter((node) => node.tagName === 'DIV');
          removedDivEl.forEach((div, index) => {
            if (index < ulEl.children.length) {
              moveInstrumentation(div, ulEl.children[index]);
            }
          });
        }
      } else if (type === 'cards-image') {
        // handle card-image picture replacements
        const addedPictureEl = [...mutation.addedNodes].filter((node) => node.tagName === 'PICTURE');
        const removedPictureEl = [...mutation.removedNodes].filter((node) => node.tagName === 'PICTURE');
        if (addedPictureEl.length === 1 && removedPictureEl.length === 1) {
          const oldImgEL = removedPictureEl[0].querySelector('img');
          const newImgEl = addedPictureEl[0].querySelector('img');
          if (oldImgEL && newImgEl) {
            moveInstrumentation(oldImgEL, newImgEl);
          }
        }
      }
    });
  });

  mutatingBlocks.forEach((block) => {
    observer.observe(block, { childList: true, subtree: true });
  });
};

const setupUEEventHandlers = () => {
  // For each picture or img element change, clear stale srcsets so the new asset renders
  document.body.addEventListener('aue:content-patch', ({ detail: { patch, request } }) => {
    let element = document.querySelector(`[data-aue-resource="${request.target.resource}"]`);
    if (element && element.getAttribute('data-aue-prop') !== patch.name) {
      element = element.querySelector(`[data-aue-prop='${patch.name}']`);
    }
    if (element?.getAttribute('data-aue-type') !== 'media') return;

    const picture = element.tagName === 'IMG' ? element.closest('picture') : element;
    picture?.querySelectorAll('source').forEach((source) => source.remove());
    picture?.querySelector('img')?.removeAttribute('srcset');
  });
};

export default () => {
  setupObservers();
  setupUEEventHandlers();
};
