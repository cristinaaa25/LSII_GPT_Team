# Test coverage (NFR-05)

**Approved on:** pending (PR #22)
**Approved by:** team review in PR #22
**Used for:** improving test coverage across frontend or backend modules to satisfy NFR-05 and Definition of Done thresholds without trivial getters or lowered bars.

## Prompt

```
Improve test coverage of <backend | frontend | module> (NFR-05; thresholds in AGENTS.md).
1. Run the coverage report and list the classes/components below the threshold.
2. Write meaningful tests for uncovered behaviour and error branches, not trivial getters.
3. Never lower thresholds or add exclusions. Delete unused template code (TestLink*, VideoGrid, app.test.tsx).
4. Show coverage before and after.
```

## Notes

- Tool/model: Antigravity, Gemini 3.8 Flash. Used in `task/15-test-converage`.
- Frontend template code (`TestLink*`, `examples.ts`, `app.test.tsx`) removed in favour of focused component and hook tests.
- Added comprehensive unit tests for `AuthProvider`, `useAuth`, `useVideos`, and `useVideoDetail`.
- Uncovered error branches in auth (`LoginPage`, `RegisterPage`), profile management (`ProfilePage`), video upload (`UploadPage`), and comment replies (`CommentSection`) covered with behavioral test cases.
- Backend controller error branches and `ApiExceptionHandler` tested directly and via WebMvcTest.
- Overall frontend statements reached 98.79% (lines 99.67%), and backend classes exceed minimum thresholds (all controllers at 100%).
