# Private playlists and Watch later

**Approved on:** pending (PR #<n>)
**Approved by:** team review in PR #<n>
**Used for:** adding private per-user playlists with an auto-created, protected "Watch later" list, Flyway migration, idempotent add/remove endpoints, React dropdown and protected playlist pages, and unit/integration/E2E tests.

## Prompt

```
Add private playlists, including a "Watch later" list.
1. Migration V8 (next after V7__history_index): playlists (id, owner_id, name, created_at, unique owner+name) and
   playlist_videos (playlist_id, video_id, added_at, unique pair), cascades on delete.
2. Endpoints (owner only, others 403/404): GET/POST /api/users/me/playlists, PUT/DELETE /api/playlists/{id},
   GET /api/playlists/{id} (videos, newest added first), PUT/DELETE /api/playlists/{id}/videos/{videoId}
   (idempotent). "Watch later" is created on first use and cannot be renamed or deleted.
3. Frontend: "Save" button on VideoDetailPage with a dropdown of the user's lists (checkboxes), "Watch later"
   first and "New list"; protected /playlists and /playlists/:id pages; link in the header user menu.
Tests: ownership, idempotency, Watch later rules, name validation, and the frontend save flow.
```

## Notes

- Tool/model: Antigravity (Gemini 4 Hydrogen).
- Migration was numbered `V8__playlists.sql` because `V7__history_index.sql` already existed in `backend/src/main/resources/db/migration/`.
- `GET /api/users/me/playlists` accepts an optional `?videoId=` parameter so `SaveToPlaylistDropdown` fetches all playlists with `containsVideo` flags in one request without N+1 queries, creating `"Watch later"` lazily on first use.
- Attempting to rename, delete, or duplicate `"Watch later"` returns `400 Bad Request` (`InvalidRequestException`) after ownership verification (`403`/`404`).
- `e2e/tests/10-playlists.spec.ts` covers anonymous redirect, saving to `"Watch later"` and a new custom list from `VideoDetailPage`, navigating via the header menu, and viewing `/playlists/:id`.
