# Lit browser hydration

This folder contains the browser-side half of the Lit SSR implementation.
After the server sends a component with Declarative Shadow DOM, these modules
let Lit attach behavior to that existing HTML instead of rendering it again.

## Files

| File or folder | Purpose |
| --- | --- |
| `hydrate.js` | Imports Lit's official `lit-element-hydrate-support` module. It must load before any Lit component definition that hydrates Declarative Shadow DOM. |
| `ssr-proof-element.js` | A minimal known-working Lit component that renders `SSR content`. It proves that the core SSR and browser hydration mechanism works independently of the Hero. |
| `ssr-proof-demo.js` | Loads `hydrate.js` and the proof component together for the original SSR proof page. |
| `package.json` | Makes this folder browser-module compatible with Node ESM tooling and records the Lit browser dependencies. |
| `vendor/` | Generated browser runtime files for Lit, ReactiveElement, `lit-html`, and `@lit-labs/ssr-client`. These are copied from public npm dependencies; do not edit them directly. |

## How hydration is loaded

`scripts/scripts.js` checks the page for server-rendered custom elements during
eager loading. If it finds an SSR component, it loads `hydrate.js` first and
then loads that component's browser definition.

For the Hero, the browser definition lives at:

```text
blocks/hero/sf-hero.js
```

This order is important:

```text
Server HTML with <template shadowroot="open">
        ↓
hydrate.js loads Lit hydration support
        ↓
sf-hero.js defines <sf-hero>
        ↓
Lit attaches behavior to the existing Shadow Root
```

## Vendored runtime assets

The files in `vendor/` are served through EDS and mapped through the import map
in `head.html`. This lets browser code use normal imports such as:

```js
import { LitElement, html } from 'lit';
```

Refresh the vendor folder after updating Lit dependencies:

```bash
npm run copy:lit-runtime
```

The copy script is located at:

```text
tools/ssr/copy-lit-runtime-assets.js
```
