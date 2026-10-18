# project

- [current-architecture](current-architecture.md) — no background worker; img loads direct from preview.coders.lt; README/skill are stale. tags: architecture, manifest, popup
- [google-serp-dom-hooks](google-serp-dom-hooks.md) — Google result selectors, data-gs-processed, hydration re-inject, rAF scheduler. tags: selectors, hydration, scanner
- [tooling-and-release](tooling-and-release.md) — CI takes the store version from the tag or manual input; release gets zip + signed crx before the store publish; CWS secrets/vars; Biome/knip gaps. tags: release, version, ci, cws, crx, secrets, knip
- [google-redirect-empty-q](google-redirect-empty-q.md) — all previews = google.com: keep `||` for empty q=; /goto tokens → origin from `<cite>`; how to test in a real browser. tags: redirect, goto, cite, url, nullish, bug, cdp
