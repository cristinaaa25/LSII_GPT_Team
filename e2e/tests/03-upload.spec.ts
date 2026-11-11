import { test, expect } from '@playwright/test';
import path from 'path';
import { createUniqueUserData, registerUser } from '../helpers/auth';

test.describe('Video Upload (US-06)', () => {
  test('redirects unauthenticated users trying to access upload page', async ({ page }) => {
    await page.goto('/upload');
    // Should be redirected to /login with state
    await expect(page).toHaveURL(/\/login/);
  });

  test('authenticated user uploads a video with metadata and thumbnail', async ({ page }) => {
    const user = createUniqueUserData('uploader');
    await registerUser(page, user);

    // Navigate to upload page via header navbar
    await page.locator('header').getByRole('link', { name: 'Upload' }).click();
    await expect(page.getByRole('heading', { name: 'Upload Video' })).toBeVisible();

    const videoFilePath = path.join(__dirname, '../fixtures/sample-video.mp4');
    const thumbnailFilePath = path.join(__dirname, '../fixtures/sample-thumbnail.png');
    const uniqueTitle = `Upload Test ${Date.now()}`;
    const uniqueDescription = 'This is a description for the uploaded test video.';

    // Fill upload form using accessible selectors
    await page.getByLabel('Video File').setInputFiles(videoFilePath);
    await page.getByLabel('Title').fill(uniqueTitle);
    await page.getByLabel('Description').fill(uniqueDescription);
    await page.getByLabel('Tags').fill('playwright, testing, protube');
    await page.getByLabel('Category').selectOption('Technology');
    await page.getByLabel('Thumbnail').setInputFiles(thumbnailFilePath);

    // Submit form
    await page.getByRole('button', { name: 'Upload Video' }).click();

    // Verify redirection to the new video detail page
    await expect(page).toHaveURL(/\/videos\/\d+/, { timeout: 20000 });

    // Verify uploaded metadata on the detail page
    await expect(page.getByRole('heading', { level: 1, name: uniqueTitle })).toBeVisible();
    await expect(page.getByText(uniqueDescription)).toBeVisible();
    await expect(page.getByRole('link', { name: user.username })).toBeVisible();
    await expect(page.getByText('#playwright')).toBeVisible();

    // Verify owner controls are present
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
  });
});
