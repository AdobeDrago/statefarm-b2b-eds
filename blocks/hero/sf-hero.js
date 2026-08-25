import {
  LitElement,
  css,
  html,
  nothing,
} from 'lit';

/**
 * SSR-safe, authorable Hero component. Attributes carry simple authored fields;
 * the default slot carries rich text and CTA markup from the AEM block.
 */
class SfHero extends LitElement {
  static properties = {
    heading: { type: String },
    imageSrc: { type: String, attribute: 'image-src' },
    imageAlt: { type: String, attribute: 'image-alt' },
  };

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .hero {
      box-sizing: border-box;
      display: grid;
      gap: 32px;
      grid-template-columns: 160px minmax(0, 1fr);
      min-height: 240px;
      padding: 32px 0;
    }

    .image {
      display: block;
      height: 104px;
      object-fit: contain;
      width: 104px;
    }

    .content {
      color: var(--dark-gray-color, #403c3c);
    }

    h1 {
      margin: 0 0 20px;
      font-size: 3rem;
      line-height: 1;
    }

    ::slotted(p) {
      margin: 0 0 16px;
      font-size: 1.5625rem;
      line-height: 1.2;
    }

    ::slotted(.hero-login),
    ::slotted(.hero-help) {
      position: absolute;
      right: 0;
      text-align: right;
    }

    ::slotted(.hero-login) {
      top: 48px;
    }

    ::slotted(.hero-help) {
      font-size: 1.25rem;
      top: 136px;
    }

    @media (width <= 600px) {
      .hero {
        display: block;
        min-height: 0;
        padding: 24px 0;
      }

      .image {
        display: none;
      }

      h1 {
        font-size: 1.75rem;
      }

      ::slotted(p) {
        font-size: 1.25rem;
      }

      ::slotted(.hero-login),
      ::slotted(.hero-help) {
        position: static;
        text-align: left;
      }
    }
  `;

  // eslint-disable-next-line class-methods-use-this
  render() {
    return html`
      <section class="hero">
        ${this.imageSrc
    ? html`<img class="image" src="${this.imageSrc}" alt="${this.imageAlt || ''}">`
    : nothing}
        <div class="content">
          ${this.heading ? html`<h1>${this.heading}</h1>` : nothing}
          <slot></slot>
        </div>
      </section>
    `;
  }
}

if (!customElements.get('sf-hero')) customElements.define('sf-hero', SfHero);

export default SfHero;
