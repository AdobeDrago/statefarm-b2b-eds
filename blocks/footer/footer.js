import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment — try metadata, then the project's /content root, then site root
  const footerMeta = getMetadata('footer');
  const candidatePaths = [];
  if (footerMeta) candidatePaths.push(new URL(footerMeta, window.location).pathname);
  candidatePaths.push('/content/footer', '/footer');
  let fragment = null;
  for (let i = 0; i < candidatePaths.length && !fragment; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    fragment = await loadFragment(candidatePaths[i]);
  }
  if (!fragment) return;

  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  // classify the two sections: banner (slogan) + content (links/copyright)
  const sections = footer.querySelectorAll(':scope > div');
  const [bannerSection, contentSection] = sections;
  if (bannerSection) {
    bannerSection.classList.add('footer-banner');
    const wrapper = bannerSection.querySelector(':scope > .default-content-wrapper');
    if (wrapper) {
      while (wrapper.firstChild) bannerSection.append(wrapper.firstChild);
      wrapper.remove();
    }
  }
  if (contentSection) {
    contentSection.classList.add('footer-content');
    const wrapper = contentSection.querySelector(':scope > .default-content-wrapper');
    if (wrapper) {
      while (wrapper.firstChild) contentSection.append(wrapper.firstChild);
      wrapper.remove();
    }
    const logo = contentSection.querySelector('p img');
    if (logo) logo.closest('p').classList.add('footer-logo');
    const lists = contentSection.querySelectorAll(':scope > ul');
    if (lists[0]) lists[0].classList.add('footer-links');
    if (lists[1]) lists[1].classList.add('footer-notices');
    const paras = [...contentSection.querySelectorAll(':scope > p')].filter((p) => !p.querySelector('img'));
    if (paras.length) paras[paras.length - 1].classList.add('footer-copyright');
  }

  block.append(footer);

  // wrap registered trademark symbol in superscript
  const footerHeading = block.querySelector('.footer-banner > p');
  if (footerHeading && footerHeading.textContent.includes('®') && !footerHeading.querySelector('.registered')) {
    footerHeading.innerHTML = footerHeading.innerHTML.replace(
      /®/g,
      '<sup class="registered">®</sup>',
    );
  }

  // add floating chat button
  const chatButton = document.createElement('div');
  chatButton.className = 'footer-chat';
  chatButton.innerHTML = `
    <img src="../../icons/chat.svg" alt="Chat">
    <span>Chat</span>
  `;
  block.append(chatButton);
}
