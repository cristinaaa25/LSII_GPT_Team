# Video Likes (Phase 1)

**Approved on:** pending (PR #19)
**Approved by:** team review in PR #19
**Used for:** adding video like/unlike functionality for authenticated users, keeping like counts synchronized, supporting idempotent operations, concurrency safety, and optimistic UI updates.

## Prompt

```
### 19 · Likes a vídeos · fase 1 · A

Let authenticated users like videos (like US-10 does for comments).
1. Migration V5: video_likes (user_id, video_id, created_at), unique (user_id, video_id), FKs with ON DELETE CASCADE.
2. PUT /api/videos/{id}/like and DELETE /api/videos/{id}/like: authenticated, idempotent (liking twice or
   unliking a video you did not like is not an error), 404 for unknown video. Keep videos.like_count in sync
   (+1/-1, never below 0) so imported counts and new likes add up; a concurrent duplicate must not give 500.
3. VideoDetailDto: add likedByMe (false for anonymous). Do not rename or remove existing fields.
4. Frontend: like button with count on VideoDetailPage (aria-pressed); anonymous users get a link to /login.
   Update the count optimistically and roll back on error, showing the error.
Tests: idempotency both ways, 401, 404, like_count never negative, likedByMe, and the button states.
```

## Notes

* Foreign key cascades on `user_id` and `video_id` are defined in `V5__video_likes.sql`.
* Composite primary key `VideoLikeId` with `@IdClass` in JPA entity `VideoLike`.
* Concurrency handling: catching `DataIntegrityViolationException` on concurrent duplicate likes in `VideosController` and falling back to returning the current like status (200 OK) ensures duplicate likes never return 500.
* `videos.like_count` sync increments / decrements the pre-existing count (`Math.max(0, current - 1)`) so imported store videos and user likes combine without desync.
* Frontend `VideoDetailPage` performs optimistic update with count and `aria-pressed`, restoring previous state on rejection with an alert message.
