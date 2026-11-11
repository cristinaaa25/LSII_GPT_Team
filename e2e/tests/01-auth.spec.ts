import { test, expect } from '@playwright/test';
import { createUniqueUserData, registerUser, loginUser, logoutUser } from '../helpers/auth';

test.describe('Authentication (US-01, US-02)', () => {
  test('registers a new user and allows login with both email and username', async ({ page }) => {
    const user = createUniqueUserData('auth_test');

    // 1. Register new user
    await registerUser(page, user);

    // Verify user info is visible in menu
    await page.getByRole('button', { name: 'User menu' }).click();
    await expect(page.getByText(user.email)).toBeVisible();

    // 2. Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('link', { name: 'Log In' })).toBeVisible();

    // 3. Login with email
    await loginUser(page, user.email, user.password);

    // 4. Logout
    await logoutUser(page);

    // 5. Login with username
    await loginUser(page, user.username, user.password);
  });

  test('displays error on duplicate user registration', async ({ page }) => {
    const user = createUniqueUserData('dup_test');

    // Register first user
    await registerUser(page, user);
    await logoutUser(page);

    // Attempt to register again with same username
    await page.goto('/register');
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Email address').fill(`other_${user.email}`);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('displays error when credentials are invalid', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email or Username').fill('non_existent_user');
    await page.getByLabel('Password').fill('WrongPassword123!');
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });
});

// Google is never contacted: we only check our own pages and the redirect our backend answers with
test.describe('Google login (US-01, US-02)', () => {
  for (const path of ['/login', '/register']) {
    test(`${path} offers "Continue with Google" pointing to the backend`, async ({ page }) => {
      await page.goto(path);

      const googleLink = page.getByRole('link', { name: 'Continue with Google' });
      await expect(googleLink).toBeVisible();
      await expect(googleLink).toHaveAttribute('href', /\/oauth2\/authorization\/google$/);
    });
  }

  test('backend starts the Google flow with the openid, profile and email scopes', async ({ request }) => {
    const response = await request.get('/oauth2/authorization/google', { maxRedirects: 0 });

    expect(response.status()).toBe(302);
    const location = response.headers()['location'];
    expect(location).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/);
    expect(location).toContain('scope=openid%20profile%20email');
    expect(location).toContain('/login/oauth2/code/google');
  });

  test('shows why a Google login was rejected', async ({ page }) => {
    await page.goto('/login?error=google_email_exists');

    await expect(page.getByRole('alert')).toHaveText(
      'An account with this email already exists. Sign in with your password.'
    );
  });

  test('callback page without a token returns to login with an error', async ({ page }) => {
    await page.goto('/auth/callback');

    await expect(page).toHaveURL(/\/login\?error=google$/);
    await expect(page.getByRole('alert')).toHaveText('Google sign-in failed. Please try again.');
  });
});
