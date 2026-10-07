# Frontend rules (React + TypeScript)

Applies to everything under `frontend/`. The root `AGENTS.md` also applies.

## Structure

* `src/components/` — React function components, one per file, `PascalCase.tsx`.
* `src/components/__tests__/` — tests, `<Component>.test.tsx`.
* `src/hooks/` — data hooks `useXxx.ts` (move new ones here; `src/useAllVideos.ts` is legacy).
* `src/utils/Env.ts` — the only place that reads `import.meta.env`. Use `getEnv().API_BASE_URL` / `MEDIA_BASE_URL`.
* `TestLink*`, `VideoGrid` and `examples.ts` are template samples: do not build features on them.

## Code

* Function components + hooks only. Typed props with an `interface Props`.
* HTTP with `axios` inside hooks/services, never directly in JSX components.
* Handle the `loading` / `error` / empty states for every request.
* Styling: Bootstrap 5 classes first; custom CSS only when needed.
* No `any` (ESLint warns). Prettier formats the code: run `npm run lint-fix` / `npm run format`.

## Tests

* Jest + React Testing Library. Query by role/label/text (`getByRole`) before `getByTestId`.
* Never call the real backend: mock axios (`jest.mock('axios')`) or `fetchMock`. `Env` is already mocked in
  `jest.setup.ts`.
* One `describe` per component; test behaviour (what the user sees), not implementation details.
* Use `await screen.findBy...` for async UI; avoid snapshots for anything that changes often.
* Coverage threshold is 75% global (`jest.config.ts`): new components ship with tests.
