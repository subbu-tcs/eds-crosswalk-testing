import { moveInstrumentation } from '../../scripts/scripts.js';

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

const isFilled = (cell) => !!(cell.textContent.trim() || cell.querySelector('img, picture'));

/** The Columns setting ("table-4"), if it reaches the page as a row of its own. */
const isColumnsSetting = (row) => row.children.length === 1
  && /^table-\d+$/.test(row.textContent.trim());

/** Imported content names each row's model ("table-col-4") in a leading cell. */
const isRowModel = (cell) => /^table-col-\d+$/.test(cell.textContent.trim());

/** The heading just above the block names the table. */
function precedingHeading(block) {
  const section = block.closest('.section');
  const ordered = [...(section?.querySelectorAll(`${HEADING_SELECTOR}, .block`) || [])];
  return ordered.slice(0, Math.max(ordered.indexOf(block), 0))
    .filter((el) => el.matches(HEADING_SELECTOR)).at(-1);
}

function fillCell(cell, source) {
  moveInstrumentation(source, cell);
  // a single paragraph is unwrapped so the cell holds its text directly
  const only = source.children.length === 1 && source.firstElementChild.tagName === 'P'
    ? source.firstElementChild : null;
  cell.append(...(only || source).childNodes);
  return cell;
}

/**
 * loads and decorates the table
 * @param {Element} block The table block element
 */
export default function decorate(block) {
  const hasHeader = !block.classList.contains('no-header');
  const rowHeaders = block.classList.contains('header-column');
  const rows = [...block.children];
  if (rows.length && isColumnsSetting(rows[0])) rows.shift().remove();
  rows.forEach((row) => {
    const first = row.firstElementChild;
    if (row.children.length > 1 && isRowModel(first)) first.remove();
  });
  const columns = Math.max(1, ...rows.map((row) => row.children.length));

  const table = document.createElement('table');
  let body = document.createElement('tbody');

  rows.forEach((row, i) => {
    const cells = [...row.children];
    const tr = document.createElement('tr');
    moveInstrumentation(row, tr);

    if (hasHeader && i === 0) {
      const thead = document.createElement('thead');
      cells.forEach((source) => {
        const th = fillCell(document.createElement('th'), source);
        th.scope = 'col';
        tr.append(th);
      });
      thead.append(tr);
      table.append(thead);
      return;
    }

    // a row with only its first cell filled heads the rows that follow it
    const filled = cells.filter(isFilled);
    if (columns > 1 && filled.length === 1 && filled[0] === cells[0]) {
      if (body.rows.length) {
        table.append(body);
        body = document.createElement('tbody');
      }
      const th = fillCell(document.createElement('th'), cells[0]);
      th.scope = 'rowgroup';
      th.colSpan = columns;
      th.className = 'table-group';
      tr.append(th);
      body.append(tr);
      return;
    }

    for (let c = 0; c < columns; c += 1) {
      const source = cells[c] || document.createElement('div');
      const cell = fillCell(document.createElement(rowHeaders && c === 0 ? 'th' : 'td'), source);
      if (rowHeaders && c === 0) cell.scope = 'row';
      tr.append(cell);
    }
    body.append(tr);
  });
  if (body.rows.length || !table.tBodies.length) table.append(body);

  // wide tables scroll inside their own box; the box is focusable so keyboards can scroll it
  const scroller = document.createElement('div');
  scroller.className = 'table-scroll';
  scroller.style.setProperty('--table-columns', columns);
  const heading = precedingHeading(block);
  if (heading) {
    heading.id = heading.id || `table-${[...document.querySelectorAll('.table.block')].indexOf(block) + 1}-title`;
    table.setAttribute('aria-labelledby', heading.id);
    scroller.setAttribute('aria-labelledby', heading.id);
  }
  scroller.setAttribute('role', 'region');
  scroller.tabIndex = 0;
  scroller.append(table);
  block.replaceChildren(scroller);
}
