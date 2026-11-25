import { test, expect } from '@playwright/test';
import { createUniqueUserData, registerUser } from '../helpers/auth';

test.describe('Playlists and Watch Later', () => {
  test('redirects anonymous users away from /playlists', async ({ page }) => {
    await page.goto('/playlists');
    await expect(page).toHaveURL(/\/login/);
  });

  test('saves video to Watch later and custom playlist, and opens playlist pages', async ({ page }) => {
    const user = createUniqueUserData('plist');
    await registerUser(page, user);

    // Open a video from the catalog
    const firstCard = page.getByRole('region', { name: 'Video catalog' }).locator('article').first();
    const videoTitle = await firstCard.getAttribute('aria-label');
    expect(videoTitle).toBeTruthy();

    await firstCard.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/videos\/\d+/);

    // Open Save dropdown -> Watch later appears first
    await page.getByRole('button', { name: 'Save' }).click();
    const watchLaterCheckbox = page.getByLabel(/Watch later/i);
    await expect(watchLaterCheckbox).toBeVisible();
    // Controlled checkbox updates after the PUT request finishes, so click + toBeChecked instead of .check()
    await watchLaterCheckbox.click();
    await expect(watchLaterCheckbox).toBeChecked();

    // Create a new list from inside the dropdown (auto-saves the video to it)
    await page.getByRole('button', { name: '+ New list' }).click();
    await page.getByLabel('New playlist name').fill('Weekend');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByLabel(/Weekend/i)).toBeChecked();

    // Close the Save menu, then navigate to Playlists via the header user menu
    await page.getByRole('button', { name: 'Close save menu' }).click();
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('link', { name: 'Playlists' }).click();
    await expect(page).toHaveURL('/playlists');

    await expect(page.getByRole('link', { name: 'Watch later' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Weekend' })).toBeVisible();

    // Open Weekend playlist and verify the saved video is listed
    await page.getByRole('link', { name: 'Weekend' }).click();
    await expect(page).toHaveURL(/\/playlists\/\d+/);
    await expect(page.getByRole('article', { name: videoTitle! })).toBeVisible();
  });
});
