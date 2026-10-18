---
name: google-redirect-empty-q
description: Why every preview can show google.com — empty q= on /url links (keep ||) and opaque /goto?url=<token> links (origin comes from <cite>)
keywords: [resolveResultUrl, /url redirect, /goto, q=, url=, cite, parseDisplayedOrigin, empty string, nullish, ??, ||, google.com preview, wrong screenshot]
source: bug reports 2026-10-18 (all thumbnails showed the Google homepage, in v1.2.2 too)
updated: 2026-10-18
---

### Rule / Fact

Google wraps some result links as `/url?esrc=s&q=&rct=j&sa=U&url=<target>`. `q` is present but empty. In `src/shared/url.ts`, `resolveResultUrl` must read `searchParams.get('q') || searchParams.get('url')`. With `??`, the empty `q` wins, the function returns the Google URL, and the preview API gets `https://www.google.com`.

### Why

Commit `e6a47c0` ("code cleanup") changed `||` to `??`. Every preview then showed a screenshot of google.com. The test `falls back to url= when q= is present but empty` in `tests/url.test.ts` now guards it.

Second cause (seen in v1.2.2, Oct 2026, on every results page): Google now sets result links to `href="/goto?url=<opaque token>"` (the `ping` is `/url?...&url=<same token>`). The token is not a URL, and no attribute in the result block holds the target. The only source is the visible breadcrumb `<cite>` text (`https://www.britannica.com › dictionary › coder`). `findPreviewOrigin` in `preview-injector.ts` uses `parseDisplayedOrigin(cite)` when the resolved URL is still on a Google host. Social results show `460+ followers` in `<cite>`; those get `data-gs-processed="skip"`.

### How to apply

- Do not "fix" this `||` to `??` under the Boy Scout rule. Here `||` is meant: an empty string must fall through.
- If all previews show the same site, check the live link `href` and `<cite>` first. `curl` and headless Chrome get a JS-only page; use a real Chrome with `--remote-debugging-port` and read the DOM through CDP.
- Branded Chrome ignores `--load-extension`. To test the real build, use Chrome for Testing (`npx @puppeteer/browsers install chrome@stable`) with `--load-extension=dist`.
- The service answers `https://preview.coders.lt/api/screenshot?url=<origin>` with a "Processing..." PNG and `refresh: 5` until the shot is ready. A first call for an origin proves the extension never asked for it before.
- Click-through still uses the `/goto` href; only the screenshot uses the cite origin.
- All Google host checks in `src/shared/url.ts` share one strict `GOOGLE_HOST_PATTERN` (`*.google.<tld>` or `.<sld>.<cc>`). Do not add a second, looser pattern: the old `/(^|\.)google\./` also matched `google.example.com`, and the old `www.`-only search check missed `google.com/search`.

Related: [[google-serp-dom-hooks]], [[boy-scout-touched-files]]
