# Containerized delivery with Docker Compose (NFR-03)

**Approved on:** pending (PR task/nfr-03-containerized-delivery)
**Approved by:** <team members / PR link>
**Used for:** setting up containerized application delivery with multi-stage Docker build, Docker Compose, PostgreSQL service with healthcheck, environment template and volume mounting.

## Prompt

Implement NFR-03 from REQUIREMENT.md: `docker compose up --build` on a clean machine starts the whole app.
1. Multi-stage backend/Dockerfile: build with Maven -Pprod (it bundles the frontend), run on a Java 21 JRE.
2. compose.yaml: db (postgres:16, healthcheck, named volume) and app (depends on healthy db, port 8080, env
   vars, video store mounted as a volume). Keep variable names consistent with application.properties.
3. .env.example with every variable and dummy values; .env ignored by git.
4. Verify it from scratch and document it in DEVELOPMENT.md and AGENTS.md (Commands).

## Notes

- Tool and model: Antigravity (Gemini 3.8 Flash).
- The Maven `prod` profile bundles the frontend from `../frontend` into `backend/target/classes/static`, so the Docker build context must be the root directory (`context: .`, `dockerfile: backend/Dockerfile`).
- A `.dockerignore` file prevents host `node_modules`, `target`, and environment files from leaking into the build context.
- The `app` service waits for `db` to be healthy using `pg_isready` before starting.
- Environment variable names align with Spring Boot `application.properties`: `ENV_PROTUBE_DB_HOST`, `ENV_PROTUBE_DB`, `ENV_PROTUBE_DB_USER`, `ENV_PROTUBE_DB_PASS`, `ENV_PROTUBE_STORE_DIR`, `ENV_PROTUBE_GOOGLE_CLIENT_ID`, `ENV_PROTUBE_GOOGLE_CLIENT_SECRET`.
