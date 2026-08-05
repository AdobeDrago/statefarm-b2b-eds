/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: State Farm B2B section breaks + section metadata.
 *
 * Driven by `payload.template.sections` from page-templates.json. The
 * b2b-portal-home template defines 3 sections, so 2 section breaks (<hr>)
 * are expected (one before each section except the first). No section has a
 * `style` set, so no Section Metadata blocks are created for this template;
 * the logic below still handles styled sections for reuse across templates.
 *
 * Section selectors (verified against the original page markup during import):
 *   - hero  : .authentication-container:not(.-oneX-d-none) .htmlComponent > .-oneX-row  (line 966)
 *   - cards : .gridComponent.parsys  (line 1015)
 *   - promo : #xd-container-9bd333c99c  (line 1603)
 *
 * Runs in afterTransform only.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.afterTransform) return;

  const template = payload && payload.template;
  const sections = template && template.sections;
  if (!sections || sections.length < 2) return;

  const doc = element.ownerDocument;

  // Resolve each section's first element from its template selector. Selectors
  // in page-templates.json are anchored at #b2b-edge-content, which the cleanup
  // transformer promoted to the root of `main`; strip that prefix so the
  // selectors resolve within the scoped element.
  const resolved = sections.map((section) => {
    const selector = (section.selector || '').replace(/^#b2b-edge-content\s*/, '');
    const target = selector ? element.querySelector(selector) : null;
    return { section, target };
  });

  // Process in reverse so inserting nodes does not disturb earlier targets.
  for (let i = resolved.length - 1; i >= 0; i -= 1) {
    const { section, target } = resolved[i];
    if (!target) continue;

    // Section Metadata block for sections that declare a style.
    if (section.style) {
      const metadataBlock = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      target.after(metadataBlock);
    }

    // Section break before every section except the first.
    if (i > 0) {
      target.before(doc.createElement('hr'));
    }
  }
}
