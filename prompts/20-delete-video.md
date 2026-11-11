# Delete video: owners delete their videos and dependent resources (complements US-07)

**Approved on:** pending (PR #<n>)
**Approved by:** team review in PR #<n>
**Used for:** full-stack feature allowing owners to delete videos (DELETE endpoint with ownership rules 401/403/404, cascading deletion of comments, likes, views, tags, categories, transaction-synchronized removal of disk files, owner-only "Delete" button with Bootstrap confirmation modal in React, and comprehensive tests).

## Prompt

```
Let owners delete their videos (complements US-07).
1. DELETE /api/videos/{id}: owner → 204; other user → 403; anonymous → 401; unknown → 404 (same order of checks
   as PUT /api/videos/{id}).
2. Remove the row and everything that depends on it (comments with replies and likes, views, tags, categories,
   video likes if they exist). Delete the video and thumbnail files from pro_tube.store.dir only after the
   transaction commits; a missing file is logged, not an error.
3. Frontend: "Delete" button next to "Edit" (owner only) with a Bootstrap confirmation modal (no window.confirm);
   on success go to the owner's profile; show errors.
Tests: ownership rules, cascade (no orphan rows), files removed after commit and kept if the transaction fails,
and the frontend modal (cancel / confirm / error).
```

## Notes

- Tool/model: Google Antigravity, Gemini 3.8 Flash. Used in `task/20-delete-video`.
- Ownership check performed in `VideoService` with 401 (anonymous) → 404 (not found) → 403 (forbidden for non-owner) → 204 (success), mirroring `PUT /api/videos/{id}`.
- Foreign keys in PostgreSQL and H2 define `ON DELETE CASCADE` across `video_tags`, `video_categories`, `video_views`, `video_likes`, `comments`, and `comment_likes`, ensuring no orphaned rows remain upon video deletion.
- Disk files (`videoUrl`, `thumbnailUrl`) are removed via `TransactionSynchronizationManager` in the `afterCommit` phase, ensuring files are kept if the transaction rolls back or fails. Missing files log a warning without throwing an exception.
- Frontend includes an accessible Bootstrap 5 confirmation modal without browser dialogs (`window.confirm`), with cancel, close, confirm, loading state, and error handling. Upon successful deletion, it navigates to `/users/:username` (the owner's profile).
- Added comprehensive unit and integration tests: `VideoServiceTest`, `VideosControllerTest`, `VideoDeleteIntegrationTest`, `VideoDetailPage.test.tsx`, and `videoService.test.ts`. All JaCoCo (bundle 75% / class 50%) and Jest (75%) coverage thresholds satisfied.
