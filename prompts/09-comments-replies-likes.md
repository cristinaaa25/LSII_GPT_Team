# Comments, replies and likes (US-09, US-10)

**Approved on:** pending (PR #<n>)
**Approved by:** <team members / PR link>
**Used for:** full-stack feature implementing video comments, nested replies, comment likes with idempotency, and frontend integration on the video detail page.

## Prompt

```
Implement US-09 and US-10 from REQUIREMENT.md.
1. Endpoints:
   - GET /api/videos/{id}/comments (paginated top-level comments with replies, like count, likedByMe)
   - POST /api/videos/{id}/comments (authenticated, non-empty, max length)
   - POST /api/comments/{id}/replies (one nesting level)
   - PUT / DELETE /api/comments/{id}/like (idempotent)
2. Comments imported from the grabber are shown too.
3. Frontend: comment section on the video page with form, nested replies and like toggle with count.
   Anonymous users see "log in to comment" instead of the form.
4. Tests: validation, 401, like idempotency, and the frontend components.
```

## Notes

- Top-level comments are paginated (with replies nested inside each top-level comment).
- `likedByMe` is determined by the authenticated user's ID or `false` for unauthenticated visitors.
- Nesting level: replies can only be added to top-level comments (or if target is a reply, attached to its parent or rejected with 400).
- Idempotent PUT and DELETE for `/api/comments/{id}/like`.
- Frontend: comments list under video player with pagination/load more or page navigation, new comment form, reply toggle/form, and like button.
- Model: Gemini 3.8 Flash.
