# Frontend rules (React + TypeScript)

Applies to everything under `frontend/`. The root `AGENTS.md` also applies.

## Structure

- `src/components/` — React function components, one per file, `PascalCase.tsx`.
- `src/components/__tests__/` — tests, `<Component>.test.tsx`.
- `src/hooks/` — data hooks `useXxx.ts` (move new ones here; `src/useAllVideos.ts` is legacy).
- `src/utils/Env.ts` — the only place that reads `import.meta.env`. Use `getEnv().API_BASE_URL` / `MEDIA_BASE_URL`.
- `TestLink*`, `VideoGrid` and `examples.ts` are template samples: do not build features on them.

## Code

- Function components + hooks only. Typed props with an `interface Props`.
- HTTP with `axios` inside hooks/services, never directly in JSX components.
- Handle the `loading` / `error` / empty states for every request.
- Styling: Bootstrap 5 classes first; custom CSS only when needed.
- No `any` (ESLint warns). Prettier formats the code: run `npm run lint-fix` / `npm run format`.

## Look and feel (theme)

- Colours, fonts, radii, shadows and motion live only in `src/styles/theme.css` (`--pt-*` tokens mapped onto
  Bootstrap 5.3 variables, light and dark via `data-bs-theme`). Never hardcode hex colours in components; use
  Bootstrap classes (`text-body-secondary`, `bg-body-tertiary`, `btn-primary`...) or `var(--pt-*)`.
- Logo and favicon: `public/logo.svg`, `public/logo-dark.svg`, `public/favicon.svg` (replace the files to rebrand).
- The coral accent (`--pt-accent`) is for icons and fills only, never for small text (contrast).
- Theme: `useTheme()` (`ThemeProvider`); success messages: `useToast().showToast(...)` (`ToastProvider`), not inline
  alerts. Tests that render a component using them wrap it in the provider.
- Loading: `<Skeleton label="Loading xxx" variant=... />`; empty lists: `<EmptyState message=... illustration=... />`;
  user pictures: `<Avatar />` (falls back to the initial).
- Buttons and inputs: one system in `theme.css`. Every `.btn` is a 40px pill (`btn-sm` 32px, `btn-lg` 48px for
  big CTAs). Variants: `btn-primary` (main action), `btn-soft` (secondary; `btn-secondary`/`btn-outline-secondary`
  map to it), `btn-outline-primary`, `btn-tint` (selected/on state), `btn-ghost` (row actions, Cancel),
  `btn-soft-danger` (in-page delete; `btn-outline-danger` maps to it), `btn-ghost-danger`, and filled `btn-danger`
  only for the final confirm inside a modal. Icons: `<Icon name=... />` (decorative), next to the visible text.
  Input + action on one line: wrap them in `.pt-input-pill` (`.pt-input-pill-sm` for 32px).
- Video: use `<VideoPlayer />` (themed controls on the real `<video>`; the player stays dark in both themes).
  "On" states (liked, saved) use `btn-tint` plus a filled icon (`<Icon name=... filled />`).
- Accessibility: every control has a label, decorative images have `alt=""`, keep the roles/labels the E2E tests
  use. Animations must stay disabled under `prefers-reduced-motion` (handled in `theme.css`).

## Tests

- Jest + React Testing Library. Query by role/label/text (`getByRole`) before `getByTestId`.
- Never call the real backend: mock axios (`jest.mock('axios')`) or `fetchMock`. `Env` is already mocked in
  `jest.setup.ts`.
- One `describe` per component; test behaviour (what the user sees), not implementation details.
- Use `await screen.findBy...` for async UI; avoid snapshots for anything that changes often.
- Coverage threshold is 75% global (`jest.config.ts`): new components ship with tests.
