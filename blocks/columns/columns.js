/**
 * Keep "State Farm®" on one line with the preceding copy, then break
 * so "is moving from our…" starts on the next line.
 * @param {Element} block
 */
function keepTrademarkTogether(block) {
  const intro = block.querySelector('h1 + p');
  if (!intro || !intro.innerHTML.includes('State Farm®')) return;
  intro.innerHTML = intro.innerHTML.replaceAll(
    'State Farm®',
    'State&nbsp;Farm®<br>',
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
