---
name: tooling-and-release
description: Release gotchas — Chrome Web Store uses manifest.json version (not package.json), v* tag publishes; Biome/knip coverage gaps
keywords: [release, version, manifest version, package.json, cws, chrome web store, v tag, ci, biome, knip, unused, bun]
updated: 2026-10-18
---

### Rule / Fact

- The Chrome Web Store reads `version` from `manifest.json` (now `1.2`). `package.json` `version` (now `1.1.0`) is not used by the build or the store. `scripts/build.ts` copies the manifest as is.
- Pushing any `v*` tag runs `.github/workflows/publish-chrome-webstore.yml`: typecheck → lint → test → build → zip `dist/` → publish. There is no separate "upload as draft" step.
- `bun run unused:check` runs knip (not listed in the project skill). knip ignores `scripts/`.
- Biome checks only `src/`, `tests/`, `scripts/` and three JSON configs. It does not check `css/`, `popup/`, `manifest.json` or `knip.config.ts` (that file uses 2-space indent, unlike the rest).

### Why

The store rejects an upload whose manifest version is not higher than the published one, and that failure happens only at the last CI step, after the tag is pushed.

### How to apply

- Before you tag a release, bump `manifest.json` `version` (and keep `package.json` in step if you change it).
- The tag name does not set the version; it only starts the workflow.
- Run `bun run typecheck && bun run lint && bun test && bun run build` locally first; CI runs the same steps.

Related: [[current-architecture]], [[boy-scout-touched-files]]
