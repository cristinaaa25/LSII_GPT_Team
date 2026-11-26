# Visual refresh, dark mode, responsive layout and accessibility

**Approved on:** pending (PR for ticket #30)
**Approved by:** pending team review
**Used for:** giving the frontend its own identity (logo + theme tokens on top of Bootstrap 5.3), a persisted
dark mode, a responsive header, skeleton loaders, empty states, toasts and WCAG AA accessibility checks.

## Prompt

```
Give ProTube its own look, a dark mode, a responsive layout and better accessibility. Merge after 27 and 28.
1. Identity, easy to replace later: logo in frontend/public/logo.svg (+ favicon), and all colours, fonts, radii and
   shadows as CSS variables in one theme file mapped onto Bootstrap 5.3 variables. Palette (light / dark):
   primary #5B4BDB / #8B7FF0, accent #FF7A59 / #FF8F73 (icons and fills only, never small text), background
   #F7F7FB / #121220, surface #FFFFFF / #1C1B2E, text #1C1B29 / #ECEBF5, muted #6B6A80 / #A3A2B8.
   Logo: rounded indigo screen with a coral play triangle, plus the wordmark "ProTube".
2. Dark mode: toggle in the header using data-bs-theme; first visit follows prefers-color-scheme; the choice is
   saved in localStorage (try/catch).
3. Responsive: catalog 1-4 columns, collapsible header (hamburger) on mobile, full-width player, no horizontal scroll.
4. Motion: skeleton loaders instead of "Loading...", card hover lift, short page transitions; all disabled with
   prefers-reduced-motion.
5. Details: default avatar with the user's initial, illustrated empty states, toasts instead of inline success alerts.
6. Accessibility: visible focus, labels on every control, alt text, WCAG AA contrast in both themes; Lighthouse
   accessibility >= 90 on home, video and login. Keep the roles/labels the E2E tests use.
Before coding, show me the logo SVG and list the files you will change; wait for my confirmation.
Tests: theme toggle and persistence, header collapse, skeleton/empty states; npm run test, lint and E2E green.
```

## Notes

- Tool/model: Claude Code (Claude Opus 5.5).
- Logo as two SVG files (`logo.svg`, `logo-dark.svg`) because an `<img>` cannot follow the in-app theme; the header
  picks one from `useTheme()`. Wordmark kept as text (system font stack, Inter first).
- `index.html` sets `data-bs-theme` with a small inline script before React loads (no flash of the wrong theme);
  it uses the same `protube-theme` key and rules as `src/utils/theme.ts`.
- In dark mode `btn-primary` uses dark text on `#8B7FF0` (white on it is only 3.3:1). Bootstrap's red/green text
  colours are overridden per theme for AA contrast.
- Video card thumbnails are decorative (`alt=""`, the duplicate thumbnail link is `aria-hidden` and out of the tab
  order); the title link names the video.
- "Changes saved.", "Profile updated successfully" and "Avatar updated successfully" are toasts with
  `role="status"`, so the existing E2E assertions still match.
- Lighthouse 12 accessibility (Docker build): 100 on home, video and login, light and dark, desktop and mobile.
- New E2E spec `e2e/tests/11-theme-responsive.spec.ts`.
- Follow-up from review (same ticket): standardised header. Tokens `--pt-control-h` (40px), `--pt-radius-pill`;
  every header control is 40px high (round icon buttons, pill text buttons with the shared `.pt-header-btn`, no
  `btn-sm`); YouTube-style search pill with an icon button (`aria-label="Search"`); radius tokens raised and `.btn`
  pill-shaped app-wide (except inside `.input-group`). Checked at 375/768/1400px, logged out/in, light/dark.
- Second follow-up (same ticket): one button/input system for the whole app in `theme.css` (40/32/48px pills,
  variants primary / soft / outline-primary / tint / ghost / soft-danger / ghost-danger / danger, `.pt-input-pill`
  joined forms, pill single-line inputs) and `Icon.tsx`. Applied to empty states, History, Playlists, Analytics,
  the video page action row (channel + Subscribe, Like, Save, Edit, Delete), comments, modals, profile, upload,
  login/register, catalog chips. Button contrast measured on logged-in pages: >= 4.9:1 in both themes.
- Third follow-up (same ticket): file inputs as 40px pills with a centred "Choose file" segment (Profile = Upload);
  liked / saved states with filled icons (`Icon filled`) and a stronger tint + border; the Save button loads the
  saved state on mount (`getMyPlaylists(videoId)`, no request when logged out) and reads "Saved"; themed
  `VideoPlayer.tsx` (custom controls, keyboard shortcuts, native controls kept until the component mounts as a
  fallback); helpers in `utils/player.ts`.
- Fix (same ticket): `ScrollToTop` in `App.tsx` starts every new page at the top (PUSH/REPLACE to another path,
  or a new `q` on /search); back/forward and filter-only query changes keep the position.
