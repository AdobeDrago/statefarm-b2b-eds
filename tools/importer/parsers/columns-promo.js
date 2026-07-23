/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-promo.
 * Base block: columns
 * Source URL: https://b2b.statefarm.com/b2b-content
 * Generated: 2026-07-22
 *
 * Structure (from library-description.txt + authoring-analysis.json):
 *   1 row, 1 cell containing:
 *     H2 "State Farm can help protect you and your business"
 *     H4 subheading
 *     the product dropdown options rendered as links/list items.
 *
 * Notes:
 *   - The heading is a styled <div class="-oneX-heading--h2">, not a real
 *     <h2>. It is converted to a semantic <h2> so it renders as a heading.
 *   - The product <select> options carry no hrefs, so they become a plain
 *     list of items preserving the option labels (placeholder "Select a
 *     product" is dropped). Static EDS content has no interactive dropdown.
 */
export default function parse(element, { document }) {
  // --- Heading (styled div -> semantic h2) ---
  const headingSource = element.querySelector('.-oneX-heading--h2, h2');
  let heading = null;
  if (headingSource) {
    if (headingSource.tagName === 'H2') {
      heading = headingSource;
    } else {
      heading = document.createElement('h2');
      heading.textContent = (headingSource.textContent || '').replace(/\s+/g, ' ').trim();
    }
  }

  // --- Subheading ---
  const subheading = element.querySelector('.-oneX-cards-body h4, h4');

  // --- Product dropdown -> list of items ---
  const select = element.querySelector('select');
  let list = null;
  if (select) {
    const options = Array.from(select.querySelectorAll('option'))
      .map((o) => (o.textContent || '').trim())
      .filter((t) => t.length > 0 && t.toLowerCase() !== 'select a product');
    if (options.length > 0) {
      list = document.createElement('ul');
      options.forEach((label) => {
        const li = document.createElement('li');
        li.textContent = label;
        list.appendChild(li);
      });
    }
  }

  // Empty-block guard.
  if (!heading && !subheading && !list) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Single-column block: one row, one cell holding all elements.
  const contentCell = [];
  if (heading) contentCell.push(heading);
  if (subheading) contentCell.push(subheading);
  if (list) contentCell.push(list);

  const cells = [];
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-promo', cells });
  element.replaceWith(block);
}
