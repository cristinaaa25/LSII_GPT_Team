---
name: review-changes
description: Review the current branch diff against its base branch (`develop`, or `main` for release/hotfix) using the team checklist and report Blockers / Suggestions / Nits. Read-only. Use before opening or approving a PR.
---

# Review the branch

Never edit files during a review: only read and report.

1. Base = `develop` (or `main` for `release/*` and `hotfix/*`). Run `git fetch origin`, then get the diff with
   `git diff origin/<base>...HEAD` plus `git status` for uncommitted work. Read the changed files fully.
2. Check each item:
   * **Scope** — matches a user story/task in `REQUIREMENT.md`; no unrelated changes.
   * **Backend** — Controller → Service → Repository; DTOs returned, never entities; constructor injection;
     correct HTTP status codes; no hardcoded paths.
   * **Frontend** — API only via hooks + `getEnv()`; loading/error/empty states; no `any`.
   * **Tests** — new behaviour is tested, including error branches; frontend tests mock the API; JUnit 5 only.
   * **Coverage/CI** — thresholds not lowered; commands in `AGENTS.md` would pass.
   * **Security** — no secrets, tokens or passwords; ownership checks on edit/delete; input validated.
   * **AI rules** — AI-generated changes have a prompt in `prompts/` and an AI-marked commit message.
   * **Git flow** — branch name matches `task/`, `feature/`, `release/` or `hotfix/`; PR base is `develop`
     (only release/hotfix target `main`).
   * **Commits** — Conventional Commits with task reference; English.
3. Report, citing `file:line`:
   * **Blockers** — must be fixed before merge.
   * **Suggestions** — should be fixed.
   * **Nits** — optional.
   End with a one-line verdict: ready / not ready to merge.
