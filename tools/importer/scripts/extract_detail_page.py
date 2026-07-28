#!/usr/bin/env python3
"""
Converts one scraped b2b.statefarm.com "detail" page (title + intro text +
N repeating [heading + data table + Back to top link] groups) into the
project's default-content .plain.html format.

This encodes the template locked in on the batch-1 representative page
(home-auto-lenders/edi-transactions/daily-811-notifications/ach-payments):
see tools/importer/migration-plan.md.

Usage:
  python3 extract_detail_page.py <cleaned.html> <metadata.json> <output.plain.html>
"""
import json
import os
import re
import shutil
import sys


def balanced_div(html, start):
    """Given the index of an opening <div ...>, return the substring up to
    (and including) its matching closing </div>."""
    tag_re = re.compile(r'<div\b|</div>')
    depth = 0
    for m in tag_re.finditer(html, start):
        depth += 1 if m.group().startswith('<div') else -1
        if depth == 0:
            return html[start:m.end()]
    raise ValueError('unbalanced <div> starting at %d' % start)


def strip_attrs(html, tags):
    return re.sub(
        r'<(%s)\b[^>]*>' % '|'.join(tags),
        lambda m: '<%s>' % m.group(1),
        html,
    )


def table_to_list(table_html):
    """DA's preview pipeline treats every <table> as a block-authoring
    attempt: it reads the first header cell's text as a block name and
    silently discards the rest of the header row, regardless of whether
    the header is a genuine single-cell block title or a real multi-column
    label row. For a plain multi-column reference table (e.g. FIELD /
    DESCRIPTION / SIZE / CONTENT), that destroys the column labels
    entirely — confirmed empirically by uploading ach-payments to DA and
    finding the delivered HTML had lost every header cell except the
    first, converted into a meaningless `<div class="field">` wrapper.
    There's no way to author a plain data table as default content in
    DA/EDS, so represent each row as a header-labeled list item instead —
    verbose, but preserves every field with no ambiguity."""
    header_cells = [
        clean_inline(m.group(1))
        for m in re.finditer(r'<th\b[^>]*>(.*?)</th>', table_html, re.S)
    ]
    rows = []
    tbody_m = re.search(r'<tbody[^>]*>(.*?)</tbody>', table_html, re.S)
    tbody_html = tbody_m.group(1) if tbody_m else table_html
    for tr_m in re.finditer(r'<tr[^>]*>(.*?)</tr>', tbody_html, re.S):
        cells = [clean_inline(m.group(1)) for m in re.finditer(r'<td[^>]*>(.*?)</td>', tr_m.group(1), re.S)]
        if not cells:
            continue
        parts = []
        for i, cell in enumerate(cells):
            label = header_cells[i] if i < len(header_cells) else None
            parts.append(f'<strong>{label}:</strong> {cell}' if label else cell)
        rows.append(f'<li>{" &mdash; ".join(parts)}</li>')
    return f'<ul>{"".join(rows)}</ul>' if rows else ''


def clean_inline(html):
    """Keep b/i/a formatting, strip everything else's attributes except href."""
    html = re.sub(r'<a\b[^>]*href="([^"]*)"[^>]*>', r'<a href="\1">', html)
    html = strip_attrs(html, ['b', 'i', 'p'])
    html = re.sub(r'\s+', ' ', html)
    return html.strip()


def get_breadcrumb(html):
    m = re.search(r'<nav id="breadcrumb-[^"]*">(.*?)</nav>', html, re.S)
    if not m:
        return []
    items = []
    for li in re.finditer(r'<li>\s*<a([^>]*)>(.*?)</a>\s*</li>', m.group(1), re.S):
        attrs, inner = li.groups()
        href_m = re.search(r'href="([^"]*)"', attrs)
        text_m = re.search(r'<span class="-oneX-breadcrumbs-link-name">\s*(.*?)\s*</span>', inner, re.S)
        text = re.sub(r'\s+', ' ', (text_m.group(1) if text_m else inner)).strip()
        href = href_m.group(1) if href_m else None
        items.append((text, href))
    return items


def get_h1(html):
    m = re.search(r'<div class="xd-title">\s*<h2 class="comp-heading">\s*(?:<span[^>]*>)?\s*(.*?)\s*(?:</span>)?\s*</h2>', html, re.S)
    if m:
        return re.sub(r'\s+', ' ', m.group(1)).strip()
    return None


