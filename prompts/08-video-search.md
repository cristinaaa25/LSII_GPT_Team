# Video search: ranked search over title, tags and description (US-08)

**Approved on:** pending (PR #<n>)
**Approved by:** <team members / PR link>
**Used for:** full-stack feature implementing a paginated, relevance-ranked video search (backend JPQL query +
REST endpoint, React header search bar and results page, tests on both sides).

## Prompt

```
Implement US-08 from REQUIREMENT.md: search videos.
1. GET /api/videos/search?q=&page=&size= over title, description and tags, case-insensitive, ranked by
   relevance (title > tag > description). Implementation: LIKE queries.
2. Empty query returns all videos; no matches returns an empty page, never an error.
3. Frontend: search bar in the header, /search?q= results page reusing the video card, empty-state message.
4. Tests: ranking, empty query, no results, and the frontend search flow.
```

## Notes

* Tool: Claude Code
* Model: Claude Opus 5.5
* The team chose `LIKE` over PostgreSQL full-text search so the same query runs on H2 (tests) and
  PostgreSQL (dev/prod); see the portable SQL rule in `backend/AGENTS.md`.
* Backend:
  - `VideoRepository.search(pattern, pageable)`: one JPQL query with `LOWER(...) LIKE :pattern ESCAPE '\'` on
    title, description and an `EXISTS` subquery on `video_tags`. Relevance is `ORDER BY` a weighted sum
    (title 4, tag 2, description 1), so a title match always beats tag + description; ties are newest first.
    An explicit `countQuery` keeps the count query free of the `ORDER BY`.
  - `VideoService.searchVideos(q, page, size)`: same page/size validation as the catalog (400 on bad values);
    blank `q` delegates to `getVideos`; `toLikePattern` lower-cases the query and escapes `\`, `%` and `_` so
    user input never acts as a wildcard. The page request is unsorted because the query already orders.
  - `GET /api/videos/search` is public through the existing `GET /api/videos/**` rule in `SecurityConfig`;
    `/search` is a literal mapping so it wins over `/{id}`.
* Frontend:
  - `useVideos(pageSize, query?)` calls `/videos/search` when a query is given; `VideoCatalog` takes `query`
    and `emptyMessage` props, so the results page reuses the card grid, pagination and error handling.
  - `SearchPage` (`/search?q=`) remounts the catalog with `key={query}` so a new search starts at page 0.
  - `Header` search form navigates to `/search?q=<encoded, trimmed text>` and prefills from `?q=`.
* Manual fix: the backslash in `ESCAPE '\'` must be written `'\\'` inside the Java text block, otherwise Java
  turns `\'` into `'` and the query breaks.
* Verified on PostgreSQL with Docker: empty query 117 videos, unknown term 0 (HTTP 200), `%` matched literally.
* Known limitation: the whole query is matched as one phrase (no per-word matching or typo tolerance).
