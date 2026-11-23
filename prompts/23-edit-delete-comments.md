# Edit and delete comments and replies (complements US-09, US-10)

**Approved on:** pending (PR #<n>)
**Approved by:** team review in PR #<n>
**Used for:** full-stack feature allowing authors to edit and delete their own comments and replies (PUT/DELETE endpoints with ownership and validation rules 401/403/404, cascading deletion of replies and likes in database, frontend inline edit with Save/Cancel, accessible Bootstrap confirmation modal before delete, and live counter updates).

## Prompt

```
Let authors edit and delete their own comments and replies (complements US-09/US-10).
1. PUT /api/comments/{id} (same text validation as creation) and DELETE /api/comments/{id}: author only → 200/204;
   other → 403; anonymous → 401; unknown → 404.
2. Deleting a top-level comment deletes its replies and all their likes; deleting a reply deletes only it.
3. Frontend (CommentSection): "Edit" and "Delete" for own comments, inline edit form with Save/Cancel,
   confirmation before deleting; update the list and the "Comments (N)" counter without reloading.
Tests: ownership, validation, cascade, counter, and the frontend edit/delete flows.
```

## Notes

- Tool/model: Google Antigravity, Gemini 3.8 Flash.
- Backend:
  - `CommentService.updateComment`: validates input (not blank, <=2000 chars), requires authenticated author (401 unauthenticated, 404 not found, 403 forbidden for non-author), updates text, and returns full `CommentDto` including replies and like status.
  - `CommentService.deleteComment`: checks ownership (401 -> 404 -> 403), deletes via `commentRepository.delete(comment)`.
  - Database schema: `fk_comments_parent` and `fk_comment_likes_comment` define `ON DELETE CASCADE`. Verified via `@DataJpaTest` in `CommentRepositoryTest` that deleting a top-level comment cascades to replies and likes, and deleting a reply cascades only to its own likes while preserving the parent comment and other replies.
- Frontend:
  - `useComments`: added `editComment` and `deleteComment` functions. Accurately updates local comment lists and maintains root `totalElements` and `addedCount` session counters.
  - `CommentSection`: displays "Edit" and "Delete" buttons only for comments/replies where current user is the author. Inline edit form with textarea (max 2000 chars), Cancel, and Save (disabled on empty input). Bootstrap modal confirmation for delete with Cancel and Delete buttons. The "Comments (N)" header updates in place without reloading.
- Tests:
  - Backend: `CommentServiceTest` (19 tests covering validation, ownership, not found, unauthenticated), `CommentControllerTest` (21 tests covering HTTP status codes and responses), `CommentRepositoryTest` (cascade verification). All JaCoCo thresholds met.
  - Frontend: `useComments.test.ts` (edit/delete operations, state mutations, counter updates), `CommentSection.test.tsx` (author button visibility, inline edit flow, cancel/save, validation, delete confirmation modal, error handling, live counter decrement). All Jest suites pass and ESLint clean.
