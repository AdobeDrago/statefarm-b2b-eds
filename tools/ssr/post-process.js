import { renderWithSSR } from './render.js';

const DECLARATIVE_SHADOW_ROOT = '<template shadowroot=';

/**
 * Uses Lit SSR only when a block renders declarative shadow DOM. Regular EDS
 * block HTML is returned unchanged, preserving its normal browser decoration.
 *
 * @param {string} htmlString HTML emitted by a block renderer
 * @returns {Promise<{html: string, rendered: boolean}>} Final HTML and SSR status
 */
async function postProcessBlockHtml(htmlString) {
  const renderedHtml = await renderWithSSR(htmlString);
  if (renderedHtml.includes(DECLARATIVE_SHADOW_ROOT)) {
    return { html: renderedHtml, rendered: true };
  }
  return { html: htmlString, rendered: false };
}

// eslint-disable-next-line import/prefer-default-export
export { postProcessBlockHtml };
