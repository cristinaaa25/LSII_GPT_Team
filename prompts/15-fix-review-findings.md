# Fix: apply review findings to a merged feature

**Approved on:** 2026-10-27 (PR #11)
**Approved by:** team review in PR #11
**Used for:** follow-up PR that fixes bugs and cleanups found when reviewing a feature PR that was already
merged into `develop` (failing tests, wrong JSON formats, inflated counters, dead code).

## Prompt

```
PR #<n> (<feature, e.g. "US-05 video player">) was merged into develop. A review found these problems:
<numbered list of findings, each with the file, the observed behaviour and the expected one>
Fix them on a new branch task/fix-<feature> with the smallest change that solves each one:
1. Blocking findings first (red tests, user-visible bugs); then the minor cleanups.
2. For every bug add or update a test that fails without the fix.
3. Do not change public endpoints that other code uses, except to remove unused aliases.
4. Run the Definition of Done (backend `mvn clean verify -Pcoverage`, frontend `npx jest`, lint, build) and
   check the fix in the jar with docker compose.
Follow AGENTS.md, backend/AGENTS.md and frontend/AGENTS.md.
```

## Notes

- Tool/model: Claude Code, Claude Opus 5.5. First used in `task/fix-us-05-video-player` (findings on PR #10).
- `spring.jackson.*` properties have no effect because `MvcConfig` uses `@EnableWebMvc`; date formats
  must be set on the DTO (`@JsonFormat(shape = STRING)`) or by changing the MVC configuration.
- Reused in `task/phase3-cleanup` for the findings of PRs #14, #15, #16 and #17 together (branch named after
  the phase instead of one feature).
- Uploaded images served from `/media` must be a raster whitelist (png/jpg/webp) with the extension taken from
  the validated content type: an SVG on our origin can run scripts and read the JWT from localStorage.
- The runtime image needs ffmpeg for upload thumbnails; a missing binary only showed up as `null` fields, so
  external tools must log a WARN when they cannot run, and their output must be redirected (not left in a pipe).
