# Backend rules (Spring Boot)

Applies to everything under `backend/`. The root `AGENTS.md` also applies.

## Structure

Base package `com.tecnocampus.LS2.protube_back`:

* `controller/` — `@RestController`s under `/api/...`. Thin: validate input, call a service, return a DTO.
* `services/` — business logic. Transactions (`@Transactional`) live here.
* `repository/` — Spring Data JPA interfaces (to be added, NFR-01).
* `domain/` — JPA entities. Never returned from controllers.
* `dto/` — request/response records (`public record VideoDto(...)`).
* `configuration/` — Spring config (`MvcConfig` serves `/media/**` from `pro_tube.store.dir`).

## Code

* Constructor injection with `final` fields. Do not add new field `@Autowired`.
* DTOs as Java `record`s. Map entity ↔ DTO in the service or a dedicated mapper, not in the controller.
* Errors: throw domain exceptions from services and translate them to HTTP status in a `@RestControllerAdvice`
  (404 for not found, 400 for validation, 403 for ownership). Do not return `null` bodies.
* Read config through `Environment`/`@Value("${pro_tube.store.dir}")`, never hardcoded paths or secrets.
* Persistence must target PostgreSQL in `prod` (NFR-01). H2 is only for `dev` and tests.

## Tests

* JUnit 5 (`org.junit.jupiter`) + Mockito + AssertJ/`Assertions`. Do not use JUnit 4 (`org.junit.Test`).
* Unit test services with Mockito mocks; test controllers with `@WebMvcTest` + `MockMvc`.
* `@SpringBootTest` only for wiring/integration; pass `pro_tube.store.dir` as a property (see
  `ProtubeBackApplicationTests`).
* Test classes mirror the main package and end in `Test`.
* JaCoCo fails the build below 50% line coverage per class or 75% for the bundle: add tests with every new class.
