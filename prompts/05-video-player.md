# Video player: play a video and view its details (US-05)

**Approved on:** pending (PR #<n>)
**Approved by:** <team members / PR link>
**Used for:** full-stack feature implementing video playback, video details, view registration, and not-found handling (backend REST endpoints + React player page + tests).

## Prompt

```
Implement US-05 from REQUIREMENT.md: play a video and show its information.
1. GET /api/videos/{id} returns a VideoDetailDto (title, description, tags, categories, author, upload date,
   views, likes, comment count); 404 if it does not exist.
2. Register a view each time a video is played (needed for analytics).
3. Frontend /videos/:id: HTML5 <video controls> with src <MEDIA_BASE_URL>/<id>.mp4 and the .webp as poster,
   an information panel and a placeholder area for comments. Not-found page for unknown ids.
4. Clicking a catalog card opens this page.
5. Tests: service and controller (200/404) and frontend (info rendered, not-found state).
```

## Notes

* Tool: Antigravity
* Model: Gemini 3.8 Flash
* Backend:
  - `NotFoundException` added and mapped in `ApiExceptionHandler` to `HttpStatus.NOT_FOUND` (404).
  - `VideoDetailDto` created as a record matching the required fields and supporting backwards compatibility.
  - `VideoService.getVideo(id)` returns details; `VideoService.registerView(id)` records `VideoView` (with authenticated user if available) and increments `viewCount`.
  - `VideosController` serves `GET /api/videos/{id}` and `POST /api/videos/{id}/views` (also aliased to `/play` and `/view`).
  - `SecurityConfig` permits `GET /api/videos/**` and `POST /api/videos/*/views` for unauthenticated visitors.
* Frontend:
  - `useVideoDetail` hook fetches video metadata and registers views on playback.
  - `VideoDetailPage` renders HTML5 `<video controls>` with `src` and `poster`, detail metadata, placeholder comments, and not-found UI for invalid/missing video IDs.
  - `VideoCard` wrapped with React Router `Link` (with fallback for non-router test contexts via `useInRouterContext`).
