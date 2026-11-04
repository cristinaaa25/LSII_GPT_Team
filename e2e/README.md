# ProTube E2E Tests (NFR-02)

End-to-End automated testing suite for ProTube using [Playwright](https://playwright.dev/).

## Golden Paths Covered

- **Authentication (US-01, US-02)**: User registration, login with username & email, logout, validation errors on duplicate username and invalid credentials.
- **Video Catalog & Playback (US-04, US-05)**: Catalog browsing, seed video verification, video player with HTML5 controls, not-found handling.
- **Video Upload (US-06)**: Protected route enforcement, video file and thumbnail upload, metadata population, redirection to detail page.
- **Video Search (US-08)**: Header search box, keyword search results, empty state handling for non-matching queries.
- **Comments, Replies & Likes (US-09, US-10)**: Log-in prompt for anonymous users, comment posting, nested replies, comment liking.
- **Video Metadata Editor (US-07)**: Owner permissions check, title and description editing, instant UI update, access restriction for non-owners.
- **User Profile (US-03)**: Edit display name, bio, upload avatar image, verify updates on public profile.

## Setup

From the `e2e/` folder:

```bash
npm install
npx playwright install --with-deps chromium
```

## Running Tests

### Against Docker Compose Stack (Standard)

1. Ensure the stack is up with seed data in `./videos`:
   ```bash
   cp .env.example .env
   mkdir -p videos
   cp e2e/fixtures/seed_store/* videos/
   docker compose up -d --build
   ```

2. Run the tests:
   ```bash
   npm test
   ```

3. (Optional) Run with UI or Headed mode:
   ```bash
   npm run test:ui
   npm run test:headed
   ```

4. Stop the stack:
   ```bash
   docker compose down -v
   ```
