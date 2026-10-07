---
name: pr-description
description: Draft the pull request title and description for the current branch against main. Use when opening a PR.
---

# Draft the PR description

1. Read `git log main..HEAD` and `git diff main...HEAD --stat`.
2. Title: Conventional Commit style, `<type>(<scope>): <description> (#<task>)`, under 72 characters.
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
