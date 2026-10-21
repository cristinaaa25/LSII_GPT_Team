# Fix: serve the React SPA behind Spring Security

**Approved on:** pending (PR #<n>)
**Approved by:** <team members / PR link>
**Used for:** fixing access rules when the packaged jar (Docker, `localhost:8080`) serves the frontend and a page
comes out blank or a client-side route returns 401/404.

## Prompt

```
After the auth PR (#8), the app served from the jar (docker compose, localhost:8080) shows a blank page:
/assets/*.js and *.css return 401, and /login, /register return 401. Dev mode (Vite 5173) is fine.
Fix it in the backend:
1. SecurityConfig: keep the API rules as they are, require authentication for any other /api/**, and permit
   every GET outside /api (static files and SPA routes). Non-GET requests outside the API stay authenticated.
2. IndexController: serve the "index" view for client-side routes (any path without a dot outside /api, up to
   two segments, e.g. /login, /videos/42) so a reload or a direct link works.
3. Add a @WebMvcTest that checks: SPA routes return the index view without a token, static files are not
   blocked by security (404 in tests, not 401), /api/** without a token returns 401.
Follow AGENTS.md and backend/AGENTS.md.
```

## Notes

- Spring 6 does not match `""` with `/`: map both.
- New client-side routes with more than two segments need a new pattern in `IndexController`.
