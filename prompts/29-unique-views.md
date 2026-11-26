# Unique video views deduplication

**Approved on:** pending (PR #<n>)
**Approved by:** team review in PR #<n>
**Used for:** preventing page reloads from inflating video view counts for authenticated users (server-side window with configurable duration and fixed Clock in tests) and anonymous viewers (client-side sessionStorage deduplication per tab).

## Prompt

```
Stop page reloads from inflating view counts (POST /api/videos/{id}/views, US-05).
1. Authenticated viewer: do not register a new view (nor increase view_count) if the same user viewed the same
   video in the last N minutes; N = property pro_tube.views.dedup-minutes, default 30.
2. Anonymous viewer: the frontend remembers in sessionStorage (wrapped in try/catch) the videos already counted
   in this tab and does not post again.
3. The endpoint keeps its status code in both cases. Use a fixed Clock in tests.
Tests: second view inside/outside the window, different users, anonymous still counted, frontend dedupe.
```

## Notes

- Tool/model: Antigravity (Gemini 3.8 Flash).
- Backend deduplication checks `videoViewRepository.existsByVideoIdAndViewerIdAndViewedAtGreaterThanEqual(id, viewerId, cutoff)` using a configurable `Clock` bean (`ClockConfig`).
- The property `pro_tube.views.dedup-minutes` defaults to 30.
- `POST /api/videos/{id}/views` keeps returning `200 OK` in all cases without altering HTTP status codes.
- Frontend hook `useVideoDetail` caches viewed video IDs in `sessionStorage` (wrapped in try/catch) for anonymous users so reloads/remounts within the same tab do not post to `/views`. Authenticated users continue to post with their JWT token to let the backend enforce the time-window deduplication.
- Existing `HistoryIntegrationTest` was updated so its setup reflects separate views outside the dedup window.
