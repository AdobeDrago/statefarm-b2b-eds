/**
 * Keep "State Farm®" from splitting mid-name. On desktop, insert a break after
 * the trademark; on mobile/tablet the break is hidden so text wraps naturally.
 * @param {Element} block
 */
function keepTrademarkTogether(block) {
  const intro = block.querySelector('h1 + p');
  if (!intro || !intro.innerHTML.includes('State Farm®')) return;
  intro.innerHTML = intro.innerHTML.replaceAll(
    'State Farm®',
    'State&nbsp;Farm®<span class="columns-quarter-break"></span>',
  );
}

/**
 * Split a "266 Data Format : <code> — Description: <text>" list item into
 * its code/description parts. Returns null when the item doesn't follow
 * that pattern (e.g. a plain note row), so the caller can render it as-is.
 * @param {Element} li
 */
function splitDataFormatRow(li) {
  const p = li.querySelector('p');
  if (!p) return null;

  const nodes = [...p.childNodes];
  const isStrong = (n, pattern) => n.nodeType === Node.ELEMENT_NODE
    && n.tagName === 'STRONG'
    && pattern.test(n.textContent);

  const descIndex = nodes.findIndex((n) => isStrong(n, /description/i));
  if (descIndex === -1) return null;

  const formatIndex = nodes.findIndex((n) => isStrong(n, /data format/i));
  const codeNodes = nodes.slice(formatIndex === -1 ? 0 : formatIndex + 1, descIndex);
  const descNodes = nodes.slice(descIndex + 1);

  const codeCell = document.createElement('div');
  codeNodes.forEach((n) => codeCell.append(n.cloneNode(true)));
  codeCell.innerHTML = codeCell.innerHTML.replace(/^[\s—-]+/, '').replace(/[\s—-]+$/, '').trim();

  const descCell = document.createElement('div');
  descNodes.forEach((n) => descCell.append(n.cloneNode(true)));
  descCell.innerHTML = descCell.innerHTML.trim();
  [...li.children].forEach((child) => {
    if (child !== p) descCell.append(child.cloneNode(true));
  });

  return { codeCell, descCell };
}

/**
 * Rebuild the flat "266 Data Format" list in the mortgage-record-chg-table
 * variant into a real two-column table so it can be styled like a data
 * dictionary instead of a bullet list.
 * @param {Element} block
 */
function buildDataFormatTable(block) {
  const cols = [...block.firstElementChild.children];
  const lastCol = cols[cols.length - 1];
  const list = lastCol?.querySelector(':scope > ul');
  if (!list) return;

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['266 Data Format', 'Description'].forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.append(th);
  });
  thead.append(headRow);
  table.append(thead);
  const tbody = document.createElement('tbody');

  [...list.children].forEach((li) => {
    const tr = document.createElement('tr');
    const split = splitDataFormatRow(li);
    if (split) {
      const codeCol = document.createElement('td');
      codeCol.append(split.codeCell);
      const descCol = document.createElement('td');
      descCol.append(split.descCell);
      tr.append(codeCol, descCol);
    } else {
      const noteCol = document.createElement('td');
      noteCol.colSpan = 2;
      noteCol.className = li.querySelectorAll('p').length > 1
        ? 'mrc-table-footnote'
        : 'mrc-table-note';
      [...li.childNodes].forEach((n) => noteCol.append(n.cloneNode(true)));
      tr.append(noteCol);
    }
    tbody.append(tr);
  });

  table.append(tbody);
  list.replaceWith(table);
}

export default function decorate(block) {
  if (!block.firstElementChild) return;

  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  if (block.classList.contains('mortgage-record-chg-table')) {
    buildDataFormatTable(block);
  }

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });

  if (block.classList.contains('quarter')) {
    keepTrademarkTogether(block);
  }
}
