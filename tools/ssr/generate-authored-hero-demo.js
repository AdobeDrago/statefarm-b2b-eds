import { readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import '../../blocks/hero/sf-hero.js';
import { buildHeroHtml } from './hero.js';
import { renderWithSSR } from './render.js';

const defaultSourceUrl = 'https://main--statefarm-b2b-eds--adobedrago.aem.page/b2b-content/ssr-test.plain.html';
const source = process.argv[2] || defaultSourceUrl;
const outputPath = resolve(process.argv[3] || 'drafts/ssr-test-lit.plain.html');
const projectRoot = resolve(import.meta.dirname, '../..');

/**
 * Reads either a DA preview URL or a local fixture. DA preview is the default
 * so content authors control the component through da.live.
 *
 * @param {string} location URL or local path
 * @returns {Promise<{html: string, label: string, baseUrl?: string}>}
 * Authored HTML and source metadata
 */
async function readAuthoredPage(location) {
  if (/^https?:\/\//i.test(location)) {
    const response = await fetch(location);
    if (!response.ok) throw new Error(`Could not fetch authored content: ${response.status} ${response.statusText}`);
    return { html: await response.text(), label: location, baseUrl: location };
  }

  const sourcePath = resolve(location);
  return {
    html: await readFile(sourcePath, 'utf8'),
    label: relative(projectRoot, sourcePath),
  };
}

function decodeText(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/&#x([0-9a-f]+);/gi, (match, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)));
}

function getAttribute(tag, attribute) {
  return tag.match(new RegExp(`\\b${attribute}="([^"]*)"`, 'i'))?.[1] || '';
}

function resolveRelativeMedia(pageHtml, baseUrl) {
  if (!baseUrl) return pageHtml;
  const base = new URL('.', baseUrl).href;
  return pageHtml.replace(/\b(src|srcset)="\.\//gi, (match, attribute) => `${attribute}="${base}`);
}

function findClosingDiv(html, start) {
  let depth = 0;
  const closingTag = Array.from(html.slice(start).matchAll(/<\/?div\b[^>]*>/gi)).find((tag) => {
    depth += tag[0].startsWith('</') ? -1 : 1;
    return depth === 0;
  });
  if (closingTag) return start + closingTag.index + closingTag[0].length;
  throw new Error('The authored columns-auth block does not have a closing div.');
}

function addClassToParagraph(html, className) {
  return html.replace(/<p(\s[^>]*)?>/i, (tag) => {
    if (/\bclass="/i.test(tag)) return tag.replace(/class="([^"]*)"/i, `class="$1 ${className}"`);
    return tag.replace('<p', `<p class="${className}"`);
  });
}

/**
 * Extracts the existing columns-auth intro from an authored EDS page. This is
 * intentionally scoped to the current, already-authored Home & Auto Lenders
 * page so the demo has a traceable content source rather than invented data.
 *
 * @param {string} pageHtml existing authored page HTML
 * @param {string} [baseUrl] source URL used to resolve relative assets
 * @returns {{heading: string, imageSrc: string, imageAlt: string,
 * contentHtml: string, start: number, end: number}}
 */
function extractAuthoredHero(pageHtml, baseUrl) {
  const blockMatch = pageHtml.match(/<div class="[^"]*\bcolumns-auth\b[^"]*">/i);
  const blockStart = blockMatch?.index;
  const remainingHtml = blockStart === undefined ? '' : pageHtml.slice(blockStart);
  const nextBlock = remainingHtml.search(/<div class="[^"]*\bcards\b[^"]*">/i);
  if (blockStart === undefined || nextBlock < 0) {
    throw new Error('The page does not contain a columns-auth block followed by cards.');
  }

  const blockEnd = findClosingDiv(pageHtml, blockStart);
  const blockHtml = pageHtml.slice(blockStart, blockEnd);
  const imageTag = blockHtml.match(/<img\b[^>]*>/i)?.[0];
  const headingMatch = blockHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const paragraphs = [...blockHtml.matchAll(/<p(?:\s[^>]*)?>[\s\S]*?<\/p>/gi)]
    .map((match) => match[0]);
  if (!imageTag || !headingMatch || !paragraphs.length) {
    throw new Error('The authored columns-auth block is missing an image, h1, or body content.');
  }

  const imageSrc = decodeText(getAttribute(imageTag, 'src'));

  return {
    heading: decodeText(headingMatch[1].replace(/<[^>]+>/g, '').trim()),
    imageSrc: baseUrl ? new URL(imageSrc, baseUrl).href : imageSrc,
    imageAlt: decodeText(getAttribute(imageTag, 'alt')),
    contentHtml: paragraphs.map((paragraph, index) => {
      if (index === 1) return addClassToParagraph(paragraph, 'hero-login');
      if (index === 2) return addClassToParagraph(paragraph, 'hero-help');
      return paragraph;
    }).join(''),
    start: blockStart,
    end: blockEnd,
  };
}

async function main() {
  const { html, label, baseUrl } = await readAuthoredPage(source);
  const pageHtml = resolveRelativeMedia(html, baseUrl);
  const authoredHero = extractAuthoredHero(pageHtml, baseUrl);
  const heroInput = buildHeroHtml(authoredHero);
  const renderedHero = await renderWithSSR(heroInput);
  const output = `${pageHtml.slice(0, authoredHero.start)}${renderedHero}${pageHtml.slice(authoredHero.end)}`;
  await writeFile(outputPath, output);
  process.stdout.write(`Generated ${outputPath} from ${label}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
