# Persistence with PostgreSQL (NFR-01)

**Approved on:** pending (PR #<n>)
**Approved by:** <team members / PR link>
**Used for:** Implementing database persistence with PostgreSQL, Flyway migrations, JPA entities, repositories, and slice tests.

## Prompt

Implement NFR-01 from REQUIREMENT.md: data must be persisted in PostgreSQL, never in memory or H2.
1. Make the dev and prod profiles use PostgreSQL, reusing the service in compose.yaml and the variables
   already read in application.properties (ENV_PROTUBE_DB_HOST, ENV_PROTUBE_DB, ENV_PROTUBE_DB_USER,
   ENV_PROTUBE_DB_PASS). Tests: in-memory DB.
2. Manage the schema with Flyway migrations (src/main/resources/db/migration) and ddl-auto=validate.
3. Propose the MVP domain model (User, Video, Comment with optional parent for replies, CommentLike,
   VideoView) as a short table. Wait for confirmation before writing code.
4. Implement the entities in domain/ and Spring Data repositories in repository/.
5. Add @DataJpaTest tests and keep `mvn clean verify` green.
6. Update DEVELOPMENT.md (how to start the database, env vars) and fix outdated variable names.

## Notes

- Tool: Antigravity
- Model: Gemini 3.8 Flash
- Domain entities: `User`, `Video`, `Comment`, `CommentLike`, `VideoView`.
- In-memory H2 with `MODE=PostgreSQL` is configured for test executions to ensure tests remain fast and runnable without requiring a local Docker daemon.
