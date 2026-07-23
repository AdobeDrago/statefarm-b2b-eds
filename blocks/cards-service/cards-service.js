import { createOptimizedPicture, decorateIcons } from '../../scripts/aem.js';
import { decorateDropdown } from '../../scripts/scripts.js';

const ICON_TOKEN = /^:([a-z0-9-]+):$/i;

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      // an icon cell is a single picture, an already-decorated icon span
      // (scripts.js runs decorateIcons on the whole page before this block's
      // own decoration, so authored `:icon:` tokens are usually already
      // converted to span.icon by the time we get here), or — as a fallback
      // for content that isn't decorated yet — a paragraph holding the token.
      const iconSpan = div.querySelector(':scope > span.icon, :scope > p > span.icon');
      const iconP = [...div.children].find((el) => el.tagName === 'P' && ICON_TOKEN.test(el.textContent.trim()));
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-service-card-image';
      } else if (iconSpan) {
        div.className = 'cards-service-card-image';
      } else if (iconP) {
        const name = iconP.textContent.trim().match(ICON_TOKEN)[1];
        const span = document.createElement('span');
        span.className = `icon icon-${name}`;
        iconP.replaceWith(span);
        div.className = 'cards-service-card-image';
      } else {
        div.className = 'cards-service-card-body';
      }
    });

    // icon + body sit side-by-side in a row; a nested list of links becomes
    // a full-width dropdown strip below that row, matching the source design
    const cardRow = document.createElement('div');
    cardRow.className = 'cards-service-card-row';
    [...li.children].forEach((div) => cardRow.append(div));
    li.append(cardRow);

    const list = cardRow.querySelector('.cards-service-card-body ul');
    if (list) li.append(decorateDropdown(list, 'Select option'));

    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
  decorateIcons(block);
}
