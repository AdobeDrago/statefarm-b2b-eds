/**
 * Decorates the breadcrumbs block: wraps the authored link list in a <nav>,
 * converts it to an <ol>, and marks the last item as the current page
 * (removing its link, since it isn't a navigable destination).
 * @param {Element} block The breadcrumbs block
 */
export default function decorate(block) {
  const ul = block.querySelector('ul');
  if (!ul) return;

  const ol = document.createElement('ol');
  [...ul.children].forEach((li) => ol.append(li));

  const lastLink = ol.lastElementChild?.querySelector('a');
  if (lastLink) {
    const current = document.createElement('span');
    current.textContent = lastLink.textContent;
    current.setAttribute('aria-current', 'page');
    lastLink.replaceWith(current);
  }

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');
  nav.append(ol);

  block.replaceChildren(nav);
}
