#!/usr/bin/env python3
"""
Uploads one or more generated .plain.html pages (bare-div section format,
as committed to git for local --html-folder testing) to DA, then triggers
preview.

DA's actual document format needs a <body><header></header><main>...
</main><footer></footer></body> wrapper — different from the bare-div
format used for local testing. This script wraps at upload time rather
than changing the committed git format.

Also rewrites any ./images/<file> references to absolute content.da.live
URLs and pre-uploads the referenced binaries, since DA requires image
src to be a fetchable absolute URL (relative paths render as
<img src="about:error">).

Usage:
  python3 upload_to_da.py <token-file> <org> <repo> <branch> <plain.html-path> [<plain.html-path> ...]

<plain.html-path> is the local repo-relative path, e.g.
  b2b-content/home-auto-lenders/edi-transactions/daily-811-notifications/ach-payments.plain.html
"""
import os
import re
import sys
import time
import urllib.request
import urllib.error
import uuid


def read_token(token_file):
    with open(token_file, encoding='utf-8') as f:
        return f.read().strip()


def da_request(method, url, token, body=None, content_type=None, retries=3):
    for attempt in range(retries):
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header('Authorization', f'Bearer {token}')
        req.add_header('User-Agent', 'curl/8.7.1')
        if content_type:
            req.add_header('Content-Type', content_type)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            return e.code, e.read()
    raise RuntimeError('unreachable')


def multipart_body(field_name, filename, content, content_type):
    boundary = uuid.uuid4().hex
    parts = []
    parts.append(f'--{boundary}\r\n'.encode())
    parts.append(
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'
        f'Content-Type: {content_type}\r\n\r\n'.encode()
    )
    parts.append(content if isinstance(content, bytes) else content.encode('utf-8'))
    parts.append(f'\r\n--{boundary}--\r\n'.encode())
    return b''.join(parts), f'multipart/form-data; boundary={boundary}'


def da_source_path(plain_html_repo_path):
    """b2b-content/.../page.plain.html -> b2b-content/.../page.html"""
    return re.sub(r'\.plain\.html$', '.html', plain_html_repo_path)


def upload_binary(local_path, da_path, org, repo, token):
    with open(local_path, 'rb') as f:
        content = f.read()
    ext = os.path.splitext(local_path)[1].lower()
    mime = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.svg': 'image/svg+xml', '.gif': 'image/gif'}.get(ext, 'application/octet-stream')
    body, ctype = multipart_body('data', os.path.basename(local_path), content, mime)
    url = f'https://admin.da.live/source/{org}/{repo}/{da_path}'
    status, resp = da_request('PUT', url, token, body=body, content_type=ctype)
    return status, resp


def wrap_document(bare_html):
    return f'<body>\n<header></header>\n<main>\n{bare_html}\n</main>\n<footer></footer>\n</body>\n'


def upload_page(plain_html_repo_path, org, repo, branch, token, repo_root):
    abs_path = os.path.join(repo_root, plain_html_repo_path)
    with open(abs_path, encoding='utf-8') as f:
        html = f.read()

    page_dir = os.path.dirname(plain_html_repo_path)
    image_refs = set(re.findall(r'<img src="\./images/([^"]+)"', html))
    for img_name in image_refs:
        local_img = os.path.join(repo_root, page_dir, 'images', img_name)
        if not os.path.isfile(local_img):
            print(f'  WARNING: referenced image missing on disk: {local_img}')
            continue
        da_img_path = f'{page_dir}/images/{img_name}'
        status, _ = upload_binary(local_img, da_img_path, org, repo, token)
        if status not in (200, 201):
            print(f'  WARNING: image upload failed ({status}) for {da_img_path}')
            continue
        content_da_url = f'https://content.da.live/{org}/{repo}/{da_img_path}'
        html = html.replace(f'<img src="./images/{img_name}"', f'<img src="{content_da_url}"')

    wrapped = wrap_document(html)
    da_path = da_source_path(plain_html_repo_path)
    body, ctype = multipart_body('data', 'document.html', wrapped, 'text/html')
    url = f'https://admin.da.live/source/{org}/{repo}/{da_path}'
    status, resp = da_request('PUT', url, token, body=body, content_type=ctype)
    if status not in (200, 201):
        print(f'  UPLOAD FAILED ({status}): {plain_html_repo_path}')
        print(f'  {resp[:300]}')
        return False

    preview_path = re.sub(r'\.html$', '', da_path)
    preview_url = f'https://admin.hlx.page/preview/{org}/{repo}/{branch}/{preview_path}'
    pstatus, presp = da_request('POST', preview_url, token)
    if pstatus not in (200, 201):
        print(f'  PREVIEW FAILED ({pstatus}) for {preview_path}: {presp[:300]}')
        return False

    print(f'  OK: {plain_html_repo_path} -> https://{branch}--{repo}--{org}.aem.page/{preview_path}')
    return True


def main():
    token_file, org, repo, branch = sys.argv[1:5]
    paths = sys.argv[5:]
    token = read_token(token_file)
    repo_root = os.getcwd()

    ok = 0
    for p in paths:
        print(f'=== {p} ===')
        if upload_page(p, org, repo, branch, token, repo_root):
            ok += 1
        time.sleep(0.3)
    print(f'\n{ok}/{len(paths)} pages uploaded and previewed successfully')


if __name__ == '__main__':
    main()
