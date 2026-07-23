import { decorateIcons } from '../../scripts/aem.js';

// maps the "no login required" link labels to an icon in /icons
const NO_LOGIN_ICONS = {
  'Request supplement': 'loan-quote',
  'Create assignment': 'document-add',
  'Fire service provider tool': 'homeowners-insurance',
};

/**
 * Turns the "Log In" link into a red pill button, reusing the existing
 * .button.accent styling (which already resolves to var(--link-color)).
 * @param {Element} block The columns-auth block
 */
function decorateLoginButton(block) {
  const loginLink = [...block.querySelectorAll('a')]
    .find((a) => a.textContent.trim() === 'Log In');
  if (loginLink) {
    loginLink.classList.add('button', 'accent');
    const wrapper = loginLink.closest('p');
    if (wrapper) wrapper.classList.add('button-wrapper');
  }
}

/**
 * Transforms the "no login required" list into a horizontal row of
 * icon + link items.
 * @param {Element} block The columns-auth block
 */
function decorateNoLoginList(block) {
  const heading = [...block.querySelectorAll('h6')]
    .find((h) => h.textContent.trim() === 'No login required:');
  const list = heading?.nextElementSibling;
  if (!list || list.tagName !== 'UL') return;

  list.classList.add('columns-auth-no-login-list');
  [...list.children].forEach((li) => {
    const link = li.querySelector('a');
    if (!link) return;
    const iconName = NO_LOGIN_ICONS[link.textContent.trim()];
    if (iconName) {
      const icon = document.createElement('span');
      icon.className = `icon icon-${iconName}`;
      li.prepend(icon);
    }
  });
  decorateIcons(list);
}

export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-auth-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-auth-img-col');
        }
      }
    });
  });

  decorateLoginButton(block);
  decorateNoLoginList(block);
}
