import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { isSimulationEnabled, decorateAuthControl, decorateAuthForm } from '../../scripts/auth.js';

// media query match that indicates desktop width (header shows full nav)
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Close every open megamenu dropdown (triggers + their panels).
 * @param {Element} navSections the nav sections container
 */
function closeAllDrops(navSections, panelHost = null) {
  navSections.querySelectorAll('.nav-drop[aria-expanded="true"]').forEach((drop) => {
    drop.setAttribute('aria-expanded', 'false');
    if (drop.megaPanel) drop.megaPanel.classList.remove('open');
  });
  if (panelHost) panelHost.classList.remove('open');
  if (isDesktop.matches) document.body.style.overflowY = '';
}

/**
 * Open a single megamenu trigger, closing the others first.
 * @param {Element} navSections the nav sections container
 * @param {Element} li the trigger list item
 */
function openDrop(navSections, li, panelHost = null) {
  closeAllDrops(navSections, panelHost);
  li.setAttribute('aria-expanded', 'true');
  if (li.megaPanel) {
    li.megaPanel.classList.add('open');
    if (panelHost) panelHost.classList.add('open');
    // panels host is position:fixed on desktop — align it under the nav bar
    if (isDesktop.matches) {
      const host = li.megaPanel.parentElement;
      const nav = navSections.closest('nav');
      if (host && nav) host.style.top = `${Math.round(nav.getBoundingClientRect().bottom)}px`;
      document.body.style.overflowY = 'hidden';
    }
  }
}

/**
 * Toggle the mobile menu open/closed.
 * @param {Element} nav the nav element
 * @param {Element} navSections the nav sections container
 * @param {boolean|null} forceExpanded optional forced state
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null
    ? !forceExpanded
    : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  if (button) {
    button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
    button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  }
  if (navSections) closeAllDrops(navSections);
}

/**
 * Builds the search control from JS — not authored in the fragment. Opening
 * it grows nav's own grid row rather than floating over content, unlike the megamenu.
 * @param {Element} nav the nav element (search row lives in its grid)
 * @param {Element} searchLink the placeholder anchor for search in the tools section
 */
