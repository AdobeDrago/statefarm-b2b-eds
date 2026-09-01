/**
 * Escapes an authored scalar value for inclusion in a custom-element attribute.
 * @param {string} value raw value
 * @returns {string} escaped value
 */
function escapeAttribute(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * Builds the SSR input for an AEM-authored Hero. Pass rich body and CTA markup
 * as contentHtml so Lit projects it through the component's default slot.
 *
 * @param {{heading?: string, imageSrc?: string, imageAlt?: string, contentHtml?: string}} content
 * @returns {string} custom-element HTML for renderWithSSR()
 */
function buildHeroHtml({
  heading = '', imageSrc = '', imageAlt = '', contentHtml = '',
} = {}) {
  return `<sf-hero heading="${escapeAttribute(heading)}" image-src="${escapeAttribute(imageSrc)}" image-alt="${escapeAttribute(imageAlt)}">${contentHtml}</sf-hero>`;
}

// eslint-disable-next-line import/prefer-default-export
export { buildHeroHtml };
