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
import re
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


def clean_table(table_html):
    t = strip_attrs(table_html, ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'p', 'ul', 'li'])
    t = re.sub(r'>\s+<', '><', t)
    return t.strip()


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
    idx = html.find('aem-GridColumn--default--7')
    if idx == -1:
        raise ValueError('main content column (7-col) not found')
    div_start = html.rfind('<div', 0, idx)
    return balanced_div(html, div_start)


def clean_list(list_html):
    t = re.sub(r'<a\b[^>]*href="([^"]*)"[^>]*>', r'<a href="\1">', list_html)
    t = strip_attrs(t, ['ul', 'ol', 'li', 'b', 'i'])
    t = re.sub(r'>\s+<', '><', t)
    return t.strip()


FLOW_PATTERN = re.compile(
    r'<(h[1-6])\b[^>]*>(.*?)</\1>'
    r'|<p\b([^>]*)>(.*?)</p>'
    r'|(<table\b.*?</table>)'
    r'|(<(?:ul|ol)\b.*?</(?:ul|ol)>)'
    r'|<a[^>]*>\s*Back to top\s*</a>',
    re.S,
)


def extract_flow_parts(html_fragment):
    """Walk headings, paragraphs, tables, lists and back-to-top links in
    document order — the shared content model for both a plain page and
    a single group within an anchoredtitle-wrapped page."""
    parts = []
    for m in FLOW_PATTERN.finditer(html_fragment):
        h_tag, h_inner, p_attrs, p_inner, table_html, list_html = m.groups()
        if h_tag:
            text = clean_inline(h_inner)
            if text:
                parts.append(f'<h3>{text}</h3>')
        elif p_inner is not None:
            text = clean_inline(p_inner)
            if not text:
                pass
            # source marks FAQ-style question paragraphs with this class —
            # promote to a real heading for proper heading hierarchy
            elif p_attrs and '-oneX-body--intro' in p_attrs:
                parts.append(f'<h3>{text}</h3>')
            else:
                parts.append(f'<p>{text}</p>')
        elif table_html:
            parts.append(clean_table(table_html))
        elif list_html:
            parts.append(clean_list(list_html))
        elif m.group(0).strip():
            parts.append('<p><a href="#top">Back to top</a></p>')
    return parts


def extract_groups(groups_html):
    """Split on top-level <div class="anchoredtitle title"> blocks and pull
    each group's full content (headings/paragraphs/tables/lists) via
    extract_flow_parts, plus whether it contains a "Back to top" link.

    Quirk in the source markup: a group's own "Back to top" link is not
    nested inside that group's div — it sits at the start of the *next*
    group's div instead. So the backtotop flag detected on group[i] is
    shifted back to belong at the end of group[i-1]'s content."""
    raw = []
    for m in re.finditer(r'<div class="anchoredtitle title">', groups_html):
        block = balanced_div(groups_html, m.start())
        backtotop = bool(re.search(r'>\s*Back to top\s*<', block))
        block_no_backtotop = re.sub(r'<a[^>]*>\s*Back to top\s*</a>', '', block)
        parts = extract_flow_parts(block_no_backtotop)
        raw.append((parts, backtotop))

    out = []
    for i, (parts, _) in enumerate(raw):
        belongs_to_next = raw[i + 1][1] if i + 1 < len(raw) else False
        out.append((parts, belongs_to_next))
    return out


def build_body_grouped(main_col_html):
    """For pages using the 'anchoredtitle title' component to wrap each
    content group (e.g. multi-record file-format pages like ach-payments,
    or hub/overview pages with a single unwrapped group)."""
    first_group_idx = main_col_html.find('<div class="anchoredtitle title">')
    intro_html = main_col_html[:first_group_idx]
    groups_html = main_col_html[first_group_idx:]

    parts = extract_flow_parts(intro_html)
    groups = extract_groups(groups_html)
    if not groups:
        raise ValueError('extract_groups found 0 groups — template mismatch, needs manual handling')

    for group_parts, backtotop in groups:
        parts.extend(group_parts)
        if backtotop:
            parts.append('<p><a href="#top">Back to top</a></p>')
    return '\n'.join(parts)


def build_body_flow(main_col_html):
    """Generic fallback for simpler pages that are just a plain document-
    order flow of headings, paragraphs, lists and tables — no anchoredtitle
    wrapper, no back-to-top shift quirk."""
    parts = extract_flow_parts(main_col_html)
    if not parts:
        raise ValueError('build_body_flow found no content — template mismatch, needs manual handling')
    return '\n'.join(parts)


def build_body(main_col_html):
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


def main():
    cleaned_html_path, metadata_json_path, out_path = sys.argv[1:4]
    html = open(cleaned_html_path, encoding='utf-8', errors='ignore').read()
    metadata = json.load(open(metadata_json_path, encoding='utf-8'))

    crumbs = get_breadcrumb(html)
    if not crumbs:
        raise SystemExit('ERROR: no breadcrumb found')
    # last crumb should point at the current page; keep as-is (matches
    # existing sibling files' convention of self-linking the final crumb)
    last_text, last_href = crumbs[-1]
    if not last_href:
        crumbs[-1] = (last_text, metadata['paths']['documentPath'])

    h1 = get_h1(html) or last_text
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

    table_count = doc.count('<table>')
    heading_count = len(re.findall(r'<h3>', doc))
    print(f'wrote {out_path} ({len(doc)} chars, {heading_count} h3 headings, {table_count} tables)')


if __name__ == '__main__':
    main()
