---
name: browser-check-every-change
description: MANDATORY — after every code change, build the extension, load it in a test browser on a live Google results page and check the screenshots visually; unit tests alone do not count
keywords: [browser test, visual check, chrome for testing, load-extension, cdp, remote debugging, screenshot, verify, dist, live google]
source: Vytenis Kuciauskas, 2026-10-18 ("Always confirm that extention works by runing a test browser and do a visual check")
updated: 2026-10-18
---

### Rule / Fact

A code change is not done until the built extension works in a real browser and you have looked at a screenshot of it.

### Why

All previews showed google.com while every unit test passed: Google changed its live link markup (`/goto?url=<token>`). Only `src/shared/url.ts` has tests, so the DOM code is checked only in the browser. After one follow-up change the user had to ask for the browser check.

### How to apply

1. `bun run build` (bun is at `~/.bun/bin/bun`; it may not be on `PATH`).
2. Branded Google Chrome ignores `--load-extension`. Use Chrome for Testing: `npx -y @puppeteer/browsers install chrome@stable --path <scratchpad>/cft`.
3. Start it in the background: `--remote-debugging-port=9333 --user-data-dir=<scratchpad>/cft-profile --no-first-run --load-extension=<repo>/dist about:blank`.
4. With a small Bun CDP script: navigate to `https://www.google.com/search?q=coders&hl=en` (also a later page, `&start=110`), wait about 15 s, then read each `h3` result: its `.gs-preview-image` src origin, or `data-gs-processed`.
5. Scroll to the first `.gs-preview-wrapper`, take `Page.captureScreenshot`, and look at the PNG with Read. Check that thumbnails show the result's site, not google.com, and that video and social results have no thumbnail.
6. A missing `chrome-extension://` target is normal: there is no background worker. Injected `.gs-preview-wrapper` elements prove the extension ran.
7. Stop Chrome (`pkill -f "user-data-dir=<scratchpad>/cft-profile"`) before the turn ends.
8. Put the result of the check in the report.

`curl` and headless Chrome get a JS-only Google page, so they cannot replace this check. The first fetch of a new origin from the screenshot service gives a "Processing..." image; this is not a failure.

Related: [[boy-scout-touched-files]], [[google-redirect-empty-q]], [[google-serp-dom-hooks]]
