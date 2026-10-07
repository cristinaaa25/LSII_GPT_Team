# Shared AI configuration for the repository

**Approved on:** pending (PR feature/ai-config)
**Approved by:** <team members / PR link>
**Used for:** creating or updating the team's AI configuration (AGENTS.md, nested rules, skills, reviewer agent)

## Prompt

Read the whole project (README.md, REQUIREMENT.md, DEVELOPMENT.md, CI workflow, backend and frontend code) and
the course slides "AI in the repository". We need a common AI configuration for the group, following the
teacher's example and best practices, that satisfies the project requirements (NFR-06, NFR-07) and lasts long
term. The team uses Claude Code and Antigravity CLI (agy); Copilot reviews PRs.

Requirements:
- `AGENTS.md` as the single source of truth: overview, exact commands (same as CI), conventions, AI usage rules,
  Definition of Done, and a "known pitfalls" section updated in retrospectives.
- Thin adapters per tool: `CLAUDE.md` containing only `@AGENTS.md`; nested `backend/` and `frontend/` rules.
- Skills in one place (`.agents/skills/`), with thin wrappers in `.claude/skills/` for Claude Code.
- A read-only reviewer that answers Blockers / Suggestions / Nits.
- Files in English, but the agent must reply in the user's language (Catalan, Spanish or English).
- No secrets. Do not commit; leave the changes for team review.

## Notes

- Generated with Claude Code (Claude Opus 5.5).
- Antigravity reads `AGENTS.md` (also nested) and `.agents/skills/`; Claude Code reads `CLAUDE.md` and
  `.claude/skills/`, `.claude/agents/`.
