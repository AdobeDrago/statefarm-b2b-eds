/*
 * Simulated auth via `?loggedIn=true` — temporary until real B2B credentials
 * exist. The URL is the only source of truth; nothing is persisted.
 */

/*
 * Not a security boundary — guarded content is still delivered, only hidden
 * with CSS. Imports nothing, so it's safe to use from any load phase.
 */

const PARAM = 'loggedIn';

/** Parameter values that count as authenticated; anything else is public. */
const TRUTHY = ['true', '1', 'yes'];

// Confined to dev/staging hosts — the nav/panel rewrites replace the real
// login link, which must never happen in production.
const SIMULATION_HOSTS = /(^localhost$|^127\.0\.0\.1$|\.aem\.page$|\.aem\.live$)/;

/** Heading copy that marks a login-gated page. */
const GATE_HEADINGS = ['log in to view content'];

// Hosts that belong WITH the gate prompt, not behind it: password recovery,
// registration and profile self-service.
const AUTH_HELP_HOSTS = [
  'forgot-id-pwd.b2b.statefarm.com',
  'forms.b2b.statefarm.com',
  'profile.b2b.statefarm.com',
  'selfvouch.b2b.statefarm.com',
];

// Confirms a gate already found by heading — never used to detect one, since
// many ungated pages link to these hosts too.
const GUARDED_LINKS = 'a[href*="/secure/"], a[href*="apps.b2b.statefarm.com"], a[href*=".digital.statefarm.com"]';

/* ---- link propagation ---- */

/** Path roots that hold files, never pages. */
const ASSET_ROOT = /^\/(content\/dam|media_|icons)\//i;

/** A trailing extension marks an asset; `.html` is the one navigable form. */
const FILE_EXTENSION = /\.[a-z0-9]{1,8}$/i;

// Auth controls set their own parameter; widget.js fans searchParams into
// dataset, so widget links are opted out too.
const REWRITE_OPT_OUT = '[data-auth-action], .widget a';

/**
 * @returns {boolean} whether the URL-parameter simulation is active on this host
 */
export function isSimulationEnabled() {
  return SIMULATION_HOSTS.test(window.location.hostname);
}

/**
 * Resolves auth state from the URL — `loggedIn=true` is authenticated, else public.
 * TODO: swap for the real session check once auth integration lands.
 * @returns {boolean} true when the visitor is (simulated) authenticated
 */
function resolveAuthState() {
  const param = new URLSearchParams(window.location.search).get(PARAM);
  return param !== null && TRUTHY.includes(param.trim().toLowerCase());
}

/**
 * @returns {boolean} whether the visitor is authenticated
 */
export function isAuthenticated() {
  return isSimulationEnabled() && resolveAuthState();
}

/**
 * The current page's URL in a given state — login adds the parameter, logout
 * removes it. Used as the Log In / Log Out href so both work without JS.
 * @param {boolean} authenticated the state to switch to
 * @param {string} [baseHref] optional navigation target (defaults to current page)
 * @returns {string} a path-relative href
 */
function authActionHref(authenticated, baseHref = window.location.href) {
  const url = new URL(baseHref, window.location.href);
  if (authenticated) url.searchParams.set(PARAM, 'true');
  else url.searchParams.delete(PARAM);
  // simulation-only chat flag — never carry it into auth navigations
  url.searchParams.delete('external');
  url.hash = '';
  return `${url.pathname}${url.search}`;
}

/**
 * Login destination from the authored href when it is a real page path.
 * Hash-only targets (e.g. `#login`) fall back to the current page.
 * This portal has no `/` index — authored `/` means B2B home.
 * @param {HTMLElement} control the Log In control
 * @returns {string} path-relative href with the auth parameter
 */
function loginDestinationHref(control) {
  const authored = control.getAttribute('href');
  if (!authored || authored.startsWith('#')) return authActionHref(true);

  const url = new URL(authored, window.location.href);
  if (url.origin === window.location.origin && (url.pathname === '/' || url.pathname === '')) {
    url.pathname = '/b2b-content';
  }
  return authActionHref(true, url.href);
}

/**
 * Navigates to the URL that encodes the new state, so links get rewritten.
 * Back after logout re-authenticates — the honest result of URL-as-truth.
 * @param {boolean} authenticated the state to switch to
 */
function applyAuthState(authenticated) {
  window.location.replace(authActionHref(authenticated));
}

/**
 * Sets the body class before first paint, syncs the address bar to the
 * state, and wires one delegated Log In / Log Out click handler.
 */
export function initAuthState() {
  const authenticated = isAuthenticated();
  document.body.classList.add(authenticated ? 'auth-authenticated' : 'auth-anonymous');
  if (!isSimulationEnabled()) return;

  // Keep the address bar in sync: authenticated keeps `loggedIn=true` (so it
  // matches the hrefs we write); anonymous drops it.
  const { pathname, search, hash } = window.location;
  const next = `${authActionHref(authenticated)}${hash}`;
  if (next !== `${pathname}${search}${hash}`) window.history.replaceState(null, '', next);

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-auth-action]');
    if (!trigger) return;
    event.preventDefault();
    // Prefer the decorated href (may be an authored destination + loggedIn).
    const href = trigger.getAttribute('href');
    if (href) {
      window.location.replace(href);
      return;
    }
    applyAuthState(trigger.dataset.authAction === 'login');
  });
}

