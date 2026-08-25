import { LitElement, html } from 'lit';

class SsrProofElement extends LitElement {
  // eslint-disable-next-line class-methods-use-this
  render() {
    return html`<p>SSR content</p>`;
  }
}

customElements.define('ssr-proof-element', SsrProofElement);
