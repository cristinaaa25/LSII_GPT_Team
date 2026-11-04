---
name: create-react-component
description: Create a React + TypeScript component (and its data hook if it calls the API) with Jest + Testing Library tests. Use when adding UI to the frontend.
---

# Create a React component

1. Read the user story in `REQUIREMENT.md` and the rules in `frontend/AGENTS.md`.
2. Check `prompts/` for an approved prompt for this task and follow it.
3. If the component needs backend data, create a hook `src/hooks/useXxx.ts`:
   * URL built with `getEnv().API_BASE_URL`.
   * Returns `{ data, loading, error }` with typed data.
4. Create `src/components/<Name>.tsx`: function component, `interface Props`, Bootstrap classes, explicit
   loading / error / empty states.
5. Create `src/components/__tests__/<Name>.test.tsx`:
   * Mock axios (`jest.mock('axios')`) or `fetchMock`; never hit the real API.
   * Query by role/text; cover success, loading, error and empty states and user interactions.
6. From `frontend/`, run `npm run lint-fix`, then `npm run test` and `npm run build` until green
   (75% coverage threshold).
7. If AI generated the code, run the `save-ai-prompt` skill.