def get_main_content_column(html):
    """Most pages have a left-nav sidebar, so main content lives in the
    7-col column next to it. Some pages (e.g. standalone app-landing
    pages like medical-ebilling/med-mpp-cv) have no left-nav and are
    full-width instead — fall back to everything between the breadcrumb
    nav and the footer experience fragment."""
    idx = html.find('aem-GridColumn--default--7')
    if idx != -1:
        div_start = html.rfind('<div', 0, idx)
        return balanced_div(html, div_start)

    breadcrumb_nav_m = re.search(r'<nav id="breadcrumb-[^"]*">.*?</nav>', html, re.S)
    footer_start = html.find('cmp-experiencefragment--footer')
    end = footer_start if footer_start != -1 else len(html)
    if breadcrumb_nav_m:
        return html[breadcrumb_nav_m.end():end]

    # some pages (e.g. contact-us) have neither a breadcrumb component nor
    # a left-nav — <main> reliably appears exactly once on every page
    # checked so far, so use it as the outermost fallback boundary
    main_start = html.find('<main')
    if main_start != -1:
        return html[main_start:end]
    raise ValueError('main content column (7-col) not found, and no breadcrumb nav or <main> to fall back from')


def clean_list(list_html):
    # a table can be nested inside a <li> (e.g. a numbered-instructions
    # list where one step embeds a lookup table) — convert those the same
    # unsafe-for-DA way as top-level tables before stripping attrs, or the
    # raw <table> passes through untouched since this function doesn't
    # otherwise recurse into cell content
    t = re.sub(r'<table\b.*?</table>', lambda m: table_to_list(m.group(0)), list_html, flags=re.S)
    t = re.sub(r'<a\b[^>]*href="([^"]*)"[^>]*>', r'<a href="\1">', t)
    t = strip_attrs(t, ['ul', 'ol', 'li', 'b', 'i'])
    t = re.sub(r'>\s+<', '><', t)
    return t.strip()


FLOW_PATTERN = re.compile(
    r'<(h[1-6])\b[^>]*>(.*?)</\1>'
    r'|<p\b([^>]*)>(.*?)</p>'
    r'|(<table\b.*?</table>)'
    r'|(<(?:ul|ol)\b.*?</(?:ul|ol)>)'
    r'|<button\b[^>]*-oneX-panel-button[^>]*>(.*?)</button>'
    r'|(<img\b[^>]*>)'
    r'|<span\b[^>]*-oneX-body--intro[^>]*>(.*?)</span>'
    r'|<a[^>]*>\s*Back to top\s*</a>'
    r'|(<a\b[^>]*href="[^"]*"[^>]*>.*?</a>)',
    re.S,
)


def extract_flow_parts(html_fragment):
    """Walk headings, paragraphs, tables, lists, accordion-question buttons
    and back-to-top links in document order — the shared content model for
    both a plain page and a single group within an anchoredtitle-wrapped
    page. Accordion widgets (source class "-oneX-panel-button") are
    flattened to a heading + the answer paragraph that already follows it
    in document order — same treatment as the plain-paragraph FAQ style
    (see -oneX-body--intro below), trading the collapse/expand interaction
    for content that's fully visible and crawlable by default; consistent
    with how the edi-faq page was handled in Batch 1."""
    parts = []
    for m in FLOW_PATTERN.finditer(html_fragment):
        (h_tag, h_inner, p_attrs, p_inner, table_html, list_html,
         button_inner, img_tag, span_text, bare_link) = m.groups()
        if h_tag:
            text = clean_inline(h_inner)
            if text:
                parts.append(f'<h3>{text}</h3>')
        elif button_inner is not None:
            text = clean_inline(button_inner)
            if text:
                parts.append(f'<h3>{text}</h3>')
        elif img_tag:
            src_m = re.search(r'src="([^"]*)"', img_tag)
            alt_m = re.search(r'alt="([^"]*)"', img_tag)
            if src_m:
                alt = alt_m.group(1) if alt_m else ''
                parts.append(f'<p><img src="{src_m.group(1)}" alt="{alt}"></p>')
        elif span_text is not None:
            # standalone label span (source class "-oneX-body--intro*"),
            # seen outside a <p>/<a> wrapper — e.g. a resource-card's title
            # text split across sibling spans rather than one link
            text = clean_inline(span_text)
            if text:
                parts.append(f'<h4>{text}</h4>')
        elif p_inner is not None:
            text = clean_inline(p_inner)
            if not text or text in ('<br>', '<br/>', '<br />'):
                pass
            # a "Back to top" link is usually bare (caught by the dedicated
            # alternative below), but is occasionally wrapped in its own
            # <p> — normalize its href the same way regardless, since the
            # original absolute+anchor href can carry a case-sensitive path
            # segment that doesn't match DA's lowercased live path
            elif re.fullmatch(r'<a href="[^"]*">\s*Back to top\s*</a>', text):
                parts.append('<p><a href="#top">Back to top</a></p>')
            # source marks FAQ-style question paragraphs with this class —
            # promote to a real heading for proper heading hierarchy
            elif p_attrs and '-oneX-body--intro' in p_attrs:
                parts.append(f'<h3>{text}</h3>')
            else:
                parts.append(f'<p>{text}</p>')
        elif table_html:
            rendered = table_to_list(table_html)
            if rendered:
                parts.append(rendered)
        elif list_html:
            parts.append(clean_list(list_html))
        elif bare_link:
            # "Back" chevron-icon links are page-level nav chrome (like
            # header/footer), not authored content — skip. clean_inline
            # doesn't strip unknown block tags (div/h5 used for icon
            # markup), so without this check they'd leak as raw HTML soup.
            if '-oneX-icon--chevron' in bare_link:
                pass
            else:
                text = clean_inline(bare_link)
                if text:
                    parts.append(f'<p>{text}</p>')
        elif m.group(0).strip():
            parts.append('<p><a href="#top">Back to top</a></p>')
    return parts


