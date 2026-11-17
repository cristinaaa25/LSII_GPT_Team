# Swagger UI: interactive API documentation with SpringDoc OpenAPI

**Approved on:** pending (PR #<n>)
**Approved by:** team review in PR #<n>
**Used for:** adding interactive OpenAPI documentation (Swagger UI at `/swagger-ui.html` and OpenAPI spec at `/v3/api-docs`) to Spring Boot 3.3 backend with JWT bearer authorization, ensuring SecurityConfig and React SPA routing in IndexController do not intercept them, and integration testing.

## Prompt

```
Add interactive API documentation with springdoc-openapi (version compatible with Spring Boot 3.3).
1. Swagger UI at /swagger-ui.html and the spec at /v3/api-docs, reachable without login in Docker (localhost:8080).
   Check that SecurityConfig and IndexController (SPA forwarding) do not intercept these paths.
2. Declare a bearer JWT security scheme so the "Authorize" button works with the token from /api/auth/login.
3. Add a title, version and short description; annotate endpoints only where the generated docs are wrong.
4. One test: GET /v3/api-docs returns 200 and contains /api/videos. Document the URL in DEVELOPMENT.md.
```

## Notes

- Tool/model: Google Antigravity, Gemini 3.8 Flash. Used in `task/21-swagger-ui`.
- Added dependency `springdoc-openapi-starter-webmvc-ui` (v2.3.0) to `backend/pom.xml`.
- Configured `OpenApiConfig` with `@SecurityScheme` and `OpenAPI` bean defining `Info` (title "ProTube API", version "1.0.0", description) and global `SecurityRequirement("bearerAuth")` so the "Authorize" button is displayed in Swagger UI and automatically sends the Bearer JWT token on authenticated requests.
- Excluded `/v3` and `/swagger-ui` from client-side SPA routing regex in `IndexController` (`SPA_SEGMENT`), using non-capturing negative lookaheads `^(?!api$)(?!v3$)(?!swagger-ui$)[^.]*` to avoid regex capture group errors while preventing SPA forwarding from intercepting documentation endpoints.
- Configured public access to `/swagger-ui.html`, `/swagger-ui/**`, `/v3/api-docs`, and `/v3/api-docs/**` in `SecurityConfig`.
- Fixed avatar upload endpoint in `UserController` by specifying `consumes = MediaType.MULTIPART_FORM_DATA_VALUE`, preventing SpringDoc from misdocumenting it as `application/json`.
- Added `OpenApiIntegrationTest` verifying that GET `/v3/api-docs` returns 200 and contains `/api/videos`, title, and bearerAuth scheme, and that `/swagger-ui.html` redirects to Swagger UI. Added non-interception tests in `SpaRoutingSecurityTest`.
- Documented Swagger UI and OpenAPI URLs in `DEVELOPMENT.md`.
