# icon-text block — design spec

## Problem

`/b2b-content/acct-mgmt` was migrated from the original AEM site
(`https://b2b.statefarm.com/b2b-content/acct-mgmt`) as flat default content
(`h1`/`h3`/`p`/`a`). The original page uses a repeating "pictogram-text"
pattern — a 120px icon, a heading, a description, and a stack of bold red
links — three times on the page (login help, admin roles, registration
help). The flattened migration dropped the icons entirely (they were CSS
`background-image`s on a `div[data-pictogram]`, not `<img>` tags, so the
import tooling had nothing to pick up) and lost the icon/text pairing.

Verified against the live original page (Playwright, computed styles):

| Element | Value |
|---|---|
| Icon | 120×120px, `background-image` SVG, top-aligned with heading |
| Heading | 31px desktop, weight 500, `color: rgb(64,60,60)`, `MecherleSans` |
| Description | 16px, weight 400, `color: rgb(59,59,59)` |
| Link | 16px, weight 600, `color: rgb(214,35,17)`, no underline |
| Vertical gap between items | 3.5rem desktop, 2.5rem ≤991px |
| Icon size ≤991px | 64×64px |

This repo's global tokens already match the original almost exactly:
`--link-color: #d62311` (= `rgb(214,35,17)`), `--text-color: #3b3b3b`
(= `rgb(59,59,59)`), `--heading-font-family: MecherleSans, Arial,
sans-serif`. No new CSS variables are needed — only block-local rules for
layout (icon size/position, gap) and link weight/list-style.

## Content model

New block `icon-text`. One table row per item, two cells:

- **Cell 1**: an icon token, e.g. `:question:` — the standard EDS
  convention (a bare `:name:` in a paragraph is auto-converted to
  `<span class="icon icon-name">` by the content pipeline before block JS
  runs, same as already relied on in `blocks/cards-service`).
- **Cell 2**: an `<h3>` heading, a `<p>` description, and a `<ul><li><a></li></ul>`
  link list (unstyled — no bullets — to match the original's plain stacked
  links).

Example authored table (3 rows for this page):

| icon-text | |
|---|---|
| `:question:` | ### Having Trouble Logging In?<br>Our self-service options make it easy to unlock your account, or retrieve your password or B2BUser ID immediately, without calling.<br>- [Forgot B2B User ID](https://forgot-id-pwd.b2b.statefarm.com/forgot-id)<br>- [Forgot Password](https://forgot-id-pwd.b2b.statefarm.com/forgot-password)<br>- [Multi-Factor Authentication (MFA) FAQ](/b2b-content/acct-mgmt/mfa-faq)<br>- [Are you a new Shop Manager or Staff for a Body Shop and need to Register?](https://selfvouch.b2b.statefarm.com) |
| `:mobile-home:` | ### Admin roles and responsibilities<br>Learn more about the capabilities and duties of an administrator, including how to become one and how to assist other members of your company in accessing State Farm B2B.<br>- [What Can I Do As Admin?](/b2b-content/acct-mgmt/admin-roles#adminRole)<br>- [Can A Company Have More Than One?](/b2b-content/acct-mgmt/admin-roles#coAdmins) |
| `:post-mail:` | ### Did you get your registration email?<br>Lose your registration email? Never got one? We can help!<br>- [Start New Registration](https://forms.b2b.statefarm.com/contact-us)<br>- [Resend a Registration Email](https://forms.b2b.statefarm.com/resend-invite)<br>- [About Registration](/b2b-content/acct-mgmt/register-help) |

The page's existing `<h1>Account Management</h1>` and breadcrumbs stay as
default content above the block — they aren't part of the repeating
pattern.

## Block implementation

`blocks/icon-text/icon-text.js`:
- For each row: locate the `span.icon` in cell 1, class it
  `icon-text-icon`; class cell 2 `icon-text-body`.
- Call `decorateIcons(block)` (from `scripts/aem.js`) to resolve icon spans
  into `<img>` tags, same as `cards-service` already does.
- No dropdown/grid logic — this is a simple vertical list, not cards.

`blocks/icon-text/icon-text.css`:
- `.icon-text > div` (row): flex, `align-items: flex-start`, `gap: 20px`,
  stacked with `margin-bottom: 40px` (mobile) / `56px` at `min-width: 900px`.
- `.icon-text-icon`: fixed `64px` square (mobile) / `120px` square at
  `min-width: 900px`; `flex: none`.
- `.icon-text-body`: heading/paragraph inherit global styles as-is (no
  override needed — global tokens already match).
- `.icon-text-body ul`: `list-style: none`, `margin/padding: 0`.
- `.icon-text-body ul a`: `font-weight: 600` (global `a:any-link` already
  supplies the correct color and no-underline).

## Icons

Original pictograms are State Farm's own CDN assets, not present in this
repo. Download and commit as optimized SVGs, following the existing
`icons/*.svg` convention:
- `icons/question.svg` ← `pictogram_question.svg`
- `icons/mobile-home.svg` ← `pictogram_mobile-home.svg`
- `icons/post-mail.svg` ← `pictogram_post-mail.svg`

## Testing

- Local: build a `drafts/acct-mgmt.html` fixture using the table markup
  above, serve with `--html-folder drafts`, visually compare against the
  screenshot captured from the live original page.
- Lint: `npm run lint`.

## DA content rollout

Once the block is verified locally:
1. Refresh DA auth if the cached token is expired.
2. Pull the current `acct-mgmt` DA source.
3. Replace the three flat `h3`/`p`/`a` sequences with the `icon-text` block
   table (keep the `h1` and breadcrumbs untouched).
4. Push via the DA Source API, preview, and visually diff the preview URL
   against the live original page.

## Out of scope

- Redesigning any other page's flat content.
- Changing the breadcrumbs component.
- Any global CSS variable additions (none are needed).
