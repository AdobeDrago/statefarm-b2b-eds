/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-service.
 * Base block: cards
 * Source URL: https://b2b.statefarm.com/b2b-content
 * Generated: 2026-07-22
 *
 * Structure (from library-description.txt + authoring-analysis.json):
 *   Cards block: 2 columns, one row per card.
 *   Cell 1 = icon/pictogram.
 *   Cell 2 = linked heading (H4) + description paragraph + the dropdown's
 *            options rendered as a list of related links.
 *
 * Notes:
 *   - Source pictograms are CSS-driven decorative <div>s with no <img>. The
 *     icon is represented with an EDS icon token derived from the H4 class
 *     (e.g. class="auto-car" -> :auto-car:) so cell 1 is never empty.
 *   - Each card's <h4> contains two anchors: an empty block-level link and
 *     the real labelled link. Only the labelled (non-empty) anchor is kept.
 *   - The per-card <select> is converted to a list of links. Option values
 *     carry no hrefs in the source, so the placeholder "Select option" is
 *     dropped and the remaining labels become plain list items, preserving
 *     the option text as the block library expects static content.
 */
export default function parse(element, { document }) {
  // Each card is a responsive column. querySelectorAll finds all 8 regardless
  // of the source's irregular nesting.
  const cards = Array.from(element.querySelectorAll('.-oneX-col-lg-4'));

  const cells = [];

  cards.forEach((card) => {
    // --- Cell 1: icon ---
    // Derive an icon token from the H4 class (the pictogram indicator).
    const h4 = card.querySelector('h4');
    let iconCell = '';
    if (h4) {
      const iconName = Array.from(h4.classList).find((c) => c && c !== 'title');
      if (iconName) {
        // EDS icon token: :name: renders as an <span class="icon icon-name">.
        const iconText = document.createElement('p');
        iconText.textContent = `:${iconName}:`;
        iconCell = iconText;
      }
    }

    // --- Cell 2: heading link + description + related links ---
    const contentCell = [];

    // Heading link: keep the real labelled anchor (skip the empty block link).
    if (h4) {
      const anchors = Array.from(h4.querySelectorAll('a')).filter(
        (a) => a.textContent && a.textContent.trim().length > 0,
      );
      const titleAnchor = anchors[0];
      if (titleAnchor) {
        const headingEl = document.createElement('h4');
        const link = document.createElement('a');
        link.href = titleAnchor.getAttribute('href') || '#';
        if (titleAnchor.getAttribute('title')) {
          link.title = titleAnchor.getAttribute('title');
        }
        // Preserve label text. Replace <br> with a space first so words on
        // separate lines (e.g. "Rental provider<br>portal") stay separated.
        const labelSource = titleAnchor.cloneNode(true);
        labelSource.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
        link.textContent = labelSource.textContent.replace(/\s+/g, ' ').trim();
        headingEl.appendChild(link);
        contentCell.push(headingEl);
      }
    }

    // Description: first non-empty paragraph in the text-description block.
    const descBlock = card.querySelector('.text-description');
    if (descBlock) {
      const desc = Array.from(descBlock.querySelectorAll('p')).find(
        (p) => p.textContent && p.textContent.replace(/ /g, '').trim().length > 0,
      );
      if (desc) contentCell.push(desc);
    }

    // Related links: dropdown <select> options -> list. Skip the placeholder
    // first option ("Select option").
    const select = card.querySelector('select');
    if (select) {
      const options = Array.from(select.querySelectorAll('option'))
        .map((o) => (o.textContent || '').trim())
        .filter((t) => t.length > 0 && t.toLowerCase() !== 'select option');
      if (options.length > 0) {
        const list = document.createElement('ul');
        options.forEach((label) => {
          const li = document.createElement('li');
          li.textContent = label;
          list.appendChild(li);
        });
        contentCell.push(list);
      }
    }

    // Only emit a card row if it has content; pad cells so the row is 2-wide.
    if (iconCell !== '' || contentCell.length > 0) {
      cells.push([iconCell, contentCell.length > 0 ? contentCell : '']);
    }
  });

  // Empty-block guard.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-service', cells });
  element.replaceWith(block);
}
