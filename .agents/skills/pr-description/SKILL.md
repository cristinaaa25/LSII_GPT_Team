---
name: pr-description
description: Draft the pull request title and description for the current branch against its base (`develop`; `main` only for release/hotfix). Use when opening a PR.
---

# Draft the PR description

1. Base = `develop` (or `main` for `release/*` and `hotfix/*`). Run `git fetch origin`, then read
   `git log origin/<base>..HEAD` and `git diff origin/<base>...HEAD --stat`.
2. Remind the user to set the PR base to `develop` (default branch). Title: Conventional Commit style, `<type>(<scope>): <description> (#<task>)`, under 72 characters.
3. Body (English, Markdown):
   ```
   ## Context
   <user story / task and why>

   ## Changes
   - <bullet per meaningful change>

   ## How to test
   1. <steps, commands, URLs>

   ## Definition of Done
   - [ ] Acceptance criteria met
   - [ ] Tests added, `mvn clean verify` and `npm run test` green
   - [ ] Lint passes
   - [ ] AI prompts saved in `prompts/` (list them, or "No AI used")
   ```
4. Show the draft to the user. Do not create the PR unless asked.
