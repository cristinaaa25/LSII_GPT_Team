# Watch history

**Approved on:** pending (PR #<n>)
**Approved by:** team review in PR #<n>
**Used for:** adding per-user watch history with grouped portable SQL (`GROUP BY` + `MAX`), non-destructive clearing (`viewer = null`), a protected React page with pagination and confirmation modal, and unit/integration/query-count/E2E tests.

## Prompt

```
Show users the videos they have watched.
1. GET /api/users/me/history?page=&size=: distinct videos viewed by the current user (from video_views), most
   recent view first, with lastViewedAt (ISO string). Portable SQL (GROUP BY + MAX), no N+1.
2. DELETE /api/users/me/history: clears it by setting viewer to null on the user's views, so view counts and
   analytics do not change.
3. Frontend: protected /history page (reuse VideoCard + "load more", "watched X ago"), "Clear history" with
   confirmation, empty state, link in the header user menu.
Tests: ordering, distinct videos, clearing keeps view counts, 401, and the frontend states.
```

## Notes

- Tool/model: Antigravity (Gemini 4 Hydrogen).
- Migration `V7__history_index.sql` adds a composite index on `video_views (user_id, viewed_at)` using portable SQL (H2 + PostgreSQL).
- `VideoViewRepository.findHistoryByViewerId` projects directly into `HistoryVideoDto` (`GROUP BY` all selected non-aggregated columns + `MAX(vv.viewedAt)`), so `HistoryService.getHistory` executes a fixed 2 SQL statements (3 when Spring Data runs the count query) with no N+1.
- `useVideoDetail.registerView` was updated to attach the `Authorization: Bearer <token>` header when logged in so playback from the React SPA records authenticated views into `video_views`.
- `e2e/tests/09-history.spec.ts` covers the end-to-end history flow (anonymous redirect, recording playback, order/relative time, and clearing with confirmation).
