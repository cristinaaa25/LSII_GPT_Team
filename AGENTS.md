# ProTube

University group project (LS2, Tecnocampus): a web app where users watch, upload and comment on videos.
Monorepo:

* `backend/` — Spring Boot 3.3 REST API (Java 21, Maven). Serves `/api/**` and `/media/**`. Rules: `backend/AGENTS.md`.
* `frontend/` — React 19 + TypeScript SPA (Vite, Jest). Rules: `frontend/AGENTS.md`.
* `tooling/videoGrabber/` — Python script that fills the video store folder (`.mp4`/`.webp`/`.json` per video).
* `prompts/` — approved AI prompts (mandatory, see "AI usage" below).

Before implementing a feature, read its user story and acceptance criteria in `REQUIREMENT.md`.
Setup, env vars and troubleshooting: `DEVELOPMENT.md`. Assignment rules: `README.md`.

## Language

* Reply in the language the user writes in (Catalan, Spanish or English).
* Everything written to the repository stays in **English**: code, identifiers, comments, tests, commit messages,
  PR descriptions, docs and prompt files.

## Commands

Run them from the folder shown. These are the same steps CI runs (`.github/workflows/main.yml`).

| What                    | Backend (`backend/`)                   | Frontend (`frontend/`)               |
|-------------------------|----------------------------------------|--------------------------------------|
| Install                 | —                                      | `npm ci`                             |
| Run (dev)               | `mvn spring-boot:run`                  | `npm run dev` (port 5173)            |
| All tests + coverage    | `mvn clean verify`                     | `npm run test`                       |
| One test                | `mvn test -Dtest=Class#method`         | `npx jest path/to/File.test.tsx`     |
| Lint / format           | —                                      | `npm run lint` / `npm run format`    |
| Build                   | `mvn -Pprod clean package`             | `npm run build`                      |

* The Maven wrapper is not committed: use `mvn` (CI generates `./mvnw`). JaCoCo runs on every `verify`
  (report: `backend/target/site/jacoco/index.html`); there is no `coverage` Maven profile.
* The backend needs `ENV_PROTUBE_STORE_DIR` (absolute path, ending in a path separator). Never hardcode paths.

## Conventions

* Branches: `feature/<ticket>-short-name`, `fix/<ticket>-short-name`. Never commit or push to `main`.
* Every change goes through a Pull Request: at least 1 teammate approval, all Copilot review comments resolved,
  then **squash merge**.
* Commits: [Conventional Commits](https://www.conventionalcommits.org/) `type(scope): description`, referencing
  the task (e.g. `feat(video): list videos from the store (#12)`).
* Backend layering: Controller → Service → Repository. Controllers return DTOs, never JPA entities.
* Frontend: API calls only through hooks/services that use `getEnv()` from `src/utils/Env.ts`.
* No secrets in code, config, prompts or docs. Use environment variables.
* Do not touch generated folders: `frontend/dist/`, `frontend/coverage/`, `backend/target/`, `node_modules/`.

## AI usage (project rules — NFR-06, NFR-07)

* This file and everything under `.agents/`, `.claude/` and `prompts/` are team-reviewed: change them only via PR.
* Before generating code with AI, check `prompts/` for an approved prompt for that task type and reuse it.
* When AI generated part of a change, save the prompt in `prompts/` and mark the commit (skill `save-ai-prompt`):
  ```
  feat(video): list videos from the store (#12)

  AI-assisted. Prompt: prompts/02-create-rest-endpoint.md
  Co-Authored-By: <AI tool and model> <noreply@...>
  ```
* The author must understand and be able to explain every AI-generated line (it is evaluated in the exam).

## Definition of Done

A task is done only when all of these hold:

1. Acceptance criteria of the user story in `REQUIREMENT.md` are met.
2. Tests added or updated for the new behaviour; `mvn clean verify` and `npm run test` pass.
3. Coverage thresholds pass (JaCoCo: 75% bundle / 50% per class; Jest: 75% global). Never lower them.
4. `npm run lint` passes with no errors.
5. Prompts used are saved in `prompts/` and referenced in the commit.
6. PR approved by at least one teammate, Copilot comments resolved, CI green.

## Known pitfalls

Mistakes the agent has repeated. Add new ones after each sprint retrospective.

* `application.properties` (`prod`) uses `ENV_PROTUBE_DB_HOST`, `ENV_PROTUBE_DB`, `ENV_PROTUBE_DB_USER`,
  `ENV_PROTUBE_DB_PASS` (not `_PWD`). Trust `application.properties` over older docs.
* Frontend tests mock `src/utils/Env` globally in `jest.setup.ts`: do not call `import.meta.env` directly in code
  under test.
