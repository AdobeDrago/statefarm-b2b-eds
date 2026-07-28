#!/usr/bin/env python3
"""
Sanity check: compares the stripped-text length of the generated
.plain.html against the stripped-text length of the source page's main
content column, to catch silent content drops (e.g. a tag type the
extractor doesn't handle yet). Not a substitute for eyeballing output,
just a cheap tripwire.

Usage: validate_coverage.py <cleaned.html> <output.plain.html> <url>
"""
import re
import sys

sys.path.insert(0, __import__('os').path.dirname(__file__))
from extract_detail_page import get_main_content_column  # noqa: E402


def strip_text(html):
    text = re.sub(r'<[^>]+>', ' ', html)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def main():
    cleaned_html_path, out_path, url = sys.argv[1:4]
    html = open(cleaned_html_path, encoding='utf-8', errors='ignore').read()
    main_col = get_main_content_column(html)
    src_text_len = len(strip_text(main_col))

    out_html = open(out_path, encoding='utf-8').read()
    out_text_len = len(strip_text(out_html))

    ratio = out_text_len / src_text_len if src_text_len else 0
    flag = 'CHECK' if ratio < 0.85 else 'ok'
    print(f'COVERAGE {flag}: ratio={ratio:.2f} src={src_text_len} out={out_text_len} url={url}')


if __name__ == '__main__':
    main()
