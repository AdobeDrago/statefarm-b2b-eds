import { decorateIcons } from '../../scripts/aem.js';
import { isSimulationEnabled, decorateAuthControl } from '../../scripts/auth.js';

// maps the "no login required" link labels to an icon in /icons
const NO_LOGIN_ICONS = {
  'Request supplement': 'loan-quote-2',
  'Create assignment': 'document-add-2',
  'Fire service provider tool': 'homeowners-insurance-2',
};

/**
 * Turns "Log In" into a red pill; only the anonymous state renders anything
 * here — logging out happens via the header nav.
 * @param {Element} block The columns-auth block
 */
function decorateLoginPanel(block) {
  const loginLink = [...block.querySelectorAll('a')]
    .find((a) => a.textContent.trim() === 'Log In');
  // e.g. /b2b-content/suppliers, whose panel cell holds only a spacer
  if (!loginLink) return;

  loginLink.classList.add('button', 'accent');
  const wrapper = loginLink.closest('p');
  if (!wrapper) return;
  wrapper.classList.add('button-wrapper');
  if (!isSimulationEnabled()) return;

  // wires the href/click-to-login attribute; harmless once authenticated
  // since the wrapper is hidden then anyway
  decorateAuthControl(loginLink);
  wrapper.dataset.auth = 'anonymous';

  // homepage-only prompt line, identified by content — hub pages have no
  // such paragraph before the login wrapper
  const prompt = [...block.querySelectorAll('p')]
    .find((p) => p !== wrapper && /\blog in\b/i.test(p.textContent));
  if (prompt) prompt.dataset.auth = 'anonymous';

  // not `p.forgot` — that class exists in the import artifacts but in no
  // delivered page
  const forgot = block.querySelector('a[href*="forgot-id-pwd"]')?.closest('p');
  if (forgot) forgot.dataset.auth = 'anonymous';
}

/**
 * Turns the "no login required" list into icon + link items. Only the
 * heading hides once authenticated — the list itself stays visible always.
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

  if (isSimulationEnabled()) heading.dataset.auth = 'anonymous';
}

export default function decorate(block) {
  if (!block.firstElementChild) return;

  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-auth-${cols.length}-cols`);

  const colHeading = block.querySelector('.columns-auth h1');
  if (colHeading && colHeading.textContent.includes('®') && !colHeading.querySelector('.registered')) {
    colHeading.innerHTML = colHeading.innerHTML.replace(
      /®/g,
      '<sup class="registered">®</sup>',
    );
  }

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

  decorateLoginPanel(block);
  decorateNoLoginList(block);
}
