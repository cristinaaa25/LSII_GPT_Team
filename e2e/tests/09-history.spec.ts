import { test, expect } from '@playwright/test';
import { createUniqueUserData, registerUser } from '../helpers/auth';

test.describe('Watch History', () => {
  test('redirects anonymous users away from /history', async ({ page }) => {
    await page.goto('/history');
    await expect(page).toHaveURL(/\/login/);
  });

  test('records watched videos, displays history in order, and clears with confirmation', async ({ page }) => {
    const user = createUniqueUserData('hist');
    await registerUser(page, user);

    // Navigate to History via the user menu -> initially empty
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('link', { name: 'History' }).click();
    await expect(page).toHaveURL('/history');
    await expect(page.getByText('You have not watched any videos yet.')).toBeVisible();

    // Watch a video from the catalog
    await page.getByRole('link', { name: 'Browse videos' }).click();
    const firstCard = page.getByRole('region', { name: 'Video catalog' }).locator('article').first();
    const watchedTitle = await firstCard.getAttribute('aria-label');
    expect(watchedTitle).toBeTruthy();

    // Listen for the view BEFORE opening the video: autoplay may register it as soon as the page loads
    const viewRegistered = page.waitForResponse(
      (res) => res.url().includes('/views') && res.request().method() === 'POST' && res.status() === 200
    );
    await firstCard.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/videos\/\d+/);
    const videoEl = page.locator('video');
    await expect(videoEl).toBeVisible();

    // If autoplay was blocked, a play event registers the view (only the first play per page load counts)
    await videoEl.evaluate((el: HTMLVideoElement) => el.dispatchEvent(new Event('play')));
    await viewRegistered;

    // Open History and verify the watched video appears with "Watched ..."
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('link', { name: 'History' }).click();
    await expect(page).toHaveURL('/history');

    const historyRegion = page.getByRole('region', { name: 'Watched videos' });
    await expect(historyRegion.getByRole('article', { name: watchedTitle! })).toBeVisible();
    await expect(historyRegion.getByText(/^Watched /)).toBeVisible();

    // Clear history with confirmation modal
    await page.getByRole('button', { name: 'Clear history' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirm clear history' }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('You have not watched any videos yet.')).toBeVisible();
  });
});
