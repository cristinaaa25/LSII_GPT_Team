# Copilot instructions

The project rules live in `AGENTS.md` (root), `backend/AGENTS.md` and `frontend/AGENTS.md`. Follow them.

When reviewing pull requests, flag as blocking:

* Controllers returning JPA entities instead of DTOs, or logic outside the Controller → Service → Repository layers.
* New behaviour without tests, frontend tests calling the real API, or lowered coverage thresholds.
* Secrets, tokens, passwords or hardcoded local paths.
* AI-assisted commits without a prompt file in `prompts/` referenced in the commit message.
* Commit messages that are not Conventional Commits in English.
* Pull requests from `task/*` or `feature/*` branches that target `main` instead of `develop` (only `release/*` and
  `hotfix/*` may target `main`).
