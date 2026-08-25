/**
 * Extracts the existing EDS hero authoring model into Lit inputs. Authors keep
 * using an image, heading, and rich text/CTA; rich markup is passed to a slot.
 *
 * @param {Element} block authored hero block
 * @returns {{heading: string, imageSrc: string, imageAlt: string, content: Element}}
 */
function getHeroContent(block) {
  const content = block.cloneNode(true);
  const sourceImage = content.querySelector('picture img, img');
  const imageSrc = sourceImage?.currentSrc || sourceImage?.src || '';
  const imageAlt = sourceImage?.alt || '';
  content.querySelectorAll('picture, img').forEach((element) => element.remove());

  const headingElement = content.querySelector('h1');
  const heading = headingElement?.textContent.trim() || '';
  headingElement?.remove();

  return {
    heading,
    imageSrc,
    imageAlt,
    content,
  };
}

/**
 * Replaces an authored EDS hero with its Lit equivalent. Hydration support is
 * loaded first so server-rendered versions retain their declarative shadow DOM.
 *
 * @param {Element} block authored hero block
 * @returns {Promise<void>}
 */
export default async function decorate(block) {
  const {
    heading,
    imageSrc,
    imageAlt,
    content,
  } = getHeroContent(block);
  await import('../../scripts/lit/hydrate.js');
  await import('./sf-hero.js');

  const hero = document.createElement('sf-hero');
  hero.heading = heading;
  hero.imageSrc = imageSrc;
  hero.imageAlt = imageAlt;
  hero.append(...content.childNodes);
  block.replaceChildren(hero);
}
