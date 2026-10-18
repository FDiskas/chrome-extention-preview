---
name: current-architecture
description: No background service worker exists — content script loads preview <img> directly from preview.coders.lt; README and project skill still describe the removed worker
keywords: [architecture, background, service worker, content script, popup, preview.coders.lt, data url, refresh header, context menu, permissions, stale docs]
source: commit e6a47c0 (TypeScript/Bun rewrite)
updated: 2026-10-18
---

### Rule / Fact

The extension has only two bundles: `src/content/index.ts` → `dist/content.js` and `src/popup/popup.ts` → `dist/popup/popup.js`.

- There is **no** background service worker, no context menu, no `Refresh`-header retry, no `data:` URL conversion.
- `manifest.json` has **no** `permissions` and **no** `host_permissions`. The content script runs at `document_start` on a hard-coded list of Google domains (`*://*.google.<tld>/search*`).
- `src/content/preview-injector.ts` sets `img.src` to `PREVIEW_SCREENSHOT_API + encodeURIComponent(origin)`. The page loads the image itself, with `referrerPolicy = 'no-referrer'`. Only the site origin is sent, not the full result URL.
- On image `error`, the whole preview wrapper is removed.
- The popup sends `{ action: 'refreshAllPreviews' }` (type in `src/shared/messages.ts`) to the active tab. The content script removes all wrappers, clears `data-gs-processed`, and scans again.

### Why

Commit `e6a47c0` replaced `background.js`/`content.js` with `src/` and removed the worker and permissions. `README.md` ("How It Works", "Context Menu Reload", "Permissions Used", "Project Structure") and `.claude/skills/project/SKILL.md` (intro, `src/background/` in layout, "Refresh header" note, build entrypoints) were not updated.

### How to apply

- Do not trust README or the project skill on architecture. Trust `manifest.json` and `scripts/build.ts`.
- `isGoogleSearchPage` in `src/shared/url.ts` is used only by tests (it served the old worker).
- To support a new Google domain, add it to `content_scripts[0].matches` in `manifest.json`.
- Adding a background worker or cross-origin fetch needs a `background` key, a `bundleEntry` call in `scripts/build.ts`, and `host_permissions`.
- Delete this entry's stale-docs part when README and the skill are fixed.

Related: [[google-serp-dom-hooks]], [[tooling-and-release]]
