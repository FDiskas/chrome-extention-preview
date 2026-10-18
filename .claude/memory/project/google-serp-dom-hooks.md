---
name: google-serp-dom-hooks
description: Google result DOM selectors the content script depends on, and how it survives hydration re-renders (data-gs-processed reset, rAF scheduler, MutationObserver)
keywords: [google serp, selectors, data-hveid, data-sncf, data-snhf, jsname UWckNb, hydration, mutationobserver, data-gs-processed, video results, scanner]
updated: 2026-10-18
---

### Rule / Fact

Selectors in use (all can drift when Google changes markup):

| Purpose | Selector | File |
| --- | --- | --- |
| Result title | `h3` inside `a[href]` | `result-scanner.ts` |
| Result block | closest `[data-hveid], .g` | `result-scanner.ts` |
| Primary link fallback | `a[jsname="UWckNb"]` | `result-link.ts` |
| Insert point (description) | `[data-sncf="1"]` | `preview-injector.ts` |
| Site name | leaf `span` in `[data-snhf="0"]` | `site-name.ts` |
| Video skip | host list, `g-video-preview`, `[data-vid]`, "video" headings | `video-detector.ts` |

State marker: `link.dataset.gsProcessed` = `'true'` (injected) or `'skip'` (video, non-http, Google search link). Injected classes come from `CSS` in `src/shared/constants.ts` and must match `css/styles.css`.

### Why

Google hydrates the page after first paint and can replace result nodes, which removes the injected wrapper while the link keeps `data-gs-processed="true"`. So `processResults` deletes the marker when the block has no `.gs-preview-wrapper`, and injects again. The script starts at `document_start` and scans on `readystatechange`, `DOMContentLoaded`, `load` and every DOM addition (MutationObserver). `createFrameScheduler` collapses those calls to one scan per animation frame.

### How to apply

- When previews disappear or do not show, first check these selectors against live Google markup.
- If `[data-sncf="1"]` is missing, the injector returns without a mark, so it retries on the next mutation. Keep that: do not mark `'skip'` for missing containers.
- Keep the wrapper `click` handler `stopPropagation`: Google result blocks have their own click handlers.
- A new CSS class goes into `CSS` in `constants.ts` and `css/styles.css` together.
- The DOM modules have no tests; only `src/shared/url.ts` is tested.

Related: [[current-architecture]]
