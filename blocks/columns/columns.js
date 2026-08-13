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

export default function decorate(block) {
  if (!block.firstElementChild) return;

  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

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