def extract_groups(groups_html):
    """Split on top-level <div class="anchoredtitle title"> blocks and pull
    each group's full content (headings/paragraphs/tables/lists) via
    extract_flow_parts, plus whether it contains a "Back to top" link, plus
    any flat (non-grouped) trailing content after the last group.

    Quirk in the source markup: a group's own "Back to top" link is not
    nested inside that group's div — it sits at the start of the *next*
    group's div instead (or, for the last group, in the flat trailing
    content after all groups end). So the backtotop flag detected on
    group[i] (or on the trailing content) is shifted back to belong at
    the end of group[i-1]'s content."""
    starts = [m.start() for m in re.finditer(r'<div class="anchoredtitle title">', groups_html)]
    raw = []
    last_end = 0
    for start in starts:
        block = balanced_div(groups_html, start)
        last_end = start + len(block)
        backtotop = bool(re.search(r'>\s*Back to top\s*<', block))
        block_no_backtotop = re.sub(r'<a[^>]*>\s*Back to top\s*</a>', '', block)
        parts = extract_flow_parts(block_no_backtotop)
        raw.append((parts, backtotop))

    trailing_html = groups_html[last_end:]
    trailing_backtotop = bool(re.search(r'>\s*Back to top\s*<', trailing_html))
    trailing_no_backtotop = re.sub(r'<a[^>]*>\s*Back to top\s*</a>', '', trailing_html)
    trailing_parts = extract_flow_parts(trailing_no_backtotop)

    out = []
    for i, (parts, _) in enumerate(raw):
        if i + 1 < len(raw):
            belongs_to_next = raw[i + 1][1]
        else:
            belongs_to_next = trailing_backtotop
        out.append((parts, belongs_to_next))
    return out, trailing_parts


def build_body_grouped(main_col_html):
    """For pages using the 'anchoredtitle title' component to wrap each
    content group (e.g. multi-record file-format pages like ach-payments,
    or hub/overview pages with a single unwrapped group)."""
    first_group_idx = main_col_html.find('<div class="anchoredtitle title">')
    intro_html = main_col_html[:first_group_idx]
    groups_html = main_col_html[first_group_idx:]

    parts = extract_flow_parts(intro_html)
    groups, trailing_parts = extract_groups(groups_html)
    if not groups:
        raise ValueError('extract_groups found 0 groups — template mismatch, needs manual handling')

    for group_parts, backtotop in groups:
        parts.extend(group_parts)
        if backtotop:
            parts.append('<p><a href="#top">Back to top</a></p>')
    parts.extend(trailing_parts)
    return '\n'.join(parts)


def build_body_flow(main_col_html):
    """Generic fallback for simpler pages that are just a plain document-
    order flow of headings, paragraphs, lists and tables — no anchoredtitle
    wrapper, no back-to-top shift quirk."""
    parts = extract_flow_parts(main_col_html)
    if not parts:
        raise ValueError('build_body_flow found no content — template mismatch, needs manual handling')
    return '\n'.join(parts)


