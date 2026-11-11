# Google login on top of the JWT authentication

**Approved on:** pending (PR #<n>)
**Approved by:** team review in PR #<n>
**Used for:** adding a third-party OAuth2/OIDC login (Google) to an existing stateless JWT authentication without
calling the provider in tests or committing its credentials.

## Prompt

```
Add "Sign in with Google" to the existing JWT authentication (US-01/US-02). Read AGENTS.md and backend/AGENTS.md.
application.properties already has the spring.security.oauth2.client.registration.google.* properties reading
ENV_PROTUBE_GOOGLE_CLIENT_ID and ENV_PROTUBE_GOOGLE_CLIENT_SECRET, but spring-boot-starter-oauth2-client is not
in the pom yet.
1. Backend: add the OAuth2 client starter and enable oauth2Login in SecurityConfig, keeping the API stateless
   with our JWT. On success, find the user by Google "sub", else create one (unique username from the email,
   no password). Do NOT link to an existing account by email: local registration never verifies emails, so
   linking enables pre-account hijacking. If a user with that email exists and has no google_sub, reject and
   redirect to <frontend.url>/login?error=google_email_exists. Otherwise issue our JWT and redirect to the SPA
   route /auth/callback with the token in the URL fragment. On failure redirect to /login?error=google.
   Scopes: openid, profile, email (we need email_verified).
2. Migration V4: users.google_sub (unique, nullable) and password nullable. Users without password cannot use
   password login.
3. Frontend: "Continue with Google" button on /login and /register (link to /oauth2/authorization/google on the
   API domain), /auth/callback page that stores the token through AuthProvider and goes home. LoginPage shows
   "An account with this email already exists. Sign in with your password." for google_email_exists.
   /auth/callback must be served by IndexController in Docker (direct load returns 200).
4. The app must still start and all tests/E2E must pass with the dummy values (CI has no real key): hide nothing,
   but never call Google in tests (mock the OAuth2 user / success handler).
5. Ask me for the real client id and secret when you need them. Put them only in the local .env (git-ignored),
   never in code, tests, prompts or docs. Tell me the redirect URIs to register in Google Cloud Console
   (Docker localhost:8080 and dev).
Tests: success handler (new user, existing by sub, email already used by another account), migration on H2,
callback page, login button.
Before coding, list the files you will change and wait for my confirmation.
Do not commit, push or open a PR until I explicitly approve it: the changes will first get a security review to
make sure the real client id/secret do not appear in any tracked file, log, test, build output or commit.
```

## Notes

* Remove any `spring.security.oauth2.client.provider.google.issuer-uri`: with it Spring downloads Google's
  discovery document at startup (network call in tests/CI). Spring's built-in Google provider is enough.
* Give the client id/secret placeholders a dummy default so `mvn verify` starts without them.
* `oauth2Login` without `loginPage("/login")` makes Spring generate its own page on `GET /login`, hiding the SPA.
* The OAuth2 handshake (state/nonce) lives in a short session that the success/failure handlers invalidate; the
  security context is never stored there, the API stays JWT-only.
* The developer types the real credentials into `.env` themselves; never paste them into the chat.
