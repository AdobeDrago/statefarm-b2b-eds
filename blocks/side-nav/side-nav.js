const isBackToTop = (el) => !!el && el.tagName === 'P' && /^back to top$/i.test(el.textContent.trim());

/**
 * Reads one list item authored as a row of labelled values, e.g.
 * `<strong>State Farm Payer ID</strong><br><strong>with Attachment(s):</strong> J1548 — …`
 * where an em dash separates the cells.
 * @param {Element} li the list item
 * @returns {Array<{labels: string[], value: string}>} one entry per cell
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
  [...li.childNodes].forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'STRONG') {
      labels.push(node.textContent.trim().replace(/:$/, ''));
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
  return ul.children.length > 1 && [...ul.children].every((li) => li.querySelectorAll(':scope > strong').length > 1
    && li.textContent.includes('—'));
}

function buildTable(rows) {
  const table = document.createElement('table');
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
  thead.append(head);

  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    row.forEach((cell) => {
      const td = document.createElement('td');
      td.textContent = cell.value;
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
    ul.replaceWith(buildTable(rows));
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
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const [menu, body] = block.querySelectorAll(':scope > div > div');
  if (!menu || !body) return;
  menu.className = 'side-nav-menu';
  body.className = 'side-nav-body';

  unnestSections(body);

  body.querySelectorAll('h3').forEach((heading, i) => {
    if (i === 0 || isBackToTop(heading.previousElementSibling)) heading.classList.add('side-nav-section-heading');
  });

  decorateTables(body);
  decorateBackToTop(body);
}
