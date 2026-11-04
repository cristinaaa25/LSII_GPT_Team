import { test, expect } from '@playwright/test';

test.describe('Video Catalog & Playback (US-04, US-05)', () => {
  test('browses catalog and plays a video', async ({ page }) => {
    await page.goto('/');

    // Check that catalog section is displayed
    const catalog = page.getByRole('region', { name: 'Video catalog' });
    await expect(catalog).toBeVisible();

    // Verify seed video is present in catalog
    const videoCard = catalog.locator('article').first();
    await expect(videoCard).toBeVisible();

    // Find link to video detail
    const videoLink = videoCard.getByRole('link').first();
    await videoLink.click();

    // Verify detail page has loaded
    await expect(page).toHaveURL(/\/videos\/\d+/);

    // Verify video player element
    const videoElement = page.locator('video');
    await expect(videoElement).toBeVisible();
    await expect(videoElement).toHaveAttribute('controls', '');

    // Verify detail headers
    const mainHeading = page.getByRole('heading', { level: 1 });
    await expect(mainHeading).toBeVisible();
    const headingText = await mainHeading.textContent();
    expect(headingText?.length).toBeGreaterThan(0);
  });

  test('displays not found message for non-existent video', async ({ page }) => {
    await page.goto('/videos/9999999');

    // Verify not found alert is shown
    await expect(page.getByRole('heading', { name: 'Video Not Found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to catalog' })).toBeVisible();
  });
});
