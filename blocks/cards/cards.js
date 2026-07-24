import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      // an "image" column is a single <p> whose only content is the
      // picture — not just any column that happens to contain one
      // (e.g. a title with a trailing icon has a picture too, but is body text)
      const onlyChild = div.children.length === 1 ? div.firstElementChild : null;
      const isImageOnly = onlyChild?.children.length === 1 && onlyChild.firstElementChild.tagName === 'PICTURE';
      if (isImageOnly) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.replaceChildren(ul);
}
