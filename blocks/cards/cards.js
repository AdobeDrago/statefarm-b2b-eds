import { createOptimizedPicture } from '../../scripts/aem.js';
import { isSimulationEnabled } from '../../scripts/auth.js';

// the authored lock badge marking a card whose target needs a B2B login
const LOCK_BADGE = 'img[alt="Login required"], img[src*="../../icons/lock-2.svg"]';

// soft prompts like "Log In to have shop info auto-filled..." or "Log in
// requred to access." — distinct from "No log in required", which starts with "No"
const SOFT_LOGIN_PROMPT = /^log in\b/i;

/**
 * Tags the "login required" badge so it hides once authenticated. The card
 * itself stays visible either way — its target still needs its own real login.
 * @param {Element} block The cards block
 */
function decorateLockedCards(block) {
  block.querySelectorAll(LOCK_BADGE).forEach((img) => {
    // set src to lock icon if alt is "Login required"
    if (img.alt === 'Login required') {
      img.src = '../../icons/lock-2.svg';
    }
    // tag the outermost node — cards.css positions the picture or the bare img,
    // depending on whether createOptimizedPicture wrapped it
    (img.closest('picture') || img).dataset.auth = 'anonymous';
    // the target needs a login in either state, so the hint is unconditional
    const link = img.closest('li')?.querySelector('.cards-card-body p:first-child a[href]');
    if (link) link.title = `${link.textContent.trim()} (login required)`;
  });
}

/**
 * Hides card body copy that only applies to anonymous visitors — text telling
 * them they need to log in for this card's feature.
 * @param {Element} block The cards block
 */
function decorateSoftLoginPrompts(block) {
  if (!isSimulationEnabled()) return;
  block.querySelectorAll('.cards-card-body p').forEach((p) => {
    if (SOFT_LOGIN_PROMPT.test(p.textContent.trim())) p.dataset.auth = 'anonymous';
  });
}

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      // an "image" column is a single <p> whose only content is the picture —
      // not any column with a picture (a title+icon also has one, but is body text)
      const onlyChild = div.children.length === 1 ? div.firstElementChild : null;
      const isImageOnly = onlyChild?.children.length === 1 && onlyChild.firstElementChild.tagName === 'PICTURE';
      if (isImageOnly) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  decorateLockedCards(ul);
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.replaceChildren(ul);
  decorateSoftLoginPrompts(block);
}
