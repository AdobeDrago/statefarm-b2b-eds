# Direct 1X class reuse spike

**Scope:** one page only — `/b2b-content/suppliers`.

## What was tested

The Suppliers page is representative of the B2B landing pages: it has an icon-led introductory block and three equal service cards. During `cards` block decoration, the spike applies 1X classes directly to the EDS-generated elements:

| EDS-generated element | Direct 1X classes |
| --- | --- |
| cards block | `-oneX-container` |
| generated `ul` | `-oneX-row` |
| generated card `li` | `-oneX-col-12 -oneX-col-md-4` |
| generated card body | `-oneX-cards-container--padding-md` |
| card title link | `-oneX-link--inline` |

The legacy `1x.core.css` is loaded only for this URL. `1x.core.js` is intentionally not loaded: it is a page-global behavioral bundle, rather than a block module, and its initialization behavior is evaluated below rather than introduced into a production path for this CSS-only spike.

## Friction found

### Grid and block structure

1X grid expects the direct relationship `container > row > col`. EDS's `cards` block instead owns a `ul` and uses CSS Grid. Its existing selector `.cards > ul` has higher specificity than `.-oneX-row`, so the 1X row's `display:flex` does not win. Conversely, 1X's negative row gutters and 1X column padding still apply, producing a mixed layout instead of a coherent 1X grid.

The 1X card primitive also assumes component-specific title/body markup. The EDS card body is generic authored paragraphs; applying `-oneX-cards-container--padding-md` gives it 1X card chrome, but leaves the EDS card CSS and semantic list structure in control. Making this faithful would require an adapter DOM layer or override CSS, defeating direct reuse.

### Breakpoints and page-wide CSS

EDS uses mobile-first breakpoints at 600px and 900px. 1X's grid changes at 576px, 768px, 992px, and 1200px. The selected cards therefore change from one to two columns at 600px under EDS, while their 1X `-oneX-col-md-4` behavior begins at 768px. At widths between these thresholds, direct classes create contradictory layout intent.

`1x.core.css` also contains global element selectors (including headings and form elements) and a root `.-oneX` reset. Loading it on a page alters non-block content, header/footer behavior, font declarations, and defaults. It cannot be safely isolated by adding classes only to a block.

### JavaScript initialization order

EDS decorates and lazy-loads blocks in phases. The 1X core JavaScript is a page-global bundle that uses a document-ready path, scans selectors, and runs a shared `oneX.Init` queue. That conflicts with EDS because block DOM is transformed after initial document decoration and blocks can load after the initial page pass. Loading 1X first risks initializing pre-decoration markup; loading it after EDS risks missed elements, duplicate listeners, or lifecycle work that must be rerun for every lazy block. The bundle is not a per-block initializer with an EDS-compatible lifecycle contract.

## Recommendation: no-go for direct reuse as-is

Do not roll out direct `-oneX-` class reuse beyond this test page. The classes carry structural assumptions, non-aligned responsive breakpoints, and page-global CSS/JS side effects that EDS blocks cannot safely absorb without substantial adapters and overrides.

Use a separate follow-up to extract approved visual tokens or a deliberately scoped compatibility layer. That work is explicitly outside this spike.
