# Fix: serve the React SPA behind Spring Security

**Approved on:** pending (PR #<n>)
**Approved by:** <team members / PR link>
**Used for:** fixing access rules when the packaged jar (Docker, `localhost:8080`) serves the frontend and the page
comes out blank, or a client-side route returns 401/404, after a change to `SecurityConfig`.

## Prompt

```
After <change, e.g. "adding Spring Security in PR #n">, the app served from the jar (docker compose,
localhost:8080) shows a blank page: <failing paths, e.g. /assets/*.js, /assets/*.css, /login> return
<status>. Dev mode (Vite, 5173) works. Fix it in the backend:
1. SecurityConfig: keep the existing API rules, require authentication for any other /api/**, and permit
   every GET outside /api (static files and SPA routes). Non-GET requests outside the API stay authenticated.
2. IndexController: serve the "index" view for client-side routes (any path without a dot outside /api,
   up to two segments, e.g. /login, /videos/42) so a reload or a direct link works.
3. Add a @WebMvcTest that checks: SPA routes return the index view without a token, static files are not
   blocked by security (404 in tests, not 401), /api/** without a token returns 401, and non-GET requests
   outside /api return 401.
4. Verify in the jar: docker compose up -d --build, then curl /, /assets/<file>, the SPA routes and /api/**.
Follow AGENTS.md and backend/AGENTS.md.
```

## Notes

- Tool/model: Claude Code, Claude Opus 5.5. First used in `task/fix-spa-security` (fix for PR #8).
- Manual fix needed: Spring 6 does not match `""` with `/`, so `IndexController` maps both.
- The test overrides `spring.thymeleaf.prefix` to `classpath:/templates/` because `static/index.html` only
  exists after the frontend build.
- Client-side routes with more than two segments need a new pattern in `IndexController`.
