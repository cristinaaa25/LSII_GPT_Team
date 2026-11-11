# Search ranking: prefix matches first (US-08)

**Approved on:** pending (PR #<n>)
**Approved by:** team review in PR #<n>
**Used for:** changing the relevance order of a portable `LIKE` search without full-text search.

## Prompt

```
Improve the ranking of GET /api/videos/search (US-08).
1. Today: title 4 / tag 2 / description 1, ties newest first. Add higher weights for: title starts with the
   query, then a word in the title starts with the query, then a tag starts with the query. Matches at the start
   always rank above matches in the middle of a word.
2. Keep portable LIKE (no ILIKE, no full-text), the wildcard escaping in toLikePattern, pagination and the
   empty-query behaviour.
3. Explain the final weights in a short code comment and in the PR.
Tests: "cat" ranks "Cat videos" above "Funny cat" above "Education" (contains "cat"), tag prefix, escaping, ties.
```

## Notes

* Final weights: title prefix 64, title word prefix 32, tag prefix 16, then the old title 4 / tag 2 /
  description 1. Each prefix weight is bigger than all smaller weights together, so the tiers never mix.
* The service passes three escaped patterns (`%q%`, `q%`, `% q%`); the WHERE clause only needs `%q%` because
  every prefix match is also a contains match.
* "Word" means after a space; other separators (`-`, `(`) are treated as the middle of a word.
* Builds on `prompts/08-video-search.md`.
