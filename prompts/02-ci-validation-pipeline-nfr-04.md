# CI validation pipeline (NFR-04)

**Approved on:** pending (PR task/nfr-04-CI-pipeline)
**Approved by:** <team members / PR link>
**Used for:** improving the GitHub Actions CI pipeline (.github/workflows/main.yml) with parallel frontend and backend jobs, caching, docker build check, and e2e job.

## Prompt

Review and improve .github/workflows/main.yml (NFR-04). It must run on every PR to develop and main.
1. Split into parallel frontend and backend jobs with npm and Maven caching.
2. Backend: use mvn directly (the takari wrapper step is outdated) and drop -Pcoverage (that profile does not exist).
3. Keep lint, tests and coverage thresholds as failing steps; upload coverage reports.
4. Add a docker build check (after 13) and the E2E job (after 12).
5. Keep job names stable so they can be required status checks in the ruleset; tell me the names.

## Notes

- Tool and model: Antigravity (Gemini 3.8 Flash).
- Parallel jobs: `frontend`, `backend`, `docker`, and `e2e` execute independently and concurrently.
- Stable job names for GitHub repository ruleset:
  - `Frontend` (id: `frontend`)
  - `Backend` (id: `backend`)
  - `Docker Build` (id: `docker`)
  - `E2E Tests` (id: `e2e`)
- Caching:
  - Frontend: `actions/setup-node@v4` with `cache: 'npm'` and `cache-dependency-path: frontend/package-lock.json`.
  - Backend: `actions/setup-java@v5` with `cache: 'maven'`.
- Backend uses `mvn clean verify` directly without Takari wrapper or nonexistent `-Pcoverage` profile.
- Docker check builds `compose.yaml` and `backend/Dockerfile` using `docker compose build`.
- E2E job checks for test suites and executes them or passes with a status message until NFR-02 is implemented.
