# Lit SSR pipeline decision

## Investigation

The current repository has no server-side EDS build that executes block code or
emits generated block HTML:

- There is no `tools/importer/` directory in the working tree and no npm
  importer/build script.
- The only current GitHub build workflow runs `npm ci` then `npm run lint`.
  The Playwright workflow runs browser tests; neither writes page HTML.
- `scripts/scripts.js` runs `buildAutoBlocks(main)` and `decorateBlocks(main)`
  in the browser. This is the point where current blocks transform their
  authored HTML, after EDS has already served the page.
- Git history shows a former `tools/importer/import-b2b-portal-home.js`, but it
  was deleted in commit `174983d`. It was a Web Importer transform that returned
  imported document content; it is not part of the current publish path.

## Decision

Run SSR immediately after a producer generates a block's HTML and before that
artifact is committed or uploaded for EDS to serve. This is an explicit
producer-side build step, not an EDS browser-decoration hook.

Use `postProcessBlockHtml(htmlString)` from a producer. It runs
`renderWithSSR()`, checks for the exact declarative-shadow-DOM marker
`<template shadowroot=`, and returns the SSR result only if that marker is
present. All other generated HTML is returned unchanged.

For a file-producing build, run:

```sh
npm run ssr:html -- input.html output.html --module path/to/component.ssr.js
```

`--module` is repeatable. Each module must register its custom elements and be
safe to import in Node; browser-only component bundles are not SSR inputs.

## Browser demo and hydration

Run `npm run copy:lit-runtime` after installing or updating Lit. It copies the
minimal browser module graph into `scripts/lit/vendor/`; `head.html` maps the
packages to these served files. The demo at `/drafts/ssr-demo` contains the
pre-rendered output for `ssr-proof-element`. Once parsed, `scripts/scripts.js`
loads `scripts/lit/ssr-proof-demo.js`, which imports the official Lit hydration
support *before* defining the component. Lit therefore hydrates the existing
declarative shadow root rather than rendering it from scratch.

Start the demo with `npm run start:ssr-demo`; this explicitly mounts `drafts/`
at `/drafts`, so it is available at `http://localhost:3000/drafts/ssr-demo`.
Restart an already-running generic `aem up` server with this command, because
the generic server does not serve local draft HTML.
