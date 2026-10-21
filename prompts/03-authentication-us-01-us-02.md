# Authentication: User Registration and Login (US-01, US-02)

**Approved on:** pending (PR #<n>)
**Approved by:** <team members / PR link>
**Used for:** Full-stack feature implementing user registration (US-01) and user login (US-02) with Spring Security, BCrypt, JWT authorization, REST endpoints, and React Router integration.

## Prompt

```
Implement US-01 (registration) and US-02 (login) from REQUIREMENT.md, meeting all acceptance criteria.
Backend:
1. Spring Security with BCrypt. Session strategy: JWT in Authorization header.
2. Endpoints: POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me.
3. Validate input (email format, unique email/username, password min 8 chars); return 400/409 with clear messages.
4. Public: GET /api/videos/**, /media/**, auth endpoints. Anything that creates or changes data requires auth.
5. Keep CORS working for the Vite dev server.
Frontend:
6. Add react-router: /login and /register pages, an AuthContext with the current user, header with user menu
   and logout, and a ProtectedRoute that redirects to /login.
Tests: service unit tests, @WebMvcTest with security (200/400/401/409), frontend tests for both forms and
the protected route.
```

## Notes

* Tool / model: Antigravity, Gemini 3.8 Flash.
* Session strategy: Stateless JWT authentication via `Authorization: Bearer <token>` header.
* Password hashing: Spring Security `BCryptPasswordEncoder`.
* Security configuration: `SecurityConfig` permits `GET /api/videos/**`, `/media/**`, `/api/auth/**` (register, login, logout), while protecting `/api/auth/me` and all data-mutating routes (`POST`, `PUT`, `DELETE`).
* Input validation: Returns 400 for malformed email and passwords under 8 characters; returns 409 Conflict for duplicate username or email. Unauthenticated access returns 401 via `RestAuthenticationEntryPoint` with standard RFC 7807 `ProblemDetail`.
* Frontend: Integrated `react-router-dom`, created `AuthContext` with persistent localStorage token handling, `LoginPage`, `RegisterPage`, `ProtectedRoute`, and updated `Header` with dynamic user menu and logout support.
* Tests: JaCoCo and Jest coverage requirements met across backend and frontend suites.
