import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

/**
 * Runs Lit SSR over a raw HTML string, returns the rendered output.
 * @param {string} htmlString
 * @returns {Promise<string>}
 */
async function renderWithSSR(htmlString) {
  const template = html`${unsafeHTML(htmlString)}`;
  const result = render(template);
  return collectResult(result);
}

// eslint-disable-next-line import/prefer-default-export
export { renderWithSSR };
