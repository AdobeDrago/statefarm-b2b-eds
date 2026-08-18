# State Farm B2B EDS

State Farm B2B site built on Adobe Edge Delivery Services (EDS), authored in Document Authoring (DA).

## Environments

- Preview: [https://main--statefarm-b2b-eds--adobedrago.aem.page/](https://main--statefarm-b2b-eds--adobedrago.aem.page/)
- Live: [https://main--statefarm-b2b-eds--adobedrago.aem.live/](https://main--statefarm-b2b-eds--adobedrago.aem.live/)

## Documentation 

Before working on this project, go through the documentation on [https://www.aem.live/docs/](https://www.aem.live/docs/) and more specifically:

1. [Developer Tutorial](https://www.aem.live/developer/tutorial)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)

See `AGENTS.md` for the full contributor/agent workflow (skills, publishing process, project facts).

## Installation

```sh
npm i
```



## Linting

```sh
npm run lint
```



## Local development

1. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
2. Start AEM Proxy: `aem up` (opens your browser at `http://localhost:3000`)
3. Open this directory in your favorite IDE and start coding :)

## Testing (Playwright)

End-to-end tests live in `e2e-tests/` and run against the local dev server at `http://localhost:3000`.

1. Install browsers (first time only):
   ```sh
   npx playwright install --with-deps
   ```
2. Start the local dev server in a separate terminal:
   ```sh
   aem up
   ```
3. Run the tests:
   ```sh
   npm run test:e2e
   ```
   Or with the interactive UI runner:
   ```sh
   npm run test:e2e:ui
   ```
4. View the HTML report after a run at `playwright-report/index.html`.

Tests run on `chromium`, `firefox`, and `webkit` by default (see `playwright.config.js`). CI runs the same suite on every push/PR to `main`/`master` via `.github/workflows/playwright.yml`.

