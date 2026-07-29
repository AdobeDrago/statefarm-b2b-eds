import { decorateIcons } from '../../scripts/aem.js';

const ICON_TOKEN = /^:([a-z0-9-]+):$/i;

export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [iconCell, bodyCell] = row.children;
    if (iconCell) {
      iconCell.className = 'icon-text-icon';
      // scripts.js normally runs decorateIcons on the whole page before this
      // block's own decoration, converting an authored `:icon:` token into
      // span.icon. Fall back to converting it here for content that isn't
      // pre-decorated yet (e.g. local drafts served as raw plain.html).
      const iconP = [...iconCell.children].find((el) => el.tagName === 'P' && ICON_TOKEN.test(el.textContent.trim()));
      if (iconP) {
        const name = iconP.textContent.trim().match(ICON_TOKEN)[1];
        const span = document.createElement('span');
        span.className = `icon icon-${name}`;
        iconP.replaceWith(span);
      }
    }
    if (bodyCell) bodyCell.className = 'icon-text-body';
  });
  decorateIcons(block);
}
