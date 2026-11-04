import { test, expect } from '@playwright/test';
import path from 'path';
import { createUniqueUserData, registerUser } from '../helpers/auth';

test.describe('User Profile (US-03)', () => {
  test('allows an authenticated user to edit their profile details and avatar', async ({ page }) => {
    const user = createUniqueUserData('profile_user');
    await registerUser(page, user);

    // 1. Navigate to Profile page via user menu
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('link', { name: 'Profile', exact: true }).click();

    await expect(page).toHaveURL('/profile');
    await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible();

    // 2. Update display name and bio
    const newDisplayName = `Updated ${user.username}`;
    const newBio = 'This is an updated bio for testing profile edit.';

    await page.getByLabel('Display Name').fill(newDisplayName);
    await page.getByLabel('Description').fill(newBio);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Profile updated successfully')).toBeVisible();

    // 3. Upload avatar image
    const avatarFilePath = path.join(__dirname, '../fixtures/sample-avatar.png');
    await page.getByLabel('Choose avatar image').setInputFiles(avatarFilePath);
    await page.getByRole('button', { name: 'Upload Avatar' }).click();

    await expect(page.getByText('Avatar updated successfully')).toBeVisible();

    // 4. Visit Public Profile to verify persisted changes
    await page.getByRole('link', { name: 'View Public Profile' }).click();
    await expect(page).toHaveURL(`/users/${encodeURIComponent(user.username)}`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(newDisplayName);
    await expect(page.getByText(`@${user.username}`)).toBeVisible();
    await expect(page.getByText(newBio)).toBeVisible();
    await expect(page.getByLabel('User profile').getByRole('img', { name: user.username })).toBeVisible();
  });
});