/**
 * Adds the parameter to one anchor if it navigates to another page of this site.
 * Classifies on a parsed URL, not string prefixes, and is idempotent.
 * @param {HTMLAnchorElement} a the anchor to consider
 */
function propagateParam(a) {
  // the raw attribute, not a.href — only it tells an in-page `#top` from a page link
  const raw = a.getAttribute('href');
  if (!raw || raw.startsWith('#')) return;
  if (a.matches(REWRITE_OPT_OUT)) return;

  let url;
  try {
    url = new URL(raw, window.location.href); // also resolves authored `../` links
  } catch (e) {
    return; // malformed authored href
  }

  // mailto:/tel:, then anything cross-origin (including http:// variants of this host)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== window.location.origin) return;

  // both asset tests needed — one DAM link in the nav is extensionless, and a
  // future /assets/x.pdf would have no DAM root
  if (ASSET_ROOT.test(url.pathname)) return;
  if (FILE_EXTENSION.test(url.pathname) && !url.pathname.endsWith('.html')) return;

  url.searchParams.set(PARAM, 'true');
  // root-relative, and puts the parameter before any hash
  a.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
}

/**
 * Writes the parameter into every eligible link so the session survives
 * navigation. Blocks that inject anchors after decoration must call this too.
 * @param {Element} main the container to rewrite
 */
export function decorateAuthLinks(main) {
  if (!isAuthenticated()) return;
  main.querySelectorAll('a[href]').forEach(propagateParam);
}

/**
 * Points a Log In / Log Out control at the current state. Sets `title` too,
 * because decorateButtons() has already copied the old label into it.
 * Login prefers the authored href (e.g. `/` → B2B home); logout stays here.
 * @param {HTMLElement} control the authored Log In link
 */
export function decorateAuthControl(control) {
  const authenticated = isAuthenticated();
  control.textContent = authenticated ? 'Log Out' : 'Log In';
  control.title = control.textContent;
  control.dataset.authAction = authenticated ? 'logout' : 'login';
  if ('href' in control) {
    control.href = authenticated ? authActionHref(false) : loginDestinationHref(control);
  }
}

/**
 * Carries the session through a GET form, whose submission would otherwise
 * replace the query string with just its own fields.
 * @param {HTMLFormElement} form the form to extend
 */
export function decorateAuthForm(form) {
  if (!isAuthenticated()) return;
  const field = document.createElement('input');
  field.type = 'hidden';
  field.name = PARAM;
  field.value = 'true';
  form.append(field);
}

const normalize = (el) => el.textContent.replace(/\s+/g, ' ').trim().toLowerCase();

const isAuthHelpParagraph = (el) => el?.tagName === 'P'
  && [...el.querySelectorAll('a[href]')]
    .some((a) => AUTH_HELP_HOSTS.some((host) => a.href.includes(host)));

/** Authored "Log In" / "Log Out" control sitting with the gate prompt. */
const isGateLoginParagraph = (el) => el?.tagName === 'P'
  && /^log\s*(in|out)$/i.test(el.textContent.replace(/\s+/g, ' ').trim());

/**
 * Tags the gate heading and everything it guards so CSS can hide/show them.
 * Matches an exact heading whitelist, never an H1, to avoid false gates.
 * @param {Element} main The main element
 */
export function decorateAuthGate(main) {
  if (!isSimulationEnabled()) return;

  const gate = [...main.querySelectorAll('h2, h3, h4, h5, h6')]
    .find((heading) => GATE_HEADINGS.includes(normalize(heading)));
  if (!gate) return;

  const section = gate.closest('.section');
  const wrapper = gate.parentElement;
  if (!section || !wrapper) return;

  // Gate prompt stays visible when logged out: heading, authored Log In, help links.
  const gateNodes = [gate];
  let next = gate.nextElementSibling;
  while (isGateLoginParagraph(next) || isAuthHelpParagraph(next)) {
    gateNodes.push(next);
    next = next.nextElementSibling;
  }

  // the guarded range: rest of this wrapper, then every following wrapper in
  // the section (a block like `cards` isn't a sibling of the gate heading)
  const guarded = [];
  for (let el = next; el; el = el.nextElementSibling) guarded.push(el);
  for (let el = wrapper.nextElementSibling; el; el = el.nextElementSibling) guarded.push(el);

  const hasGuardedLink = guarded
    .some((el) => el.matches(GUARDED_LINKS) || el.querySelector(GUARDED_LINKS));
  if (!hasGuardedLink) {
    // eslint-disable-next-line no-console
    console.warn('[auth] gate heading found with nothing gated behind it; skipping', gate);
    return;
  }

  gateNodes.forEach((el) => { el.dataset.auth = 'anonymous'; });
  guarded.forEach((el) => { el.dataset.auth = 'authenticated'; });
}
