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
