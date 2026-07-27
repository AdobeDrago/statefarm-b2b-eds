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
| `home-auto-lenders/edi-transactions` | 35 | **In progress — Batch 1** |
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

Confirmed via curl diff of 3 sample pages (`ach-payments`, `vacancy`, `paid-in-full`) before starting the skill: identical head/chrome, identical body shape — `#b2b-edge-content` containing a left-nav sidebar (`.leftnav`) plus one `.htmlComponent` with a title + rich text/table body (`.text-content-module`). Per David's Model this likely maps to **default content** (H1 + paragraphs/tables), no new block — to be confirmed during authoring-analysis on the representative page.

Two structural sub-shapes exist within the cluster:
- **Detail pages** (~30): single-topic explanation, matches the shape above. Representative: `mortgage-record-chg/vacancy` or `daily-811-notifications/ach-payments`.
- **Hub/index pages** (~5: `edi-transactions`, `auto811files`, `daily-811-notifications`, `mortgage-record-chg`, `edi-faq`): list/link to child pages, smaller DOM (508 vs ~618-938 tag lines). May need a distinct (likely still-simple) treatment — check when reached.

### Per-page status

Legend: `pending` / `scraped` / `imported` / `previewed` / `done`

| # | URL (path suffix) | Shape | Status |
|---|---|---|---|
| 1 | `edi-transactions` | hub | pending |
| 2 | `edi-transactions/auto811files` | hub | pending |
| 3 | `edi-transactions/auto811files/811autoTest` | detail | pending |
| 4 | `edi-transactions/auto811files/997acknowledgement` | detail | pending |
| 5 | `edi-transactions/auto811files/exampleTransactionSet` | detail | pending |
| 6 | `edi-transactions/daily-811-notifications` | hub | pending |
| 7 | `edi-transactions/daily-811-notifications/3rd-party-transmit` | detail | pending |
| 8 | `edi-transactions/daily-811-notifications/ach-payments` | detail | **representative — pending** |
| 9 | `edi-transactions/daily-811-notifications/edi-survey` | detail | pending |
| 10 | `edi-transactions/daily-811-notifications/examples-811` | detail | pending |
| 11 | `edi-transactions/daily-811-notifications/examples-820` | detail | pending |
| 12 | `edi-transactions/daily-811-notifications/examples-997` | detail | pending |
| 13 | `edi-transactions/daily-811-notifications/federal-wire-payments` | detail | pending |
| 14 | `edi-transactions/daily-811-notifications/individual-notifications` | detail | pending |
| 15 | `edi-transactions/daily-811-notifications/reason-codes` | detail | pending |
| 16 | `edi-transactions/daily-811-notifications/specific-instructions` | detail | pending |
| 17 | `edi-transactions/edi-faq` | hub | pending |
| 18 | `edi-transactions/mortgage-record-chg` | hub | pending |
| 19 | `edi-transactions/mortgage-record-chg/acquisition` | detail | pending |
| 20 | `edi-transactions/mortgage-record-chg/add-investor` | detail | pending |
| 21 | `edi-transactions/mortgage-record-chg/clause-change` | detail | pending |
| 22 | `edi-transactions/mortgage-record-chg/comlete-foreclose` | detail | pending |
| 23 | `edi-transactions/mortgage-record-chg/deed-in-lieu` | detail | pending |
| 24 | `edi-transactions/mortgage-record-chg/del-investor` | detail | pending |
| 25 | `edi-transactions/mortgage-record-chg/due-not-billed` | detail | pending |
| 26 | `edi-transactions/mortgage-record-chg/errors-corrections` | detail | pending |
| 27 | `edi-transactions/mortgage-record-chg/escrow-status` | detail | pending |
| 28 | `edi-transactions/mortgage-record-chg/incomplete-foreclosure` | detail | pending |
| 29 | `edi-transactions/mortgage-record-chg/loan-num-change` | detail | pending |
| 30 | `edi-transactions/mortgage-record-chg/loan-origination` | detail | pending |
| 31 | `edi-transactions/mortgage-record-chg/paid-in-full` | detail | pending |
| 32 | `edi-transactions/mortgage-record-chg/portfolio-audit` | detail | pending |
| 33 | `edi-transactions/mortgage-record-chg/service-released` | detail | pending |
| 34 | `edi-transactions/mortgage-record-chg/servicer-change` | detail | pending |
| 35 | `edi-transactions/mortgage-record-chg/vacancy` | detail | pending |

### Next step

Run the `page-import` skill's full pipeline on page 8 (`ach-payments`) to lock the content model, then sweep the remaining `detail` pages, then handle the 5 `hub` pages.

### Handoff note for user review (after Batch 1 completes)

Per user's chosen pacing ("pilot one batch first"): stop after Batch 1 is fully imported, previewed, and a PR is open. Do not start Batch 2 until the user reviews.
