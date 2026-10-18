---
name: tooling-and-release
description: Release gotchas — CI sets the store version from the release tag (v1.3 or 1.3) (or manual input), not from manifest.json; CWS credentials; Biome/knip coverage gaps
keywords: [release, version, manifest version, package.json, cws, chrome web store, v tag, ci, biome, knip, unused, bun]
updated: 2026-10-18
---

### Rule / Fact

- The Chrome Web Store reads `version` from the uploaded `manifest.json`. CI overwrites `dist/manifest.json` `version` with the release version (step "Set manifest version", via `jq`). The `version` in the repo `manifest.json` (`1.2`) and `package.json` (`1.1.0`) is not used for releases.
- Release version: tag `v1.3` or `1.3` → `1.3` (trigger patterns `v[0-9]*` and `[0-9]*`; a GitHub release created with tag `1.2.1` did not run the old `v*`-only trigger); a manual run (`workflow_dispatch`) needs the `version` input. The first step rejects anything that is not 1–4 dot-separated numbers without leading zeros.
- `.github/workflows/publish-chrome-webstore.yml`: resolve version → typecheck → lint → test → build → set version → zip `dist/` as `google-search-website-previews-<version>.zip` → publish → attach the zip to the GitHub release (tag runs only; creates the release if missing; job needs `contents: write`). There is no separate "upload as draft" step.
- The workflow reads `CWS_CLIENT_SECRET` and `CWS_REFRESH_TOKEN` (scope `https://www.googleapis.com/auth/chromewebstore`) from repo secrets, and `CWS_CLIENT_ID` and `CWS_EXTENSION_ID` from repo variables (`vars.*`). The OAuth client must be your own Web application client — `407408718192` is the OAuth Playground default client and its tokens are revoked after 24h. If the OAuth consent screen stays in "Testing" status, the refresh token expires after 7 days and the publish step fails — set it to "In production".
- `bun run unused:check` runs knip (not listed in the project skill). knip ignores `scripts/`.
- Biome checks only `src/`, `tests/`, `scripts/` and three JSON configs. It does not check `css/`, `popup/`, `manifest.json` or `knip.config.ts` (that file uses 2-space indent, unlike the rest).

### Why

The store rejects an upload whose version is not higher than the published one (`PKG_INVALID_VERSION_NUMBER`), and that failure happens only at the last CI step. Taking the version from the tag removes the manual bump.

### How to apply

- To release, push a tag higher than the published version (`git tag v1.3 && git push origin v1.3`), or run the workflow by hand with that version.
- Do not bump `manifest.json` by hand for releases; CI ignores it.
- Run `bun run typecheck && bun run lint && bun test && bun run build` locally first; CI runs the same steps.

Related: [[current-architecture]], [[boy-scout-touched-files]]
