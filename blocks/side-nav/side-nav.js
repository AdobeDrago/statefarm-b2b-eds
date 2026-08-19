const isBackToTop = (el) => !!el && el.tagName === 'P' && /^back to top$/i.test(el.textContent.trim());

/**
 * The node holding a row's labelled cells: the list item, or the paragraph the
 * backend wraps its content in.
 * @param {Element} li the list item
 * @returns {Element} the element whose child nodes hold the cells
 */
function cellRoot(li) {
  const first = li.firstElementChild;
  return first && first.tagName === 'P' ? first : li;
}

/**
 * Reads one list item authored as a row of labelled values, e.g.
 * `<strong>State Farm Payer ID</strong><br><strong>with Attachment(s):</strong> J1548 — …`
 * where an em dash separates the cells. A list trailing the row (e.g. bullet
 * points) rides along in the final cell.
 * @param {Element} li the list item
 * @returns {Array<{labels: string[], value: string, list?: Element}>} one entry per cell
 */
function readCells(li) {
  const cells = [];
  let labels = [];
  let value = '';
  const flush = () => {
    cells.push({ labels, value: value.trim() });
    labels = [];
    value = '';
  };
  [...cellRoot(li).childNodes].forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'STRONG') {
      labels.push(node.textContent.trim().replace(/:$/, ''));
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
      // a line break inside a cell separates words, e.g. `No<br>Coverage`
      value += ' ';
    } else if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.textContent.split('—');
      value += parts.shift();
      parts.forEach((part) => {
        flush();
        value = part;
      });
    }
  });
  flush();
  const nested = li.querySelector(':scope > ul');
  if (nested) cells[cells.length - 1].list = nested;
  return cells;
}

/**
 * Lifts sections that were authored inside a list item back out to the body,
 * so they are not indented under a bullet.
 * @param {Element} body the body column
 */
function unnestSections(body) {
  [...body.querySelectorAll('li')].forEach((li) => {
    const heading = li.querySelector(':scope > h3');
    if (!heading) return;
    const previous = heading.previousElementSibling;
    const tail = [];
    let node = isBackToTop(previous) ? previous : heading;
    while (node) {
      tail.push(node);
      node = node.nextElementSibling;
    }
    li.closest('ul').after(...tail);
  });
}

function isTabularList(ul) {
  return ul.children.length > 1 && [...ul.children].every((li) => {
    const root = cellRoot(li);
    return root.querySelectorAll(':scope > strong').length > 1 && root.textContent.includes('—');
  });
}

/**
 * Splits the width across the columns by how much text each one carries. The
 * square root damps the spread, so a wordy column gets the room it needs
 * without starving the short ones. Past four columns there is too little width
 * to share out and the columns are left to divide it evenly.
 * @param {Array<Array<{labels: string[], value: string}>>} rows the parsed rows
 * @returns {string[]} a css width per column, empty when they should be even
 */
function columnWidths(rows) {
  if (rows[0].length > 4) return [];

  const weights = rows[0].map((cell, i) => Math.sqrt(Math.max(
    cell.labels.join(' ').length,
    ...rows.map((row) => row[i].value.length),
  )));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => `${((weight / total) * 100).toFixed(1)}%`);
}

/**
 * The headings authored directly above a tabular list, naming the groups its
 * columns fall into. Prose is left alone: a group heading is a short phrase,
 * so anything closing like a sentence ends the run.
 * @param {Element} ul the tabular list
 * @returns {Element[]} the group headings in document order
 */
function groupHeadings(ul) {
  const headings = [];
  let el = ul.previousElementSibling;
  while (el && el.tagName === 'P' && !/[.:!?]$/.test(el.textContent.trim())) {
    headings.unshift(el);
    el = el.previousElementSibling;
  }
  return headings.length > 1 ? headings : [];
}

/**
 * The header row naming the column groups. Every group past the first names a
 * single column and the opening one covers the rest.
 * @param {Element[]} headings the group headings
 * @param {number} columns how many columns the table has
 * @returns {Element} the header row
 */
function buildGroupRow(headings, columns) {
  const row = document.createElement('tr');
  row.className = 'side-nav-table-groups';
  headings.forEach((heading, i) => {
    const th = document.createElement('th');
    th.colSpan = i ? 1 : columns - headings.length + 1;
    th.append(...heading.childNodes);
    row.append(th);
  });
  return row;
}

