# Technical debt cleanup (queries, pagination, validation, image checks)

**Approved on:** pending (PR #<n>)
**Approved by:** team review in PR #<n>
**Used for:** paying technical debt left by earlier stories without changing API contracts: N+1 queries,
in-memory aggregation, unpaginated lists, duplicated validation, unused code and weak upload checks.

## Prompt

```
Pay the technical debt left after <user stories>. Read AGENTS.md and backend/AGENTS.md first.
Keep the current API contracts: same URLs, same JSON fields, same status codes.
1. N+1 queries: <endpoint> runs <k> queries per <item>. Load the related data (children, counts, flags
   for the current user) in a fixed number of queries per page (batch IN queries or JOIN FETCH).
2. Aggregations: in <service>, replace per-item counts with one grouped query, and compute <per-day
   series> with a GROUP BY query instead of loading every row. Keep <time zone> days and the <n>-day window.
3. Pagination: paginate <list> of <endpoint> (page/size, as in /api/videos) and add "load more" to <page>.
   If adding page/size would change an existing JSON field, expose a new paged endpoint instead.
4. Cleanup of <controller>/<service>: one validation place (bean validation, not repeated in the service),
   accept only the expected multipart part name, remove unused code.
5. Uploaded images: check the magic bytes (PNG, JPEG, WebP) in addition to content type and extension;
   reject anything else with 400.
Before coding, list for each point the files you will change and wait for my confirmation.
Tests: assert the number of queries for 1 and 2 (Hibernate statistics), pagination, the multipart part
name, and a fake image (text file named .png with image/png) rejected with 400.
Keep `mvn clean verify`, `npm run test` and `npm run lint` green; do not lower coverage thresholds.
```

## Notes

- Tool/model: Claude Code, Claude Opus 5.5. Used in `task/sprint-3-tech-debt` for the debt of US-03, US-09 and
  US-11 (comments N+1, analytics aggregation, public profile videos, `UserController`/`UserService`, image checks).
- Decision on point 3: `GET /api/users/{username}` keeps `videos` as an array (now the 12 newest) and a new
  public `GET /api/users/{username}/videos?page=&size=` returns the same `PageDto` as `/api/videos`
  (default size 12, newest first, unknown user 404). `SecurityConfig` permits it without login.
- Views per day are grouped by `FLOOR(EXTRACT(EPOCH FROM viewedAt) / 86400)` (days since the Unix epoch), not
  `CAST(... AS DATE)`: the cast follows the database session time zone, the epoch is always UTC. Checked on H2
  (JVM in Europe/Madrid) and on PostgreSQL in Docker (a view at 23:30 UTC stays on its UTC day).
- Query counts are asserted with Hibernate statistics enabled only in `CommentServiceQueryCountTest` and
  `AnalyticsServiceQueryCountTest` (no new dependency). Use a page size above the number of rows so Spring Data
  skips the count query and the number is exact.
- Manual fixes: Python edits on CRLF files silently did not apply once (check every replacement); upload tests
  needed real image headers (`TestImages` helper) once magic bytes were checked.