def extract_cards(html):
    """Detect the source's "ds_dh-card" link-card component (title link +
    description, seen in two markup variants — plain, and wrapped in an
    icon-container row) and pull out (href, title, description) triples.
    Confirmed on both the edi-transactions hub (Batch 1, built by hand)
    and medical-ebilling/med-mpp-cv (Batch 3) — same component, reused
    across the site for "grid of link cards" sections."""
    # a third markup variant (seen on select-service/ss-agreement) uses this
    # same "ds_dh-card" component for a resource-link card where the real
    # label lives in <span>s and the <a> is just a generic "View PDF" /
    # "Create PDF" action — too different from the title-link+description
    # model to represent as a `cards` block faithfully. Recognize and skip
    # these (they fall through to extract_flow_parts instead, which knows
    # how to render the <span> labels and the action link).
    GENERIC_TITLES = {'view pdf', 'create pdf', 'download', 'download pdf', 'click here'}

    cards = []
    spans = []
    seen = set()
    for m in re.finditer(r'<div class="ds_dh-card[^"]*">', html):
        block = balanced_div(html, m.start())
        span = (m.start(), m.start() + len(block))
        link_m = re.search(r'<a\b[^>]*href="([^"]*)"[^>]*>(.*?)</a>', block, re.S)
        desc_m = re.search(r'<div class="-oneX-cards-body">\s*<p>(.*?)</p>', block, re.S)
        if not link_m:
            continue
        href, title = link_m.groups()
        title = clean_inline(title)
        if title.lower() in GENERIC_TITLES:
            continue
        desc = clean_inline(desc_m.group(1)) if desc_m else ''
        if desc in ('&nbsp;', ''):
            desc = ''
        # source duplicates card markup for responsive breakpoints (seen on
        # med-mpp-cv: same 2 cards appear twice) — dedupe by (href, title)
        key = (href, title)
        spans.append(span)
        if key in seen:
            continue
        seen.add(key)
        cards.append((href, title, desc))
    return cards, spans


def build_cards_html(cards):
    items = '\n'.join(
        '    <div>\n'
        '      <div>\n'
        f'        <p><a href="{href}">{title}</a></p>\n'
        + (f'        <p>{desc}</p>\n' if desc else '')
        + '      </div>\n'
        '    </div>'
        for href, title, desc in cards
    )
    return f'<div class="cards">\n{items}\n</div>'


def build_body(main_col_html):
    cards, spans = extract_cards(main_col_html)
    if cards:
        # strip the matched card spans out before running the rest through
        # normal flow extraction, so surrounding prose (if any) isn't lost
        # and the raw card markup doesn't get double-picked-up as text
        remaining = []
        pos = 0
        for start, end in spans:
            remaining.append(main_col_html[pos:start])
            pos = end
        remaining.append(main_col_html[pos:])
        rest_html = ''.join(remaining)

        rest_parts = extract_flow_parts(rest_html) if rest_html.strip() else []
        return '\n'.join([*rest_parts, build_cards_html(cards)])
    if '<div class="anchoredtitle title">' in main_col_html:
        return build_body_grouped(main_col_html)
    return build_body_flow(main_col_html)


def build_breadcrumb_html(crumbs):
    lis = '\n'.join(
        f'          <li><a href="{href}">{text}</a></li>'
        for text, href in crumbs
    )
    return (
        '<div>\n'
        '  <div class="breadcrumbs">\n'
        '    <div>\n'
        '      <div>\n'
        '        <ul>\n'
        f'{lis}\n'
        '        </ul>\n'
        '      </div>\n'
        '    </div>\n'
        '  </div>\n'
        '</div>'
    )


def build_metadata_html(title, description, tags):
    rows = [('title', title), ('description', description)]
    if tags:
        rows.append(('tags', tags))
    rows_html = '\n'.join(
        f'    <div>\n      <div>{k}</div>\n      <div>{v}</div>\n    </div>'
        for k, v in rows if v
    )
    return (
        '<div>\n'
        '  <div class="metadata">\n'
        f'{rows_html}\n'
        '  </div>\n'
        '</div>'
    )


def humanize_slug(slug):
    words = slug.replace('_', '-').split('-')
    words = ['FAQ' if w.lower() == 'faq' else w.capitalize() for w in words]
    return ' '.join(words)


