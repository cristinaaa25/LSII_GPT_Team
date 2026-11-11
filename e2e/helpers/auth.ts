import { Page, expect } from '@playwright/test';

export interface UserData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  description?: string;
}

export function createUniqueUserData(prefix = 'user'): UserData {
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  return {
    username: `${prefix}_${uniqueId}`.substring(0, 25),
    email: `${prefix}_${uniqueId}@example.com`,
    password: 'Password123!',
    displayName: `Display ${uniqueId}`,
    description: `Bio for ${prefix}_${uniqueId}`,
  };
}

export async function registerUser(page: Page, user: UserData): Promise<void> {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Create Your ProTube Account' })).toBeVisible();

  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password').fill(user.password);

  if (user.description) {
    await page.getByLabel('Bio / Description').fill(user.description);
  }

  await page.getByRole('button', { name: 'Register' }).click();

  // Registration redirects to home and logs user in
  await expect(page.getByRole('button', { name: 'User menu' })).toBeVisible();
}

export async function loginUser(page: Page, emailOrUsername: string, password: string): Promise<void> {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Log In to ProTube' })).toBeVisible();

  await page.getByLabel('Email or Username').fill(emailOrUsername);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();

  await expect(page.getByRole('button', { name: 'User menu' })).toBeVisible();
}

export async function logoutUser(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByRole('link', { name: 'Log In' })).toBeVisible();
}
