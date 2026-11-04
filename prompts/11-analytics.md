# Analytics (US-11)

**Approved on:** 2026-11-04
**Approved by:** team review
**Used for:** full-stack feature implementing channel and video analytics for authenticated users (totals, views per day for the last 30 days, per-video sortable performance metrics, frontend `/analytics` page).

## Prompt

```
Implement US-11 from REQUIREMENT.md: analytics for authenticated users.
1. GET /api/users/me/analytics: totals (videos, views, likes, comments), a per-video table and views per day
   for the last 30 days (from registered views).
2. Frontend /analytics (protected): KPI cards, views-over-time chart (<chart library>) and a sortable
   per-video table. Empty state when the user has no videos.
3. Tests: aggregation with and without data, controller 401, frontend data/empty states.
```

## Notes

- Backend endpoint implemented in `UserController` and `AnalyticsService`.
- Returns `UserAnalyticsDto` containing `totals` (`AnalyticsTotalsDto`), `videos` (`List<VideoAnalyticsDto>`), and `viewsPerDay` (`List<DailyViewsDto>`).
- 30-day views are queried from `video_views` using `findByUploaderIdAndViewedAtAfter` in UTC, aggregated into 30 daily buckets with total, authenticated, and anonymous views.
- Totals aggregate published video counts, view counts, like counts, and comments on user videos.
- If user has no uploaded videos, totals return zeros and videos return empty list without throwing errors.
- Frontend includes `/analytics` (protected via `ProtectedRoute`, linked in user header dropdown).
- KPI cards display Total Videos, Total Views, Total Likes, and Total Comments.
- Views Over Time line chart implemented with `recharts` for the last 30 days.
- Sortable per-video table allows sorting by title, upload date, duration, views, likes, and comments.
- Empty state with friendly call to action to upload videos when user has no content.
- Model: Gemini 3.8 Flash.
