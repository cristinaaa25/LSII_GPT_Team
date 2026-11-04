# User profile (US-03)

**Approved on:** 2026-11-02 (PR #17)
**Approved by:** team review in PR #17
**Used for:** full-stack feature implementing user profiles (public profile at `/api/users/{username}`, own profile at `GET`/`PUT` `/api/users/me`, avatar upload at `POST` `/api/users/me/avatar`, frontend `/profile` and `/users/:username` pages, and author profile links).

## Prompt

```
Implement US-03 from REQUIREMENT.md: user profiles.
1. GET /api/users/{username}: public profile (display name, avatar, description, their videos).
2. GET / PUT /api/users/me: own profile; edit display name and description with validation.
3. POST /api/users/me/avatar: png/jpg/webp up to 2MB, stored in pro_tube.store.dir/avatars, served via /media/**.
4. Frontend: /profile (editable, protected) and /users/:username (public, no edit controls). Author names
   on cards and the video page link to the public profile.
5. Tests: validation, avatar type/size, public vs own, and frontend edit vs read-only.
```

## Notes

- Backend endpoints implemented in `UserController` and `UserService`.
- Flyway migration `V3__user_display_name.sql` adds `display_name` column to `users` table.
- Avatar upload restricts content types to PNG, JPEG, and WebP with a 2MB maximum file size.
- Uploaded avatars are stored in `<storeDir>/avatars/<uuid>.<ext>` and served under `/media/**`.
- Public profile excludes sensitive fields (such as email) and includes the list of uploaded videos.
- Frontend includes `/profile` (protected, editable with avatar upload) and `/users/:username` (public, read-only).
- Author names in `VideoCard` and `VideoDetailPage` link to the public profile `/users/:username`.
- Model: Gemini 3.8 Flash.