# Real ancestor breadcrumb labels, collected from pages where the source
# breadcrumb component was present (most pages). Used by fallback_breadcrumb
# so a sibling page's missing breadcrumb still gets the site's actual wording
# for shared ancestors, not a slug-derived guess.
KNOWN_ANCESTOR_LABELS = {
    '/b2b-content': 'B2B',
    '/b2b-content/home-auto-lenders': 'Home & Auto Lenders',
    '/b2b-content/home-auto-lenders/edi-transactions': 'EDI transactions',
    '/b2b-content/home-auto-lenders/edi-transactions/daily-811-notifications': 'Daily EDI mortgagee notification overview',
    '/b2b-content/home-auto-lenders/edi-transactions/mortgage-record-chg': 'Mortgage Record Change',
    '/b2b-content/home-auto-lenders/help-support': 'Help & Support',
    '/b2b-content/home-auto-lenders/ins-inquiry': 'Insurance Inquiry',
    '/b2b-content/home-auto-lenders/mbps': 'Mortgage Billing & Payment System',
    '/b2b-content/claim-services': 'Claim Services',
    '/b2b-content/select-service': 'Select Service',
    '/b2b-content/suppliers': 'Suppliers',
    '/b2b-content/medical-ebilling': 'Medical Billing',
}


def fallback_breadcrumb(document_path, current_page_label):
    """Some source pages ship with a genuinely empty breadcrumb component
    (a content gap on the legacy site, not a parser bug — confirmed by
    inspecting the raw source for home-auto-lenders/help-support/auto-ops-faq).
    Derive a best-effort chain from the URL path instead of failing, using
    known real labels for shared ancestors and the page's own H1 (passed in
    as current_page_label) for the final, usually-unique segment."""
    segments = [s for s in document_path.split('/') if s]
    crumbs = []
    path = ''
    for i, seg in enumerate(segments):
        path = f'{path}/{seg}'
        is_last = i == len(segments) - 1
        fallback_label = (current_page_label if is_last else None) or humanize_slug(seg)
        label = KNOWN_ANCESTOR_LABELS.get(path) or fallback_label
        crumbs.append((label, path))
    return crumbs


def copy_referenced_images(doc_html, cleaned_html_path, out_path):
    """Content images (scraped to a sibling ./images/ folder next to
    cleaned.html, already downloaded by scrape-webpage) need to land in a
    sibling ./images/ folder next to the generated .plain.html too."""
    srcs = set(re.findall(r'<img src="\./images/([^"]+)"', doc_html))
    if not srcs:
        return 0
    src_dir = os.path.join(os.path.dirname(cleaned_html_path), 'images')
    dest_dir = os.path.join(os.path.dirname(out_path), 'images')
    os.makedirs(dest_dir, exist_ok=True)
    copied = 0
    for name in srcs:
        src_file = os.path.join(src_dir, name)
        if os.path.isfile(src_file):
            shutil.copy2(src_file, os.path.join(dest_dir, name))
            copied += 1
        else:
            print(f'WARNING: referenced image not found in scrape output: {src_file}')
    return copied


def main():
    cleaned_html_path, metadata_json_path, out_path = sys.argv[1:4]
    html = open(cleaned_html_path, encoding='utf-8', errors='ignore').read()
    metadata = json.load(open(metadata_json_path, encoding='utf-8'))

    h1 = get_h1(html)
    crumbs = get_breadcrumb(html)
    if not crumbs:
        crumbs = fallback_breadcrumb(metadata['paths']['documentPath'], h1)
        print(f'WARNING: no breadcrumb in source, used slug-derived fallback for {metadata["paths"]["documentPath"]}')
    # last crumb should point at the current page; keep as-is (matches
    # existing sibling files' convention of self-linking the final crumb)
    last_text, last_href = crumbs[-1]
    if not last_href:
        crumbs[-1] = (last_text, metadata['paths']['documentPath'])

    h1 = h1 or last_text
    main_col = get_main_content_column(html)
    body_html = build_body(main_col)

    title = metadata['metadata'].get('title', '').strip()
    description = metadata['metadata'].get('description', '').strip()
    keywords = metadata['metadata'].get('keywords', '').strip()
    tags = ', '.join(t.strip() for t in keywords.split(',') if t.strip())

    doc = '\n'.join([
        build_breadcrumb_html(crumbs),
        '<div>',
        f'  <h1>{h1}</h1>',
        body_html,
        '</div>',
        build_metadata_html(title, description, tags),
    ])

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(doc + '\n')

    image_count = copy_referenced_images(doc, cleaned_html_path, out_path)

    list_count = doc.count('<ul>')
    heading_count = len(re.findall(r'<h3>', doc))
    print(f'wrote {out_path} ({len(doc)} chars, {heading_count} h3 headings, {list_count} lists, {image_count} images)')


if __name__ == '__main__':
    main()
