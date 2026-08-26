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

This project has automated browser tests for the homepage, written using [Playwright](https://playwright.dev/). These tests open the site in a real browser (Chrome, Firefox, and Safari's engine) and click around it automatically, checking that things look right and work correctly — the same things a person would check by hand, just done by a script in a few seconds.

The tests live in the `e2e-tests/` folder, in a file called `homePage.spec.js`. You don't need to know how to write tests to run them — just follow the steps below.

### What you need before starting

- This project already installed (you should be able to run `npm run lint` successfully)
- A terminal (Terminal on Mac, or the built-in terminal in VS Code)

You'll need **two terminal windows/tabs open at the same time** — one to keep the website running, and one to run the tests against it. Keep this in mind as you go through the steps.

### Step 1: Install the test browsers (one-time setup)

Playwright needs its own copies of Chrome, Firefox, and Safari to run tests in. Install them once with:

```sh
npx playwright install --with-deps
```

This downloads about 250MB and can take a minute or two the first time. You won't need to run this again unless you delete your `node_modules` folder or Playwright updates its browsers.

### Step 2: Start the website (Terminal 1)

The tests need a running copy of the website to test against — think of it like this: you can't test a website that isn't switched on. In your **first terminal**, run:

```sh
npx -y @adobe/aem-cli up
```

Wait until you see a line like this:

```
info: Local AEM dev server up and running: http://localhost:3000/
```

**Leave this terminal open and running for as long as you want to run tests.** If you close it or press `Ctrl+C`, the website stops and the tests will fail because there's nothing for them to test against.

You can double check it's working by opening `http://localhost:3000/b2b-content` in your browser — you should see the actual homepage.

### Step 3: Run the tests (Terminal 2)

Open a **second terminal** (leave the first one running) and run:

```sh
npm run test:e2e
```

This runs all the tests, in all three browsers, and prints a summary like:

```
42 passed (14.2s)
```

That means everything checked out fine. If something fails, it'll print which test failed and why, right there in the terminal.

**Prefer to watch the tests run visually, step by step?** Use the interactive mode instead:

```sh
npm run test:e2e:ui
```

This opens a window where you can click any test, watch it play out in a browser, and see exactly what it checked at each step — helpful for understanding what a test does or figuring out why one failed.

### Step 4: Look at the results

After running `npm run test:e2e`, a detailed report is saved. Open it in your browser with:

```sh
npx playwright show-report
```

Or just open the file directly: `playwright-report/index.html`. This report shows every test, whether it passed or failed, and for any failures, a screenshot and the exact error.

### If something goes wrong

- **`Connection refused` or every test fails immediately** — the website isn't running. Go back to Terminal 1 and make sure it still shows the "up and running" message. If it crashed or you closed it, start it again with the Step 2 command.
- **Checking manually whether the site is up** — run `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/b2b-content` in any terminal. It should print `200`. (Don't use `curl -I` for this check — it can report a false error even when the site is working fine.)
- **`port 3000 already in use` or the site behaves oddly after restarting** — an old copy of the server might still be running in the background. Run `lsof -iTCP:3000 -sTCP:LISTEN` to find it, then `kill -9 <the PID number it shows>`, and start Step 2 again.
- **Tests were passing, now they're not, and you didn't change anything** — this is usually just the local server needing a restart (Ctrl+C in Terminal 1, then run the Step 2 command again).

### What these tests actually check

In plain terms, running this suite checks that the homepage:
- Loads correctly and shows the right title and heading
- Shows the Log In button, the "No login required" links, and all 8 service cards with working links
- Lets you hover over a nav item (like "Claims") to open its menu, and close it with the Escape key
- Correctly switches between "logged out" and "logged in" views when simulating a login
- Works properly on mobile-sized and tablet-sized screens, including the hamburger menu

It runs this same set of checks in three different browsers (Chromium, Firefox, and WebKit/Safari) to make sure nothing looks or behaves differently between them.

### For reference

Tests run on `chromium`, `firefox`, and `webkit` by default (see `playwright.config.js`). CI runs the same suite on every push/PR to `main`/`master` via `.github/workflows/playwright.yml`.

