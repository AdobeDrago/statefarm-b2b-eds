import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  buildBlock,
} from './aem.js';
import { initAuthState, decorateAuthGate, decorateAuthLinks } from './auth.js';

// Deliberately limited to the direct-1X-class reuse spike. Do not add pages here:
// the spike is intended to measure compatibility on one representative B2B page.
const ONE_X_SPIKE_PATH = '/b2b-content/suppliers';
const ONE_X_CORE_CSS = 'https://static1.st8fm.com/en_US/dxl-1x/prod/css/1x.core.css';

async function loadOneXSpikeStyles() {
  if (window.location.pathname !== ONE_X_SPIKE_PATH) return;
  document.documentElement.classList.add('-oneX');
  await loadCSS(ONE_X_CORE_CSS);
}

if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const innerTT = window.trustedTypes.createPolicy('tt-inner', {
    createHTML: (s) => s, // avoid stack overflow
  });

  window.trustedTypes.createPolicy('default', {
    // applies to every HTML sink, not just a couple — blocks like widget.js
    // assign fetched HTML via plain `.innerHTML =`, which must go through this.
    createHTML: (input) => {
      const doc = new DOMParser().parseFromString(innerTT.createHTML(input), 'text/html');
      doc.querySelectorAll('script').forEach((el) => el.remove());
      doc.querySelectorAll('iframe[srcdoc]').forEach((el) => el.removeAttribute('srcdoc'));
      return doc.body.innerHTML;
    },
    createScriptURL: (input) => input,
    createScript: (input) => input,
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/**
 * A list item holding nothing but a link.
 * @param {Element} li candidate list item
 * @returns {boolean} true when the item is a flat nav entry
 */
function isLinkListItem(li) {
  if (!li || li.tagName !== 'LI') return false;
  const link = li.querySelector(':scope > a, :scope > strong > a');
  return !!link && li.textContent.trim() === link.textContent.trim();
}

/**
 * A flat nav menu authored as a single list of links.
 * @param {Element} el candidate element
 * @returns {boolean} true when the list is a side-nav menu
 */
function isMenuList(el) {
  if (!el || el.tagName !== 'UL') return false;
  const items = [...el.children].filter((child) => child.tagName === 'LI');
  return items.length >= 2 && items.every(isLinkListItem);
}

/**
 * A page menu heading: a paragraph holding nothing but a link.
 * @param {Element} el candidate element
 * @returns {boolean} true when the element opens a menu group
 */
function isMenuHeading(el) {
  if (!el || el.tagName !== 'P') return false;
  const link = el.querySelector(':scope > a, :scope > strong > a');
  return !!link && el.textContent.trim() === link.textContent.trim();
}

/**
 * Turns a page that opens with a heading followed by bold-link menu groups into
 * a side-nav block: the menu groups become the left column, everything below
 * them the right column.
 * @param {Element} main The container element
 */
function buildSideNavAutoBlock(main) {
  const heading = main.querySelector('h1');
  if (!heading || main.querySelector('.side-nav')) return;

  const menuItems = [];
  let el = heading.nextElementSibling;

  if (isMenuList(el)) {
    menuItems.push(el);
    el = el.nextElementSibling;
  } else {
    while (isMenuHeading(el)) {
      menuItems.push(el);
      el = el.nextElementSibling;
      if (el && el.tagName === 'UL') {
        menuItems.push(el);
        el = el.nextElementSibling;
      }
    }
    if (menuItems.filter(isMenuHeading).length < 2) return;
  }

  const bodyItems = [];
  while (el) {
    bodyItems.push(el);
    el = el.nextElementSibling;
  }
  if (!bodyItems.length) return;

  const menu = document.createElement('nav');
  menu.append(...menuItems);
  // unwrap the bold so decorateButtons leaves the menu links alone
  menu.querySelectorAll('p > strong > a, li > strong > a').forEach((link) => link.parentElement.replaceWith(link));

  const body = document.createElement('div');
  body.append(...bodyItems);

  heading.after(buildBlock('side-nav', [[menu, body]]));
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildWidgetAutoBlocks(main);
    buildSideNavAutoBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Replaces a list of links (or plain text items) with a native <select> jump menu,
 * matching the dropdown pattern used across the source site for secondary navigation lists.
 * @param {HTMLUListElement} ul The list to convert
 * @param {string} placeholder Label shown before a selection is made
 * @returns {HTMLElement} the wrapper element that replaced the list
 */
export function decorateDropdown(ul, placeholder) {
  const select = document.createElement('select');
  select.className = 'dropdown-select';

  const placeholderOption = document.createElement('option');
  placeholderOption.textContent = placeholder;
  placeholderOption.selected = true;
  placeholderOption.disabled = true;
  select.append(placeholderOption);

  [...ul.children].forEach((li) => {
    const link = li.querySelector('a');
    const option = document.createElement('option');
    option.textContent = (link || li).textContent.trim();
    if (link) option.value = link.href;
    select.append(option);
  });

  select.addEventListener('change', () => {
    const { value } = select.options[select.selectedIndex];
    if (value) window.location.href = value;
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'dropdown-select-wrapper';
  wrapper.append(select);
  ul.replaceWith(wrapper);
  return wrapper;
}

/**
 * Contact Us FAQ section headings — not accordion questions.
 */
const CONTACT_US_SECTION_IDS = new Set([
  'contact-us-frequently-asked-questions',
  'log-in--registration',
  'working-with-us',
]);

/**
 * Builds one FAQ accordion item from a question heading and its following answer nodes.
 * @param {Element} heading the question heading
 * @param {Element[]} answerNodes nodes that make up the answer
 * @returns {HTMLDetailsElement} the accordion item
 */
function buildContactUsFaqItem(heading, answerNodes) {
  const summary = document.createElement('summary');
  summary.className = 'contact-us-faq-label';
  summary.append(heading);

  const answer = document.createElement('div');
  answer.className = 'contact-us-faq-body';
  answer.append(...answerNodes);

  const details = document.createElement('details');
  details.className = 'contact-us-faq-item';
  details.append(summary, answer);
  return details;
}

/**
 * Turns Contact Us FAQ question/answer pairs into accordions under each section
 * heading (Log In & Registration, Working with us), matching the live site.
 * @param {Element} main The main element
 */
function decorateContactUsFaq(main) {
  const title = main.querySelector('#contact-us-frequently-asked-questions');
  if (!title) return;
  const wrapper = title.parentElement;
  if (!wrapper) return;

  const headings = [...wrapper.querySelectorAll(':scope > h3')];
  let i = 0;
  while (i < headings.length) {
    const section = headings[i];
    const isFaqSection = CONTACT_US_SECTION_IDS.has(section.id)
      && section.id !== 'contact-us-frequently-asked-questions';
    if (!isFaqSection) {
      i += 1;
    } else {
      const accordion = document.createElement('div');
      accordion.className = 'contact-us-faq';
      let j = i + 1;
      while (j < headings.length && !CONTACT_US_SECTION_IDS.has(headings[j].id)) {
        const question = headings[j];
        const answerNodes = [];
        let node = question.nextElementSibling;
        while (node && node.tagName !== 'H3') {
          const next = node.nextElementSibling;
          // closing copy after the last Working with us item stays outside the accordion
          if (question.id === 'personal-property-replacement-service' && answerNodes.length) break;
          answerNodes.push(node);
          node = next;
        }
        accordion.append(buildContactUsFaqItem(question, answerNodes));
        j += 1;
      }
      if (accordion.children.length) section.after(accordion);
      i = j;
    }
  }

  [...wrapper.querySelectorAll(':scope > p')].forEach((paragraph) => {
    paragraph.classList.add('contact-us-closing');
    const bold = paragraph.querySelector(':scope > b');
    if (bold && paragraph.childNodes.length === 1) bold.replaceWith(...bold.childNodes);
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
  // must run after decorateButtons (its URL-display-link check would break)
  // and before any block decorate() (decorateDropdown reads hrefs, then destroys them)
  decorateAuthLinks(main);
  // must run after decorateSections — the gate walk relies on section wrappers
  decorateAuthGate(main);
  decorateContactUsFaq(main);
}

/**
 * Loads the browser definition after the server-rendered element is parsed, so
 * Lit hydrates its existing declarative shadow DOM instead of replacing it.
 *
 * @param {Element} main page content
 * @returns {Promise<void>}
 */
async function hydrateSsrComponents(main) {
  const componentModules = [];
  if (main.querySelector('ssr-proof-element')) componentModules.push('./lit/ssr-proof-demo.js');
  if (main.querySelector('sf-hero')) componentModules.push('../blocks/hero/sf-hero.js');
  if (componentModules.length) {
    await import('./lit/hydrate.js');
    await Promise.all(componentModules.map((modulePath) => import(modulePath)));
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  // first, so the auth body class is in place before any decoration can throw
  initAuthState();
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    await loadOneXSpikeStyles();
    await hydrateSsrComponents(main);
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Decorates login gate sections by adding a login button.
 */
function decorateLoginButtons() {
  const heading = document.querySelector('h3#log-in-to-view-content[data-auth="anonymous"]');
  if (!heading) return;

  const wrapper = document.createElement('p');
  wrapper.className = 'button-wrapper';
  wrapper.setAttribute('data-auth', 'anonymous');

  const link = document.createElement('a');
  link.href = '/b2b-content/select-service/ss-agreement?loggedIn=true';
  link.title = 'Log In';
  link.className = 'button accent';
  link.setAttribute('data-auth-action', 'login');
  link.textContent = 'Log In';

  wrapper.append(link);
  heading.after(wrapper);
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  decorateLoginButtons();

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
