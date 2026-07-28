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
| `home-auto-lenders/edi-transactions` | 35 | **Done — Batch 1 PR open, awaiting review** |
| `home-auto-lenders/ins-inquiry` | 12 | Not started |
| `home-auto-lenders/mbps` | 6 | Not started |
| `home-auto-lenders/help-support` | 6 | Not started |
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

### Handoff note for user review

Per user's chosen pacing ("pilot one batch first"): stopping here for review. Do not start Batch 2 until the user reviews this PR.
