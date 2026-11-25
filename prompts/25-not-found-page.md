# 404 Not Found page (US-05, App routing)

**Approved on:** pending (PR #25)
**Approved by:** team review in PR #25
**Used for:** adding a generic 404 Not Found page to the SPA catch-all route and reusing it across entity not-found states

## Prompt

```
Add a not-found page to the SPA.
1. NotFoundPage component: message, link back to home; the header (with search) stays visible.
2. Catch-all route "*" in App.tsx. Reuse NotFoundPage where a video or user is not found (VideoDetailPage,
   PublicProfilePage) instead of their own not-found markup.
3. Tests: unknown route renders it, the link goes home, and the reused cases still show it.
```

## Notes

* Tool / model: Antigravity (Gemini 2.5 Pro).
* NotFoundPage accepts optional `title`, `message`, and `linkText` props with sensible defaults ("Page Not Found", "The page you are looking for does not exist or may have been moved.", and "Back to home") so it can be reused across generic 404 routes and specific entity not-found pages.
* Rendered inside `<main>` under `<Header />` in `App.tsx` via `<Route path="*" element={<NotFoundPage />} />`, ensuring the header with search bar stays visible.
* Reused in `VideoDetailPage` and `PublicProfilePage` replacing their custom not-found alerts.
