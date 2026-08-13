// add delayed functionality here

const CHAT_SRC = 'https://chat.demngd01.c1.statefarm/sf-chat.js';
const STATE_FARM_HOSTS = ['statefarm.com', 'statefarm.org', 'ic1.statefarm', 'c1.statefarm'];

function isStateFarmHost(hostname) {
  return STATE_FARM_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

/**
 * sf-chat derives its sf-ui asset host from the page hostname, and any host outside
 * statefarm.com/.org resolves to an internal test host that is unreachable from
 * localhost and the aem.page/aem.live domains. Its `external=true` query parameter
 * switches those assets to the public host instead.
 * @param {Location} location
 * @returns {boolean} true when the parameter has to be forced on
 */
function needsExternalAssets(location) {
  return !isStateFarmHost(location.hostname)
    && new URLSearchParams(location.search).get('external') !== 'true';
}

function relativeUrlWithExternal(href) {
  const url = new URL(href);
  url.searchParams.set('external', 'true');
  return `${url.pathname}${url.search}${url.hash}`;
}

function replaceUrl(url) {
  window.history.replaceState(window.history.state, '', url);
}

/**
 * Loads the State Farm chat widget (sf-chat custom element) and mounts it.
 * Self-contained module with its own shadow-DOM styling — no extra CSS needed.
 */
function loadChat() {
  const { pathname, search, hash } = window.location;
  // sf-chat reads `external` while it evaluates, so the parameter has to be on the
  // URL for the duration of the request and is put back once the module has run.
  const forceExternal = needsExternalAssets(window.location);
  if (forceExternal) replaceUrl(relativeUrlWithExternal(window.location.href));

  const script = document.createElement('script');
  script.type = 'module';
  script.src = CHAT_SRC;
  if (forceExternal) {
    const restore = () => replaceUrl(`${pathname}${search}${hash}`);
    script.addEventListener('load', restore, { once: true });
    script.addEventListener('error', restore, { once: true });
  }
  document.head.append(script);

  const chat = document.createElement('sf-chat');
  chat.setAttribute('config-key', 'DigitalExperienceChatbot');
  chat.setAttribute('theme', 'traditional');
  chat.setAttribute('attributes', JSON.stringify({ experience: 'b2b' }));
  document.body.append(chat);
}

loadChat();
