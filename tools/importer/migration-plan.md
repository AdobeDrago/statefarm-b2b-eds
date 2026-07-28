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
| `home-auto-lenders/ins-inquiry` | 12 | **Done — Batch 2, PR pending (base: batch-1 branch)** |
| `home-auto-lenders/mbps` | 6 | **Done — Batch 2** |
| `home-auto-lenders/help-support` | 6 | **Done — Batch 2** |
| `medical-ebilling/health-insurance` | 4 | Not started |
| `medical-ebilling/auto-work-comp` | 4 | Not started |
| `claim-services/personal-property` | 3 | Not started |
| `suppliers/suppliers-coupa` | 2 | Not started |
| `claim-services` (top-level pages) | ~6 | Not started |
| `select-service` | 4 | Not started |
| `medical-ebilling` (top-level pages) | 3 | Not started |
| `suppliers` (top-level pages) | 3 | Not started |
| `acct-mgmt` | 4 | Not started |
| `electronic-payments` | 2 | Not started |
| Singletons (`contact-us`, `terms-of-use`, `other-ins-carrier`, `home-auto-lenders` index) | 4 | Not started |

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

All 24 pages generated, coverage-validated, and spot-checked in the browser — including `mbps/step-four`'s images (render correctly) and the empty-breadcrumb fallback (`help-support/auto-ops-faq`, produces the correct real ancestor labels plus its own H1 for the current page).
