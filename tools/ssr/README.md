# Lit SSR tooling

This folder contains the Node-side tools used to turn authored EDS content
into server-rendered Lit web components. The browser receives the component's
HTML and Declarative Shadow DOM first, then Lit hydrates it without replacing
the visible content.

## Files

| File | Purpose |
| --- | --- |
| `render.js` | Core Lit SSR function. It accepts an HTML string, renders it with Lit's server renderer, and returns the rendered HTML. |
| `post-process.js` | Runs `renderWithSSR()` and returns the SSR output only when it contains Declarative Shadow DOM (`<template shadowroot=...>`). Otherwise it preserves the original HTML. |
| `post-process-html.js` | Command-line wrapper for processing an input HTML file and writing an output HTML file. This is the generic future build or publish integration point. |
| `copy-lit-runtime-assets.js` | Copies the required Lit and hydration browser modules from `node_modules` to `scripts/lit/vendor/`, where EDS serves them as static assets. |
| `hero.js` | Maps simple Hero data (heading, image URL, alt text, and authored rich HTML) to an `<sf-hero>` element ready for SSR. |
| `generate-authored-hero-demo.js` | Fetches an authored DA preview page, finds its `columns-auth` Hero, maps it to `<sf-hero>`, renders it on the server, and writes the complete resulting page. |
| `package.json` | Configures this folder as Node ESM and declares its SSR tooling dependencies. |
| `test/ssr-proof-element.js` | Re-exports a small known-working Lit component used to verify the SSR mechanism independently of the State Farm Hero. |

## Demo flow

```text
DA.live author saves and previews a page
        ↓
generate-authored-hero-demo.js fetches the .plain.html preview
        ↓
The authored columns-auth Hero is mapped to <sf-hero>
        ↓
render.js creates HTML containing Declarative Shadow DOM
        ↓
drafts/ssr-test-lit.plain.html is written for local serving
        ↓
The browser displays the rendered Hero and hydrates it with Lit
```

## Generate the current SSR demo

Run this from the repository root after saving and previewing the source page
in DA.live:

```bash
npm run ssr:ssr-test
```

This reads the preview of `/b2b-content/ssr-test` and updates:

```text
drafts/ssr-test-lit.plain.html
```

When the SSR local server is running, view it at:

```text
http://localhost:3000/drafts/ssr-test-lit
```

## Hydration assets

When dependencies change, refresh the static browser runtime with:

```bash
npm run copy:lit-runtime
```

The copied files are intentionally kept under `scripts/lit/vendor/` so the
browser can load the same Lit runtime needed to hydrate SSR output.
