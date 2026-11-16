# Catalog filter and sort (US-04)

**Approved on:** pending (PR #24)
**Approved by:** team review in PR #24
**Used for:** adding category filtering and multi-criteria sorting to the video catalog (backend API + React UI)

## Prompt

```
Add filters and sorting to the home catalog (US-04).
1. GET /api/videos?page=&size=&category=&sort= with sort = newest (default) | oldest | views | likes; unknown
   sort → 400; category is case-insensitive. Stable order (id as tie-breaker) so infinite scroll does not repeat.
2. GET /api/videos/categories: distinct categories with video count, most used first.
3. Frontend: category chips and a sort select above the catalog, kept in the URL (?category=&sort=) so the
   page can be shared and reloaded; changing them restarts infinite scroll.
Tests: each sort, category filter, invalid sort, categories endpoint, and the URL-driven frontend state.
```

## Notes

* Tool / model: Antigravity (Claude Opus 5.5 / Gemini 2.5 Pro).
* Category filtering in JPA uses `EXISTS (SELECT 1 FROM Video v2 JOIN v2.categories c WHERE v2 = v AND LOWER(c) = LOWER(:category))` to avoid duplicate rows and pagination issues across both PostgreSQL and H2.
* Sort criteria tie-breaker:
  - `newest`: `createdAt DESC, id DESC`
  - `oldest`: `createdAt ASC, id ASC`
  - `views`: `viewCount DESC, id DESC`
  - `likes`: `likeCount DESC, id DESC`
* Category count aggregation in JPA: `SELECT c, COUNT(DISTINCT v.id) FROM Video v JOIN v.categories c GROUP BY c ORDER BY COUNT(DISTINCT v.id) DESC, c ASC`.
* Category chips and sort select are displayed above the video catalog; changing either resets page index to 0 and reloads videos, restarting infinite scroll.
