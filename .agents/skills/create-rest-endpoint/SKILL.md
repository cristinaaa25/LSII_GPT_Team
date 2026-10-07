---
name: create-rest-endpoint
description: Create or extend a REST endpoint in the Spring Boot backend (controller, service, repository, DTO and tests). Use when adding or changing an /api route.
---

# Create a REST endpoint

1. Read the user story in `REQUIREMENT.md` and the rules in `backend/AGENTS.md`.
2. Check `prompts/` for an approved prompt for this task and follow it.
3. Define request/response DTOs as records in `dto/`.
4. Add or extend the entity in `domain/` and its Spring Data interface in `repository/` (only if data is persisted).
5. Put the logic in a `@Service` in `services/` with constructor injection; throw domain exceptions for
   not-found / forbidden / invalid cases.
6. Add the controller method under `/api/<resource>` in `controller/`. Return `ResponseEntity<Dto>` with the right
   status (200, 201 + `Location`, 204, 400, 403, 404).
7. Tests:
   * Service unit test with Mockito (happy path + every error branch).
   * Controller test with `@WebMvcTest` + `MockMvc` (status codes and JSON body).
8. Run `mvn clean verify` from `backend/` until green (tests + JaCoCo thresholds).
9. If the frontend consumes it, update or create the hook in `frontend/src/hooks/`.
10. If AI generated the code, run the `save-ai-prompt` skill.
