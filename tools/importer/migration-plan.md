# b2b.statefarm.com Migration Plan

Source of truth: full crawl of `b2b.statefarm.com/b2b-content` (100 live pages, host-restricted to `b2b.statefarm.com`), produced by `tools/importer/build-url-list.mjs` in PR #3 (`worktree-b2b-url-crawler`, not yet merged).

Migration proceeds one **batch** at a time. Each batch = one URL-path cluster believed to share a page template. Per batch:
1. Pick one representative URL.
2. Run the full `page-import` skill pipeline on it (scrape → identify-page-structure → authoring-analysis → generate-import-html → preview). This fixes the block/default-content model for the batch.
3. Apply that same model to the rest of the batch's pages (re-scrape each for its own content, generate HTML using the already-decided structure — skip re-doing full structure/authoring analysis unless a page doesn't fit the model).
4. Open one PR per batch.

Update this file's status column as work happens so any session can resume without re-deriving context.

## Cluster inventory (from the 100-page crawl)

| Cluster (path prefix under /b2b-content) | Pages | Status |
|---|---|---|
| `home-auto-lenders/edi-transactions` | 35 | Done — Batch 1, PR #4 (base: main) |
| `home-auto-lenders/ins-inquiry` | 12 | Done — Batch 2, PR #5 (base: batch-1 branch) |
| `home-auto-lenders/mbps` | 6 | Done — Batch 2 |
| `home-auto-lenders/help-support` | 6 | Done — Batch 2 |
| `medical-ebilling/health-insurance` | 4 | Done — Batch 3, PR #6 (base: batch-2 branch) |
| `medical-ebilling/auto-work-comp` | 4 | Done — Batch 3 |
| `medical-ebilling` (top-level pages: `med-mpp-cv`, `what-is-edi-eft`) | 2 | Done — Batch 3 |
| `claim-services` (incl. `personal-property` sub-cluster) | 9 | **Done — Batch 4, PR pending (base: batch-3 branch)** |
| `suppliers` (incl. `suppliers-coupa` sub-cluster) | 4 | **Done — Batch 4** |
| `select-service` | 3 | **Done — Batch 4** |
| `acct-mgmt` | 4 | **Done — Batch 4** |
| `electronic-payments/eft-remit-faq` | 1 | **Done — Batch 4** |
| Singletons (`contact-us`, `terms-of-use`) | 2 | **Done — Batch 4** |
| `/b2b-content` homepage | 1 | **Out of scope for bulk sweep** — has its own hero/auth/cards-service/promo blocks and pre-existing WebImporter tooling (`tools/importer/import-b2b-portal-home.js`); needs dedicated `page-import` skill treatment, not this script pipeline. |

**All 4 batches complete.** 99 of the 100 discovered pages migrated (35+24+10+23+7 pre-existing top-level pages that already existed before this migration started — `claim-services.plain.html`, `select-service.plain.html`, `suppliers.plain.html`, `medical-ebilling.plain.html`, `electronic-payments.plain.html`, `other-ins-carrier.plain.html`, `home-auto-lenders.plain.html`). The 1 remaining page is the `/b2b-content` homepage itself, flagged out of scope above.

Note: `home-auto-lenders` (12) covers the section landing page; its sub-clusters (edi-transactions, ins-inquiry, mbps, help-support) are listed separately above.

## Batch 1: `home-auto-lenders/edi-transactions` (35 pages)

URL list: `tools/importer/urls-edi-transactions-batch1.txt`

Confirmed via curl diff of 3 sample pages (`ach-payments`, `vacancy`, `paid-in-full`) before starting the skill: identical head/chrome, identical body shape — `#b2b-edge-content` containing a left-nav sidebar (`.leftnav`) plus one `.htmlComponent` with a title + rich text/table body (`.text-content-module`). Confirmed via authoring-analysis on the representative page (`ach-payments`): entire page is **default content** (H1 + paragraphs/tables), no custom block needed.

