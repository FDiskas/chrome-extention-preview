---
name: boy-scout-touched-files
description: MANDATORY — in every file you change, review the whole file and fix its tsc errors, Biome warnings and code smells in the same task; never report them as "pre-existing"
keywords: [boy scout rule, clean-code, pre-existing errors, tsc, biome, touched files, cleanup, duplication]
source: Vytenis Kuciauskas (CC-1877, CC-3573)
updated: 2026-10-18
---

### Rule / Fact

When a task changes a file, also fix the existing problems in that whole file before you report:

- `tsc` errors in that file: `bun run typecheck 2>&1 | grep <file>`.
- Biome warnings: `bunx biome check <file>` (or `bun run lint:fix`).
- Duplicated logic or DOM-building code (extract a small named function).
- Commented-out code, including in CSS (delete it).
- Unneeded `?.` on required values, `||` where `??` is meant, redundant checks.
- Unused parameters, unused return fields, unused exports (`bun run unused:check` runs knip).
- Repeated predicates (extract a named function), aliases that only rename a field.

### Why

The user corrected "pre-existing" reports more than once and then made the rule a hard requirement (IMPORTANT section in `CLAUDE.md`). A partial cleanup of one line does not count. On 2026-10-18 the user said again: "always follow boy scout principle for all edited files" — it applies to follow-up edits in the same session too, not only to the first change.

### How to apply

- Scope: only files the diff touches. Do not clean untouched files.
- Apply it again after each follow-up edit (a small tweak the user asks for), not only once per task.
- Keep cleanups behaviour-preserving. If a cleanup changes behaviour (an empty `catch`, a listener that does two things, a CSS rule whose removal changes the look), name it in the report and ask.
- Biome does not check `css/`, `popup/*.html`, `manifest.json` or `knip.config.ts` (see `biome.json` `files.includes`). Review those by hand when you touch them.
- After the cleanup, run `bun run lint`, `bun run typecheck` and `bun test`.

Related: [[tooling-and-release]]
