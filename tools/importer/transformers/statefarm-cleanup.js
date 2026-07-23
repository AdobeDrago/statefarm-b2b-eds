/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: State Farm B2B site-wide cleanup.
 *
 * All selectors verified against migration-work/cleaned.html.
 *
 * The authorable body content lives entirely under `#b2b-edge-content`
 * (cleaned.html line 959, inside <main>). Everything outside it is
 * non-authorable State Farm / oneX chrome:
 *   - privacy-notice experience fragment  (.cmp-experiencefragment--privacy-notice, line 6)
 *   - header experience fragment / #oneX-header  (line 31 / line 82)  -> migrated as a separate nav fragment
 *   - breadcrumb component  (.breadcrumb-component, line 956)
 *   - footer experience fragment / #footer  (line 1642 / 1647)  -> migrated as a separate footer fragment
 *   - chat widget  (sf-chat, line 1705)
 *   - Optimizely / demdex / TTD tracking iframes  (lines 1707, 1776, 1778, 1780)
 *
 * Strategy: in beforeTransform, collapse the document down to just
 * `#b2b-edge-content` so block parsing only ever sees authorable content,
 * and drop the hidden duplicate authentication container inside it. In
 * afterTransform, belt-and-suspenders removal of any chrome selectors plus
 * generic non-authorable element/attribute cleanup.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Scope the imported document to the authorable body only.
    // #b2b-edge-content is the <main> content wrapper (cleaned.html line 959).
    const body = element.querySelector('#b2b-edge-content');
    if (body) {
      element.replaceChildren(body);
    }

    // Remove the hidden duplicate authentication container that would otherwise
    // produce a second, empty columns-auth block (cleaned.html line 1304).
    WebImporter.DOMUtils.remove(element, [
      '.authentication-container.-oneX-d-none',
    ]);

    // Remove any global chrome / widgets that may still be present so they
    // never interfere with block matching. Header (#oneX-header) and footer
    // (#footer) are migrated separately as nav/footer fragments.
    WebImporter.DOMUtils.remove(element, [
      '.cmp-experiencefragment--privacy-notice',
      '.cmp-experiencefragment--header',
      '.cmp-experiencefragment--footer',
      '#oneX-header',
      '#footer',
      '.breadcrumb-component',
      'sf-chat',
      'iframe',
      'script',
      'noscript',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Final safety net for any non-authorable chrome / tracking elements
    // that survived scoping, plus safe throwaway elements.
    WebImporter.DOMUtils.remove(element, [
      '.cmp-experiencefragment--privacy-notice',
      '.cmp-experiencefragment--header',
      '.cmp-experiencefragment--footer',
      '#oneX-header',
      '#footer',
      '.breadcrumb-component',
      'sf-chat',
      'iframe',
      'script',
      'noscript',
      'link',
      'source',
    ]);

    // Strip oneX / AEM authoring attributes that carry no meaning in EDS
    // (verified: aem-Grid / cmp-container / responsiveGrid wrappers and
    // data-* / on* hooks throughout the State Farm markup).
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('onclick');
      el.removeAttribute('data-analytics');
      el.removeAttribute('data-testid');
      el.removeAttribute('tabindex');
      el.removeAttribute('aria-hidden');
    });
  }
}
