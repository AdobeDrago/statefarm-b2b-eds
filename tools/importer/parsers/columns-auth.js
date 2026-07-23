/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-auth.
 * Base block: columns
 * Source URL: https://b2b.statefarm.com/b2b-content
 * Generated: 2026-07-22
 *
 * Structure (from library-description.txt + authoring-analysis.json):
 *   1 row with 2 cells.
 *   Cell 1 = the office-desk image.
 *   Cell 2 = H1 + intro paragraphs + Log In link + forgot/register links
 *            + "No login required" heading + three quick-links.
 *
 * Notes:
 *   - The source "Log In" control is a <button> with no href. Static EDS
 *     content requires an anchor, so it is converted to a link that keeps
 *     the label text.
 *   - The three quick-links are icon+link groups; only the anchors carry
 *     meaning, so the decorative icon <div>s are dropped and the links are
 *     preserved (label + href).
 */
export default function parse(element, { document }) {
  // --- Cell 1: image ---
  const image = element.querySelector('img');

  // --- Cell 2: content stack ---
  // The right-hand column holds all textual content. Fall back to the whole
  // element if the expected column class is not present.
  const contentCol = element.querySelector('.-oneX-col-lg-7') || element;

  const heading = contentCol.querySelector('h1, h2');
  // Intro + supporting paragraphs (exclude the forgot/register paragraph,
  // which is handled separately so we can normalise the CTA before it).
  const paragraphs = Array.from(contentCol.querySelectorAll(':scope > p')).filter(
    (p) => !p.classList.contains('forgot'),
  );

  // Log In control: <button> in source -> convert to an anchor link.
  const loginBtn = contentCol.querySelector('button, a.-oneX-btn-primary, [class*="btn-primary"]');
  let loginLink = null;
  if (loginBtn) {
    if (loginBtn.tagName === 'A') {
      loginLink = loginBtn;
    } else {
      loginLink = document.createElement('a');
      loginLink.href = loginBtn.getAttribute('href') || '#login';
      loginLink.textContent = (loginBtn.textContent || 'Log In').trim();
    }
  }

  const forgotPara = contentCol.querySelector('p.forgot');

  // "No login required:" subheading.
  const quickLinksHeading = contentCol.querySelector('h6, h5, h4, h3');

  // Quick links: keep the anchors, drop decorative icons.
  const quickLinks = Array.from(
    contentCol.querySelectorAll('.-oneX-icon-container a, .-oneX-flex-column a'),
  );

  // Empty-block guard.
  if (!heading && !image && paragraphs.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const contentCell = [];
  if (heading) contentCell.push(heading);
  paragraphs.forEach((p) => contentCell.push(p));
  if (loginLink) contentCell.push(loginLink);
  if (forgotPara) contentCell.push(forgotPara);
  if (quickLinksHeading) contentCell.push(quickLinksHeading);
  if (quickLinks.length > 0) {
    const list = document.createElement('ul');
    quickLinks.forEach((a) => {
      const li = document.createElement('li');
      li.appendChild(a);
      list.appendChild(li);
    });
    contentCell.push(list);
  }

  // 2-column row: [image cell, content cell]. Pad image cell if missing so
  // both cells are always present.
  const imageCell = image ? [image] : [''];
  const cells = [];
  cells.push([imageCell, contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-auth', cells });
  element.replaceWith(block);
}
