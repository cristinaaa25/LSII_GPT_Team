# Automated End-to-End Tests (NFR-02)

**Approved on:** pending (PR #19)
**Approved by:** team review in PR #19
**Used for:** implementing automated end-to-end testing suite with Playwright, covering MVP golden paths, test fixtures, docker-compose execution, and CI workflow integration.

## Prompt

Implement NFR-02 from REQUIREMENT.md with Playwright.
1. Set it up in `e2e/` at repo root with its own npm scripts.
2. Golden paths: register + login, browse and play a video, upload, search, comment + reply + like,
   edit metadata, edit profile.
3. Run against the docker-compose stack with seed data and a small test video. Each test creates its own
   data (unique users) so tests are independent.
4. Prefer accessible selectors (role, label); data-testid only when needed.
5. Add a CI job that starts the stack and runs the suite.

## Notes

- Tool and model: Antigravity (Gemini 3.8 Flash).
- Framework chosen: Playwright with TypeScript in `e2e/`.
- Isolated from frontend dependencies to avoid any package conflicts with React 19 / Jest / ESLint 9.
- Accessible locators (`getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`) used across all test cases.
- Generated minimal seed fixtures (`1.mp4`, `1.webp`, `1.json`) and media fixtures for video upload and avatar editing.
- CI job updated in `.github/workflows/main.yml` to spin up Docker Compose, wait for backend/frontend availability, run Playwright test suite, and clean up afterwards.
