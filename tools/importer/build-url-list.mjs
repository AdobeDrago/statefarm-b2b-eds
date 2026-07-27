#!/usr/bin/env node
/* eslint-disable no-console, no-await-in-loop, no-continue, no-restricted-syntax */

/**
 * Crawls b2b.statefarm.com starting from a seed path and writes every
 * live (2xx HTML) same-host page it finds to a text file, one per line,
 * for use as an import URL list (see urls-b2b-portal-home.txt for the
 * format). Broken links (404/500/etc.) are logged to stderr but left
 * out of the file.
 *
 * Usage:
 *   node tools/importer/build-url-list.mjs [startUrl] [outFile]
 *
 * Defaults:
 *   startUrl = https://b2b.statefarm.com/b2b-content
 *   outFile  = tools/importer/discovered-urls.txt
 */

const ALLOWED_HOST = 'b2b.statefarm.com';
const START_URL = process.argv[2] || `https://${ALLOWED_HOST}/b2b-content`;
const OUT_FILE = process.argv[3] || new URL('./discovered-urls.txt', import.meta.url);
const MAX_PAGES = Number(process.env.CRAWL_MAX_PAGES) || 500;
const REQUEST_DELAY_MS = Number(process.env.CRAWL_DELAY_MS) || 250;

const SKIP_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',
  '.css', '.js', '.json', '.xml', '.zip', '.doc', '.docx', '.xls', '.xlsx',
  '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3',
]);

function normalize(rawUrl, base) {
  let url;
  try {
    url = new URL(rawUrl, base);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  if (url.hostname !== ALLOWED_HOST) return null;
  url.hash = '';
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
  const ext = url.pathname.includes('.') ? url.pathname.slice(url.pathname.lastIndexOf('.')) : '';
  if (SKIP_EXTENSIONS.has(ext.toLowerCase())) return null;
  return url.toString();
}

function extractLinks(html, pageUrl) {
  const links = [];
  const hrefRegex = /href\s*=\s*["']([^"'#][^"']*)["']/gi;
  let match = hrefRegex.exec(html);
  while (match !== null) {
    const normalized = normalize(match[1], pageUrl);
    if (normalized) links.push(normalized);
    match = hrefRegex.exec(html);
  }
  return links;
}

function delay(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

async function crawl(startUrl) {
  const seed = normalize(startUrl, startUrl);
  if (!seed) {
    throw new Error(`Start URL is not on allowed host ${ALLOWED_HOST}: ${startUrl}`);
  }

  const visited = new Set();
  const successful = new Set();
  const queue = [seed];

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    let response;
    try {
      response = await fetch(current, { redirect: 'follow' });
    } catch (err) {
      console.error(`[fetch-error] ${current}: ${err.message}`);
      continue;
    }

    const finalUrl = normalize(response.url, current) || current;
    if (finalUrl !== current) visited.add(finalUrl);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('html')) {
      console.error(`[skip-non-html] ${current} (${contentType})`);
      continue;
    }
    if (!response.ok) {
      console.error(`[http-${response.status}] ${current}`);
      continue;
    }

    const html = await response.text();
    successful.add(finalUrl);
    console.error(`[ok] ${current} (${visited.size}/${MAX_PAGES})`);

    for (const link of extractLinks(html, finalUrl)) {
      if (!visited.has(link) && !queue.includes(link)) {
        queue.push(link);
      }
    }

    if (REQUEST_DELAY_MS > 0) await delay(REQUEST_DELAY_MS);
  }

  return [...successful].sort();
}

const urls = await crawl(START_URL);
const { writeFile } = await import('node:fs/promises');
await writeFile(OUT_FILE, `${urls.join('\n')}\n`, 'utf-8');
console.error(`\nWrote ${urls.length} URL(s) to ${OUT_FILE}`);
