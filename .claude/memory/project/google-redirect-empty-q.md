---
name: google-redirect-empty-q
description: resolveResultUrl must use || (not ??) between q= and url= — Google sends an empty q= on /url redirects, and ?? made every preview show google.com
keywords: [resolveResultUrl, /url redirect, q=, url=, empty string, nullish, ??, ||, google.com preview, wrong screenshot]
source: bug report 2026-10-18 (all thumbnails showed the Google homepage)
updated: 2026-10-18
---

### Rule / Fact

Google wraps some result links as `/url?esrc=s&q=&rct=j&sa=U&url=<target>`. `q` is present but empty. In `src/shared/url.ts`, `resolveResultUrl` must read `searchParams.get('q') || searchParams.get('url')`. With `??`, the empty `q` wins, the function returns the Google URL, and the preview API gets `https://www.google.com`.

### Why

Commit `e6a47c0` ("code cleanup") changed `||` to `??`. Every preview then showed a screenshot of google.com. The test `falls back to url= when q= is present but empty` in `tests/url.test.ts` now guards it.

### How to apply

- Do not "fix" this `||` to `??` under the Boy Scout rule. Here `||` is meant: an empty string must fall through.
- If all previews show the same site, log the value passed to `toOriginUrl` in `preview-injector.ts` before you suspect the screenshot service.

Related: [[google-serp-dom-hooks]], [[boy-scout-touched-files]]
