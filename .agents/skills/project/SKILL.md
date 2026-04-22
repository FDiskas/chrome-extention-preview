---
name: project
description: Project context for the Google Search Website Previews Chrome extension — stack, commands, build/publish pipeline, layout, and code standards
---

# Project context

Chrome extension (Manifest V3) that injects live website preview thumbnails into Google Search result pages. The screenshots come from an external service at `preview.coders.lt`; the background service worker fetches them (cross-origin) and returns `data:` URLs to the content script.

## Stack

- **Language:** TypeScript (strict, `noUncheckedIndexedAccess`, ES2022, ESM)
- **Runtime / bundler:** [Bun](https://bun.sh) — both for tests and for building
- **Linter / formatter:** [Biome](https://biomejs.dev) — tabs, single quotes
- **Test runner:** `bun test` (tests live under `tests/`, use `bun:test`)
- **Target:** Chrome MV3 service worker + content script + popup

## Commands

```bash
bun run build       # bundle src/ → dist/ (ready to load unpacked or zip)
bun run typecheck   # tsc --noEmit
bun run lint        # biome check
bun run lint:fix    # biome check --write
bun run format      # biome format --write
bun test            # run the test suite
```

## Build & publish pipeline

- `scripts/build.ts` bundles three entrypoints with `Bun.build` (iife, browser target) into `dist/`:
  - `src/background/index.ts` → `dist/background.js`
  - `src/content/index.ts` → `dist/content.js`
  - `src/popup/popup.ts` → `dist/popup/popup.js`
- It also copies `popup/popup.html`, `popup/popup.css`, `css/`, `icons/`, and rewrites `manifest.json` into `dist/`.
- **`dist/` is the deliverable.** The Chrome Web Store package is zipped from `dist/` and uploaded by `.github/workflows/publish-chrome-webstore.yml` on any `v*` git tag (or manual workflow dispatch).
- Required GitHub secrets: `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_EXTENSION_ID`.

## Layout

```
src/
  background/   service worker — context menu, preview fetching, per-tab state
  content/      content script — scans Google results, injects previews
  popup/        toolbar popup
  shared/       constants, message types, URL helpers, chrome runtime helpers
tests/          bun:test unit tests (colocated by concept, not by folder)
scripts/        build.ts
manifest.json   MV3 manifest (root; copied into dist/ at build)
css/, icons/, popup/{popup.html,popup.css}  static assets copied into dist/
```

## Code standards

- **Clean code, human-readable first.** Names over comments. No cleverness that needs a footnote.
- **TDD when practical.** New logic ships with a `bun:test` spec. Prefer unit tests on pure helpers (see `tests/url.test.ts` for the shape).
- **Small modules, single responsibility.** The existing split under `src/content/` (scanner / injector / loader / link / site-name / video-detector) is the target granularity.
- **Shared types, not duplicated shapes.** Message contracts live in `src/shared/messages.ts`; constants in `src/shared/constants.ts`.
- **Biome is the source of truth** for formatting and lint. Run `bun run lint:fix` before committing.
- **No raw `console.log` in shipped code** beyond deliberate `console.warn`/`console.error` for real failures.
- **Strict TS.** Don't widen types to silence errors — fix the shape.

## Things worth knowing

- Chrome Web Store identity lives in GitHub secrets, not in-repo.
- The preview service (`preview.coders.lt`) may respond with a `Refresh` header when generation is in-progress; the fetcher retries based on it.
- Google rolls out DOM changes often; the scanner targets stable selectors and tolerates hydration. Assume result markup can and will drift.