Two structural sub-shapes exist within the cluster, both handled by `tools/importer/scripts/extract_detail_page.py`:
- **Detail pages** (30): single-topic explanation. Two content shapes, auto-detected by the script:
  - *Flow* (most pages): plain document-order sequence of headings/paragraphs/lists/one table — `build_body_flow()`.
  - *Grouped* (pages using the source's "anchoredtitle" component, e.g. multi-record file-format pages like `ach-payments`, `examples-811`, `examples-820`): N repeating `[heading + table + Back to top link]` groups, where the "Back to top" link for group *i* is quirkily nested at the start of group *i+1* in the source markup (shift-corrected in `extract_groups()`) — `build_body_grouped()`.
- **Hub/index pages** (5: `edi-transactions`, `auto811files`, `daily-811-notifications`, `mortgage-record-chg`, `edi-faq`): built by hand, not by the script.
  - 4 of them (`auto811files`, `daily-811-notifications`, `mortgage-record-chg`, `edi-faq`) turned out to be rich overview/FAQ prose (not simple link lists) and were actually run through `extract_detail_page.py` successfully once the grouped-path bug (see below) was fixed.
  - The root `edi-transactions` hub is a genuine link list — 4 cards (title + description, linking to the other 4 hubs) — built by hand as a `cards` block (this project's existing block, confirmed via `blocks/cards/cards.js`: any non-image column becomes card body).

**Bugs found and fixed while sweeping** (kept here so future batches don't re-discover them):
- First sweep pass: `build_body_grouped` only pulled a group's *first* heading + *first* table, silently dropping any paragraph content in a group with no table — broke every hub-ish page that had prose instead of a table. Fixed by unifying both extraction paths onto one shared `extract_flow_parts()` walker (headings/paragraphs/tables/lists in document order), used both at top level and per-group.
- `build_body_flow` didn't handle `<ul>/<ol>` at all — silently dropped entire bullet lists (caught via automated coverage check, see below).
- Source marks FAQ-style "question" text with `<p class="-oneX-body--intro">` rather than a real heading tag — promoted to `<h3>` for proper heading hierarchy.
- Added `tools/importer/scripts/validate_coverage.py`: compares stripped-text length of source main-content column vs. generated output, flags anything under 85% coverage. Cheap tripwire, not a substitute for eyeballing — a page can still pass this and be wrong in other ways (e.g. wrong heading levels), but it caught the two real truncation bugs above.
- The local dev server only renders content that's been **previewed in DA** — brand-new local `.plain.html` files 404 on their clean URL even though they exist on disk (verified with a throwaway test file). Used `aem up --html-folder b2b-content` instead for local verification, which serves local files directly without needing DA. Also: `.plain.html` files must contain **only** the section `<div>`s — no `<body>/<header>/<main>/<footer>` wrapper (confirmed against the real DA-backed prod preview's `.plain.html` output). The pre-existing sibling files in this repo (`claim-services.plain.html` etc.) incorrectly include that wrapper; don't copy that pattern.

### Per-page status

Legend: `pending` / `scraped` / `imported` / `previewed` / `done`

| # | URL (path suffix) | Shape | Status |
|---|---|---|---|
| 1 | `edi-transactions` | hub | done |
| 2 | `edi-transactions/auto811files` | hub | done |
| 3 | `edi-transactions/auto811files/811autoTest` | detail | done |
| 4 | `edi-transactions/auto811files/997acknowledgement` | detail | done |
| 5 | `edi-transactions/auto811files/exampleTransactionSet` | detail | done |
| 6 | `edi-transactions/daily-811-notifications` | hub | done |
| 7 | `edi-transactions/daily-811-notifications/3rd-party-transmit` | detail | done |
| 8 | `edi-transactions/daily-811-notifications/ach-payments` | detail | **representative — done** |
| 9 | `edi-transactions/daily-811-notifications/edi-survey` | detail | done |
| 10 | `edi-transactions/daily-811-notifications/examples-811` | detail | done |
| 11 | `edi-transactions/daily-811-notifications/examples-820` | detail | done |
| 12 | `edi-transactions/daily-811-notifications/examples-997` | detail | done |
| 13 | `edi-transactions/daily-811-notifications/federal-wire-payments` | detail | done |
| 14 | `edi-transactions/daily-811-notifications/individual-notifications` | detail | done |
| 15 | `edi-transactions/daily-811-notifications/reason-codes` | detail | done |
| 16 | `edi-transactions/daily-811-notifications/specific-instructions` | detail | done |
| 17 | `edi-transactions/edi-faq` | hub | done |
| 18 | `edi-transactions/mortgage-record-chg` | hub | done |
| 19 | `edi-transactions/mortgage-record-chg/acquisition` | detail | done |
| 20 | `edi-transactions/mortgage-record-chg/add-investor` | detail | done |
| 21 | `edi-transactions/mortgage-record-chg/clause-change` | detail | done |
| 22 | `edi-transactions/mortgage-record-chg/comlete-foreclose` | detail | done |
| 23 | `edi-transactions/mortgage-record-chg/deed-in-lieu` | detail | done |
| 24 | `edi-transactions/mortgage-record-chg/del-investor` | detail | done |
| 25 | `edi-transactions/mortgage-record-chg/due-not-billed` | detail | done |
| 26 | `edi-transactions/mortgage-record-chg/errors-corrections` | detail | done |
| 27 | `edi-transactions/mortgage-record-chg/escrow-status` | detail | done |
| 28 | `edi-transactions/mortgage-record-chg/incomplete-foreclosure` | detail | done |
| 29 | `edi-transactions/mortgage-record-chg/loan-num-change` | detail | done |
| 30 | `edi-transactions/mortgage-record-chg/loan-origination` | detail | done |
| 31 | `edi-transactions/mortgage-record-chg/paid-in-full` | detail | done |
| 32 | `edi-transactions/mortgage-record-chg/portfolio-audit` | detail | done |
| 33 | `edi-transactions/mortgage-record-chg/service-released` | detail | done |
| 34 | `edi-transactions/mortgage-record-chg/servicer-change` | detail | done |
| 35 | `edi-transactions/mortgage-record-chg/vacancy` | detail | done |

### Status: Batch 1 complete

All 35 pages generated, coverage-validated, and spot-checked in the browser (dev server + `--html-folder b2b-content`). Draft PR opened for review.

### Reusable tooling for future batches

- `tools/importer/scripts/extract_detail_page.py <cleaned.html> <metadata.json> <output.plain.html>` — converts one scraped source page to this project's default-content `.plain.html` format. Auto-detects flow vs. grouped (anchoredtitle) content shape. Not b2b-content-specific beyond the breadcrumb/main-column selectors, which are shared across this whole site's legacy AEM template — likely reusable as-is for other clusters, but **verify structural assumptions against 2-3 sample pages per new cluster first** (as this batch's `-oneX-body--intro` and missing-`<ul>` bugs show, don't assume a template locked in on one representative page covers every page in a cluster).
- `tools/importer/scripts/validate_coverage.py <cleaned.html> <output.plain.html> <url>` — coverage tripwire, run after every extraction.
- Local verification: run `npx -y @adobe/aem-cli up --html-folder b2b-content` (not the default DA-proxied mode) to preview newly-authored local content before it's pushed to DA.

### Handoff note

Batch 1 shipped as PR #4 (base `main`). Per user direction, subsequent batches proceed without waiting for review — see Batch 2 below and PR chain notes.

## Batch 2: `home-auto-lenders/ins-inquiry` + `mbps` + `help-support` (24 pages)

URL list: `tools/importer/urls-home-auto-lenders-batch2.txt`. Branch `worktree-b2b-import-batch2`, stacked on top of `worktree-b2b-import-edi-batch1` (not on `main`) so its PR only shows this batch's diff — shares the batch-1 tooling instead of duplicating it. Same for Batch 3/4: each stacks on the previous batch's branch.

Same overall legacy-AEM template family as Batch 1 (breadcrumb + `aem-GridColumn--default--7` main column), confirmed via samples before sweeping. All 24 pages handled by the existing `extract_detail_page.py` — no manual hub-page work needed this time (the 3 index pages `ins-inquiry`, `mbps`, `help-support` all matched the flow/grouped shapes already handled).

**New bugs found and fixed** (in addition to Batch 1's list — these are real content-type gaps, not batch-1-specific):
- **No image support at all.** `mbps/step-four` has legitimate content screenshots (not decorative chrome) — completely dropped. Added `<img>` handling to `extract_flow_parts` (emits `<p><img src alt></p>`) plus `copy_referenced_images()` in `main()`, which copies the scraped image files from the scrape temp dir's `images/` folder into a sibling `images/` folder next to the generated `.plain.html` (matching this project's existing image-placement convention).
- **`build_body_grouped` dropped all content after the *last* `anchoredtitle` group.** Batch 1's pages happened to end exactly at their last group, so this never surfaced. `mbps/step-four` has a whole extra paragraph (with a link) after its last group. Fixed by treating the flat trailing content after the last group the same way as the leading "intro" content, including applying the same back-to-top shift quirk (the last group's "Back to top" link, if any, is nested in the *trailing* content when there's no next group).
- **Some source pages have a genuinely empty breadcrumb component** (a content gap on the legacy site itself, e.g. `help-support/auto-ops-faq` — confirmed by inspecting the raw source, not a parser bug). Added `fallback_breadcrumb()`: builds the chain from the URL path, using a `KNOWN_ANCESTOR_LABELS` lookup (real labels collected from pages where the breadcrumb *is* present) for shared ancestors, and the page's own H1 for the final segment.
- **Accordion/FAQ-toggle widgets** (`<button class="-oneX-panel-button">` for the question, sibling panel `<div>` for the answer — distinct from the `-oneX-body--intro` plain-paragraph FAQ style already handled) — silently dropped every question, leaving only answers. Flattened to the same `<h3>` question + `<p>` answer treatment as the other FAQ style, trading the collapse/expand interaction for content that's fully visible and crawlable — consistent with how `edi-faq` was handled in Batch 1.
- `validate_coverage.py`'s coverage ratio undercounted image-heavy pages (stripped `<img>` tags without crediting their alt text) — gave a false-positive CHECK flag on `step-four` even after images were correctly extracted. Fixed to count each image's alt text (plus a fixed per-image marker) as content on both sides of the ratio.
- Extracted a reusable `tools/importer/scripts/sweep.sh <urls-file> [log-file]` from batch 1's inline sweep loop — scrapes + extracts + validates every URL in a list file. Use this for future batches instead of rewriting the loop each time.

### Status: Batch 2 complete

All 24 pages generated, coverage-validated, and spot-checked in the browser — including `mbps/step-four`'s images (render correctly) and the empty-breadcrumb fallback (`help-support/auto-ops-faq`, produces the correct real ancestor labels plus its own H1 for the current page). Shipped as PR #5 (base: batch-1 branch).

## Batch 3: `medical-ebilling/health-insurance` + `auto-work-comp` + top-level singletons (10 pages)

URL list: `tools/importer/urls-medical-ebilling-batch3.txt`. Branch `worktree-b2b-import-batch3`, stacked on `worktree-b2b-import-batch2`.

Same overall template family, confirmed via samples. All 10 pages handled by `extract_detail_page.py`.

**New bugs found and fixed:**
- **`medical-ebilling/med-mpp-cv` has no left-nav sidebar at all** — it's a standalone app-landing page, full-width (12-col) layout instead of the usual 7-col-next-to-3-col-leftnav split. `get_main_content_column` raised on every such page. Added a fallback: when no 7-col column exists, use everything between the breadcrumb `<nav>` and the footer experience fragment instead.
  - First attempt at this fallback used `html.find('</nav>')` (the *first* `</nav>` on the page) as the start boundary — but the site header has its own `<nav>` that closes long before the breadcrumb's, so this leaked raw header/breadcrumb markup into the body. Fixed to specifically match `<nav id="breadcrumb-...">...</nav>` and use *its* end position.
- **Generalized card-grid detection.** `med-mpp-cv` has the same "grid of link cards" component (`ds_dh-card`) already seen on the `edi-transactions` hub in Batch 1, but that one was built by hand. Added `extract_cards()` / `build_cards_html()` so this is now automatic: detects the component (in either of its two markup variants — plain, or wrapped in an icon-container row), and emits a `cards` block. Verified it reproduces the batch-1 `edi-transactions` hub's hand-built output when re-run through the new code.
  - The source duplicates each card's markup for responsive breakpoints (`med-mpp-cv` had every card appear twice in the DOM) — deduped by `(href, title)`, keeping the first occurrence.
  - An empty card description renders in source as a literal `&nbsp;` rather than being absent — treated as empty (matches the Batch 1 hand-built convention of omitting an empty description line).
- Added `Medical Billing` to `KNOWN_ANCESTOR_LABELS` (the real breadcrumb label for `/b2b-content/medical-ebilling`, used by the empty-breadcrumb fallback from Batch 2 — not hit in this batch, but collected for future batches since `medical-ebilling` subpages are done now).

### Status: Batch 3 complete

All 10 pages generated, coverage-validated, and spot-checked in the browser — including the `med-mpp-cv` cards page (2 unique cards, no duplication) and `health-insurance/safe-harbor` (a legal-document-style page with deeply nested numbered lists, renders correctly). Shipped as PR #6 (base: batch-2 branch).

## Batch 4: `claim-services` + `suppliers` + `select-service` + `acct-mgmt` + `electronic-payments/eft-remit-faq` + singletons (23 pages)

URL list: `tools/importer/urls-misc-batch4.txt`. Branch `worktree-b2b-import-batch4`, stacked on `worktree-b2b-import-batch3`. This is the last batch — 23 smaller/miscellaneous pages across the remaining sections that already had a top-level landing page migrated in earlier repo history.

**New bugs found and fixed** (the biggest batch for new content-type gaps — these sections apparently used more varied authoring than the `home-auto-lenders`/`medical-ebilling` sections):
- **`contact-us` has neither a left-nav (no 7-col) nor any breadcrumb component at all** (not even an empty one — the whole thing is absent). Added a third fallback tier to `get_main_content_column`: when both the 7-col column and the breadcrumb `<nav>` are missing, use the `<main>` tag itself as the content boundary (confirmed it appears exactly once on every page type checked so far, making it a safe outermost anchor).
- **A third `ds_dh-card` markup variant** (`select-service/ss-agreement`): the card's real label lives in sibling `<span class="-oneX-body--intro...">` elements, and the `<a>` is just a generic action link ("View PDF" / "Create PDF") — too different from the title-link+description model to represent as a `cards` block faithfully. Added a `GENERIC_TITLES` skip-list so `extract_cards()` recognizes and skips this variant, letting it fall through to the general flow extractor instead of misrepresenting the link text as the card's title.
- To handle that fallthrough correctly, `extract_flow_parts` needed two new capabilities it didn't have before:
  - Standalone `<span class="-oneX-body--intro...">` label text (not wrapped in a `<p>` or `<a>`) — promoted to `<h4>`.
  - Bare `<a href>` links that aren't wrapped in a `<p>` at all — previously silently dropped since every other page's links lived inside `<p>` or `<li>`.
- The bare-link addition surfaced a **"Back" chevron-icon navigation link** (page-level UI chrome, not content) that would otherwise leak as raw unstripped HTML (`clean_inline` only strips attributes from a small tag whitelist, so the icon `<div>`/`<h5>` markup inside it passed through verbatim). Filtered out any bare link containing the `-oneX-icon--chevron` icon class — same "skip nav/header/footer chrome" principle as everything else, per AGENTS.md scope.
- Re-verified no regression on Batch 1's `ach-payments` and Batch 3's `med-mpp-cv` after all of the above (both still produce byte-identical output).

### Status: Batch 4 complete — all batches done

All 23 pages generated, coverage-validated, and spot-checked in the browser — including `contact-us` (a large accordion FAQ page using the `<main>`-tag fallback, every section renders correctly) and `select-service/ss-agreement` (the new card-variant fallback: resource labels and PDF links all present, no raw HTML leakage, "Back" chrome correctly excluded).

This completes the migration except the `/b2b-content` homepage (see cluster inventory table above — out of scope for this pipeline).

## Post-migration: DA upload and a critical table bug (all 4 batches)

Uploading to DA requires an actual Adobe IMS login (`da-auth-helper`), which succeeded — a token was obtained and verified against `admin.da.live` for `adobedrago/statefarm-b2b-eds`. Uploading via `tools/importer/scripts/upload_to_da.py`:
- Wraps the bare-div `.plain.html` content in `<body><header></header><main>...</main><footer></footer></body>` at upload time — this is the real DA document format (confirmed against `references/html-content.md` in the `da-content` skill), distinct from the bare-div format committed to git (which exists specifically so `aem up --html-folder` local testing works without double-nesting).
- Rewrites `./images/<file>` references to absolute `content.da.live` URLs and pre-uploads the binaries, since DA requires image `src` to be a fetchable absolute URL (relative paths render as `<img src="about:error">`).
- Previews against each batch's own feature branch (e.g. `worktree-b2b-import-batch4`), not `main` — this avoids touching the shared main preview surface before the PRs are reviewed, and doubles as the working feature-preview link each PR's description promised (previously blocked on the same expired-token issue, now resolved).

**Critical bug found via this live DA testing, not catchable by local `--html-folder` testing** (which never exercises the real DA/EDS preview pipeline): every `<table>` in the generated HTML — used for all the reference/spec-format tables across the migration (FIELD/DESCRIPTION/SIZE/CONTENT-style tables) — was silently destroyed on upload. DA's `md2da` preview-pipeline conversion treats *every* `<table>` as a block-authoring attempt: it reads the first header cell's text as a block name (e.g. "FIELD" → `<div class="field">`) and discards the rest of the header row, regardless of whether the table was ever intended as a block. The data rows survived, but every column label except the first vanished, and the surviving content rendered as unstyled, illegible stacked divs. Confirmed by uploading `ach-payments` and screenshotting the live `aem.page` render.

There is no way to author a plain multi-column data table as default content in DA/EDS — `extract_detail_page.py`'s `table_to_list()` now converts each table into a header-labeled `<ul><li>` list instead (e.g. `<strong>FIELD:</strong> 2 — <strong>DESCRIPTION:</strong> Priority Code — ...`) — verbose, but preserves every field with zero ambiguity. Verified correct on DA for both a 4-column table (`ach-payments`, 6 tables) and a 2-column table (`paid-in-full`). All 30 pages across all 4 batches that contained a `<table>` were regenerated and re-committed as a follow-up fix commit on each existing branch/PR (no new PRs — this landed as an additional commit on #4, #5, #6, #7).

A secondary regex bug surfaced while writing `table_to_list()`: `<th[^>]*>` also matches the start of `<thead ...>` (since `"th"` is a literal prefix of `"thead"`), swallowing everything up to the real `</th>` as bogus header-label content. Fixed with a word boundary (`<th\b[^>]*>`).

**Status: bug fixed, regenerated, and pushed to all 4 branches. Bulk DA upload of all 92 pages has NOT happened yet** — only a handful of validation pages were pushed during testing (`what-is-edi-eft`, `ach-payments`, `med-mpp-cv`, `mbps/step-four`), all to the `worktree-b2b-import-batch4` preview branch, all confirmed rendering correctly. The full 92-page upload is a separate, deliberate next step.
