# Video metadata editor: owners edit title, description, tags and categories (US-07)

**Approved on:** pending (PR #<n>)
**Approved by:** <team members / PR link>
**Used for:** full-stack feature where the owner of a resource edits it (PUT endpoint with ownership rules
401/403/404 and Bean Validation, owner-only "Edit" button and form in React, tests on both sides).

## Prompt

```
Implement US-07 from REQUIREMENT.md: owners edit their videos' metadata.
1. PUT /api/videos/{id} updates title, description, tags and category. Owner only: others 403,
   anonymous 401, unknown id 404. Validate the input.
2. Frontend: "Edit" button on the video page, visible only to the owner, opening an edit form (tags as an
   editable list); changes shown immediately after saving.
3. Tests: ownership rules (owner/other/anonymous), validation and the frontend form.
```

## Notes

* Tool: Claude Code (Claude Opus 5.5).
* The `Video` entity stores a list of categories, so the API takes `categories: string[]` (not a single
  `category`) and the form edits categories with the same editable list as tags. PUT replaces all four fields.
* Ownership is checked in `VideoService` (`ForbiddenException` → 403 in `ApiExceptionHandler`); the video is
  looked up first, so an unknown id gives 404 even for a non-owner. Anonymous requests never reach the controller:
  `/api/**` is authenticated in `SecurityConfig` (401).
* Validation lives in `VideoUpdateRequestDto` (Bean Validation, limits mirrored in `VideoEditForm`); tags and
  categories are trimmed and de-duplicated case-insensitively in the service.
* Manual fix after generation: the form inherited the page's centred text, so it got `text-start`.
* Verified on the jar in Docker (`localhost:8080`) with PostgreSQL: 200/403/401/404/400 with curl, and the
  edit flow in the browser.