function decorateSearch(nav, searchLink) {
  if (!searchLink) return;
  const li = searchLink.closest('li') || searchLink.parentElement;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-search-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Search');
  toggle.textContent = 'Search';
  searchLink.replaceWith(toggle);
  if (li) li.classList.add('nav-search-item');

  const pane = document.createElement('div');
  pane.className = 'nav-search-pane';

  const paneInner = document.createElement('div');
  paneInner.className = 'nav-search-pane-inner';

  const form = document.createElement('form');
  form.className = 'nav-search-form';
  form.setAttribute('role', 'search');
  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'q';
  input.placeholder = 'Search';
  input.setAttribute('aria-label', 'Search');
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'nav-search-submit button accent';
  submit.textContent = 'Search';
  form.append(input, submit);
  decorateAuthForm(form);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'nav-search-close';
  closeBtn.setAttribute('aria-label', 'Close search');
  closeBtn.innerHTML = '<span aria-hidden="true">&times;</span>';

  paneInner.append(form, closeBtn);
  pane.append(paneInner);
  nav.append(pane);

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('search-open', open);
    if (open) input.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  closeBtn.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') setOpen(false);
  });
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment — try metadata, then the project's /content root, then site root
  const navMeta = getMetadata('nav');
  const candidatePaths = [];
  if (navMeta) candidatePaths.push(new URL(navMeta, window.location).pathname);
  candidatePaths.push('/content/nav', '/nav');
  let fragment = null;
  for (let i = 0; i < candidatePaths.length && !fragment; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    fragment = await loadFragment(candidatePaths[i]);
  }
  if (!fragment) return;

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) {
      section.classList.add(`nav-${c}`);
      // unwrap the default-content-wrapper so direct-child selectors work
      const wrapper = section.querySelector(':scope > .default-content-wrapper');
      if (wrapper) {
        while (wrapper.firstChild) section.append(wrapper.firstChild);
        wrapper.remove();
      }
    }
  });

  // brand: mark the logo link
  const navBrand = nav.querySelector('.nav-brand');
  if (navBrand) {
    const brandLink = navBrand.querySelector('a');
    if (brandLink) brandLink.classList.add('nav-brand-link');
  }

  // sections: wire up megamenu dropdowns
  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    let panelHost = null;
    panelHost = document.createElement('div');
    panelHost.className = 'nav-drop-panels';
    navSections.querySelectorAll(':scope > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) {
        navSection.classList.add('nav-drop');
        navSection.setAttribute('aria-expanded', 'false');

        // build the dropdown panel: group each H3 + UL into a column.
        // The trigger link may be a direct <a> (local) or wrapped in a <p> (DA/EDS).
        let topLink = navSection.querySelector(':scope > a');
        let topNode = topLink;
        if (!topLink) {
          const firstP = navSection.querySelector(':scope > p');
          const wrappedLink = firstP ? firstP.querySelector('a') : null;
          if (wrappedLink) {
            topLink = wrappedLink;
            topNode = firstP;
          }
        }
        const panel = document.createElement('div');
        panel.className = 'nav-drop-panel';
        const panelInner = document.createElement('div');
        panelInner.className = 'nav-drop-panel-inner';
        const nodes = Array.from(navSection.children).filter((el) => el !== topNode);
        let currentCol = null;
        nodes.forEach((node) => {
          if (node.tagName === 'H3') {
            currentCol = document.createElement('div');
            currentCol.className = 'nav-drop-col';
            currentCol.append(node);
            panelInner.append(currentCol);
          } else if (node.tagName === 'UL' && currentCol) {
            currentCol.append(node);
          } else {
            panelInner.append(node);
          }
        });
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'nav-drop-close';
        closeBtn.setAttribute('aria-label', 'Close menu');
        closeBtn.innerHTML = '<span aria-hidden="true">&times;</span>';
        closeBtn.addEventListener('click', () => closeAllDrops(navSections, panelHost));
        panel.append(panelInner, closeBtn);
        navSection.megaPanel = panel;

        navSection.addEventListener('mouseenter', () => {
          if (isDesktop.matches) openDrop(navSections, navSection, panelHost);
        });
        if (topLink) {
          topLink.addEventListener('click', () => {
            const wasOpen = navSection.getAttribute('aria-expanded') === 'true';
            if (wasOpen) closeAllDrops(navSections, panelHost);
            else openDrop(navSections, navSection, panelHost);
          });
        }
      }
    });

    // move every panel into a trailing container so top-level trigger anchors
    // precede panel links in DOM order
    // let panelHost = null;
    const panelOverlay = document.createElement('div');
    panelOverlay.className = 'nav-drop-overlay';

    // panelHost = document.createElement('div');
    // panelHost.className = 'nav-drop-panels';
    navSections.querySelectorAll(':scope > ul > li.nav-drop').forEach((li) => {
      if (li.megaPanel) panelHost.append(li.megaPanel);
    });
    panelHost.append(panelOverlay);
    navSections.append(panelHost);

    panelOverlay.addEventListener('mouseenter', () => {
      if (isDesktop.matches) closeAllDrops(navSections, panelHost);
    });
    panelOverlay.addEventListener('click', () => {
      if (isDesktop.matches) closeAllDrops(navSections, panelHost);
    });

    // desktop: close the open panel when the pointer leaves the nav bar
    navSections.addEventListener('mouseleave', () => {
      if (isDesktop.matches) closeAllDrops(navSections, panelHost);
    });
    // close on click outside
    document.addEventListener('click', (e) => {
      if (isDesktop.matches
        && !navSections.contains(e.target)) closeAllDrops(navSections, panelHost);
    });
    // close on escape
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') closeAllDrops(navSections, panelHost);
    });
  }

  // tools: build the search control and lift the login link into the main row
  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    const loginPara = navTools.querySelector('p');
    if (loginPara) {
      const loginLink = loginPara.querySelector('a');
      if (loginLink) {
        loginLink.classList.add('nav-login');
        // the authored href is the real login app, so only simulation hosts rewrite it
        if (isSimulationEnabled()) decorateAuthControl(loginLink);
      }
      const loginWrap = document.createElement('div');
      loginWrap.className = 'nav-login-wrap';
      loginWrap.append(loginPara);
      if (navSections) navSections.after(loginWrap);
      else nav.append(loginWrap);
    }
    const searchLink = [...navTools.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Search');
    decorateSearch(nav, searchLink);
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation" aria-expanded="false">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  // reset menu/dropdown state when crossing the desktop/mobile breakpoint
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => {
    toggleMenu(nav, navSections, isDesktop.matches);
    if (navSections) closeAllDrops(navSections);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
