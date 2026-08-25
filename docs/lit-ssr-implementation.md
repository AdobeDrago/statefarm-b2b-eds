# Lit SSR implementation

## Purpose

This implementation enables generated HTML to be rendered by Lit on the server
before it is served by Edge Delivery Services (EDS). When Lit produces
declarative shadow DOM, the browser displays the component immediately and then
hydrates that existing DOM instead of rendering it from scratch.

## What changed

| Area | Files | Responsibility |
| --- | --- | --- |
| Server rendering | `tools/ssr/render.js` | Exports `renderWithSSR(htmlString)` using `@lit-labs/ssr`. |
| Output selection | `tools/ssr/post-process.js` | Keeps the SSR result only when it includes `<template shadowroot=`; otherwise keeps the original HTML. |
| File build step | `tools/ssr/post-process-html.js` | Processes an input HTML file and writes the selected result to an output file. |
| Browser assets | `tools/ssr/copy-lit-runtime-assets.js` | Copies the minimal Lit and SSR-client module graph to EDS-served static files. |
| Hydration | `scripts/lit/hydrate.js` | Loads Lit's official `lit-element-hydrate-support` before component definitions. |
| Demo | `drafts/ssr-demo.plain.html`, `scripts/lit/ssr-proof-*.js` | Demonstrates pre-rendering and browser hydration with a small Lit element. |
| Authorable Hero | `blocks/hero/hero.js`, `blocks/hero/sf-hero.js`, `tools/ssr/hero.js` | Maps AEM image, alt text, heading, and rich content into an SSR-safe Lit Hero. |

The Lit dependencies added to `package.json` are `lit`, `lit-html`,
`@lit-labs/ssr`, and `@lit-labs/ssr-client`.

## EDS integration decision

Current EDS blocks in this repository transform authored HTML in the browser:
`scripts/scripts.js` calls `buildAutoBlocks()` and `decorateBlocks()` after the
page is served. The active GitHub workflows install dependencies, lint, and run
browser tests; they do not create generated block HTML. The former Web Importer
tooling was removed from this working tree and is not a publish hook.

Therefore, SSR belongs immediately after an external producer generates block
HTML and before that HTML is committed or uploaded for EDS to serve. It must
not be added to the browser block-decoration path.

## Use the server-side build step

The component module must be safe to import in Node and register its custom
elements. Run:

```sh
npm run ssr:html -- input.html output.html --module path/to/component.ssr.js
```

The `--module` option can be supplied more than once. For example, given this
input:

```html
<my-lit-component></my-lit-component>
```

Lit SSR can return declarative shadow DOM similar to:

```html
<my-lit-component>
  <template shadowroot="open" shadowrootmode="open">...</template>
</my-lit-component>
```

Only this form replaces the original input. Plain generated HTML remains
unchanged.

### Hero content mapping

The Hero authoring contract is unchanged: image, image alt text, heading, and
rich text/CTA. In the browser, `blocks/hero/hero.js` extracts those values into
`sf-hero` properties and passes the rich content through the default slot. For
an upstream producer, use `buildHeroHtml()` from `tools/ssr/hero.js` to create
the same custom-element input before calling `postProcessBlockHtml()`.

## Serve and hydrate the demo

After dependencies change, refresh the served browser modules:

```sh
npm run copy:lit-runtime
```

Start the local demo server:

```sh
npm run start:ssr-demo
```

Then open [http://localhost:3000/drafts/ssr-test-lit](http://localhost:3000/drafts/ssr-test-lit).
This command is required because a generic `aem up` does not mount local
`drafts/` HTML.

The dedicated DA test-page command is `npm run ssr:ssr-test`. It fetches
`/b2b-content/ssr-test.plain.html` from DA preview and writes the full Lit page
to `/drafts/ssr-test-lit`; all authored sections are preserved, with only the
intro converted to the SSR Hero.

The import map in `head.html` resolves Lit's browser imports to
`/scripts/lit/vendor/`. On a page containing the demo component,
`scripts/scripts.js` loads the hydration bootstrap, which imports hydration
support before defining the component.

## Verification performed

- Rendered `ssr-proof-element` through `renderWithSSR()`.
- Confirmed the post-processor selects output containing `<template shadowroot=`.
- Confirmed the demo page contains the exact current SSR output.
- Ran `npm run lint` successfully.

## Operational notes

- Do not pass untrusted HTML to `renderWithSSR()`; it intentionally uses
  Lit's `unsafeHTML` directive to render producer-supplied markup.
- Browser-only component bundles that depend on `window` or `document` during
  module evaluation need a separate SSR-safe module entry point.
- Add additional copied runtime modules only when a component imports them;
  this keeps the EDS-served runtime small.
