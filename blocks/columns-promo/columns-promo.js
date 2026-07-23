import { decorateDropdown } from '../../scripts/scripts.js';

export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-promo-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-promo-img-col');
        }
      }
    });
  });

  // a plain list of links becomes a full-width dropdown, matching the source design
  block.querySelectorAll('ul').forEach((list) => {
    decorateDropdown(list, 'Select a product');
  });
}