function buildTable(rows, headings = []) {
  const table = document.createElement('table');
  if (rows[0].length > 4) table.classList.add('side-nav-table-dense');
  const colgroup = document.createElement('colgroup');
  columnWidths(rows).forEach((width) => {
    const col = document.createElement('col');
    col.style.width = width;
    colgroup.append(col);
  });
  if (colgroup.children.length) table.append(colgroup);

  const head = document.createElement('tr');
  rows[0].forEach((cell) => {
    const th = document.createElement('th');
    cell.labels.forEach((label, i) => {
      if (i) th.append(document.createElement('br'));
      th.append(label);
    });
    head.append(th);
  });
  const thead = document.createElement('thead');
  if (headings.length) thead.append(buildGroupRow(headings, rows[0].length));
  thead.append(head);

  // an unlabelled opening column holds the row's name rather than a value
  const rowHeaders = !rows[0][0].labels.join('').trim();

  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    row.forEach((cell, i) => {
      const td = document.createElement(rowHeaders && !i ? 'th' : 'td');
      if (rowHeaders && !i) td.scope = 'row';
      if (cell.value) td.append(cell.value);
      if (cell.list) td.append(cell.list);
      tr.append(td);
    });
    tbody.append(tr);
  });

  table.append(thead, tbody);
  return table;
}

function decorateTables(body) {
  body.querySelectorAll('ul').forEach((ul) => {
    if (!isTabularList(ul)) return;
    const rows = [...ul.children].map(readCells);
    const columns = rows[0].length;
    if (columns < 2 || rows.some((row) => row.length !== columns)) return;
    const headings = groupHeadings(ul).filter((_, i, all) => all.length < columns);
    ul.replaceWith(buildTable(rows, headings));
    headings.forEach((heading) => heading.remove());
  });
}

/**
 * Tags the back to top links and repeats one at the end of the page when the
 * closing section was authored without it.
 * @param {Element} body the body column
 */
function decorateBackToTop(body) {
  const links = [...body.querySelectorAll('p')].filter(isBackToTop);
  if (!links.length) return;
  links.forEach((link) => link.classList.add('side-nav-back-to-top'));
  const last = links[links.length - 1];
  const container = last.parentElement;
  if (container.lastElementChild !== last) container.append(last.cloneNode(true));
}

/**
 * A paragraph carrying a markup sample rather than prose.
 * @param {Element} paragraph candidate paragraph
 * @returns {boolean} true when the paragraph is a sample to set apart
 */
function isCodeSample(paragraph) {
  const text = paragraph.textContent.trim();
  return text.startsWith('<') && text.endsWith('>');
}

function isHoursList(paragraph) {
  return /^Pacific Time:/i.test(paragraph.textContent.trim());
}

/**
 * Drops the paragraph the block decoration wraps a column in when its content
 * opens with an element it does not recognise as a wrapper.
 * @param {Element} column a block column
 */
function unwrapColumn(column) {
  const wrapper = column.firstElementChild;
  if (column.children.length === 1 && wrapper.tagName === 'P' && wrapper.firstElementChild) {
    wrapper.replaceWith(...wrapper.childNodes);
  }
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const [menu, body] = block.querySelectorAll(':scope > div > div');
  if (!menu || !body) return;
  menu.className = 'side-nav-menu';
  body.className = 'side-nav-body';
  if (!menu.querySelector('ul')) menu.classList.add('side-nav-menu-flat');
  if (window.location.pathname.startsWith('/b2b-content/home-auto-lenders/help-support')) {
    block.classList.add('side-nav-help-support');
  }
  unwrapColumn(menu);
  unwrapColumn(body);

  unnestSections(body);

  const content = body.children.length === 1 && body.firstElementChild.tagName === 'DIV'
    ? body.firstElementChild
    : body;
  // a heading that reads as a sentence opens the page rather than a section
  const lead = content.firstElementChild;
  if (menu.classList.contains('side-nav-menu-flat') && lead?.tagName === 'H3' && /[.!?]$/.test(lead.textContent.trim())) {
    const paragraph = document.createElement('p');
    paragraph.append(...lead.childNodes);
    lead.replaceWith(paragraph);
    paragraph.classList.add('side-nav-lead');
  }

  // without back to top separators every heading opens a section of its own
  const separated = [...body.querySelectorAll('p')].some(isBackToTop);
  const isLenderRelations = !!block.closest('main')?.querySelector('#lender-relations-contacts');
  const isAutoOps = !!block.closest('main')?.querySelector('#auto-operations-directory');
  body.querySelectorAll('h3').forEach((heading, i) => {
    if (isLenderRelations && heading.id === 'contacts-and-responsibilities') return;
    if (isAutoOps) return;
    if (!separated || i === 0 || isBackToTop(heading.previousElementSibling)) heading.classList.add('side-nav-section-heading');
  });

  body.querySelectorAll('p').forEach((paragraph) => {
    if (isCodeSample(paragraph)) paragraph.classList.add('side-nav-code');
    if (isLenderRelations && isHoursList(paragraph)) paragraph.classList.add('side-nav-indent');
  });

  decorateTables(body);
  decorateBackToTop(body);
}
