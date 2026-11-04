import { test, expect } from '@playwright/test';
import path from 'path';
import { createUniqueUserData, registerUser } from '../helpers/auth';

test.describe('Video Metadata Editor (US-07)', () => {
  test('allows video owner to edit title and description', async ({ page }) => {
    const user = createUniqueUserData('editor');
    await registerUser(page, user);

    // 1. Upload a video so user is owner
    await page.locator('header').getByRole('link', { name: 'Upload' }).click();
    const videoFilePath = path.join(__dirname, '../fixtures/sample-video.mp4');
    const initialTitle = `Editable Video ${Date.now()}`;
    const initialDescription = 'Initial description before editing.';

    await page.getByLabel('Video File').setInputFiles(videoFilePath);
    await page.getByLabel('Title').fill(initialTitle);
    await page.getByLabel('Description').fill(initialDescription);
    await page.getByRole('button', { name: 'Upload Video' }).click();

    await expect(page).toHaveURL(/\/videos\/\d+/, { timeout: 20000 });
    await expect(page.getByRole('heading', { level: 1, name: initialTitle })).toBeVisible();

    // 2. Open edit form
    const editButton = page.getByRole('button', { name: 'Edit' });
    await expect(editButton).toBeVisible();
    await editButton.click();

    const editForm = page.getByRole('form', { name: 'Edit video' });
    await expect(editForm).toBeVisible();

    // 3. Update title and description
    const updatedTitle = `Updated Video Title ${Date.now()}`;
    const updatedDescription = 'This description has been successfully edited.';

    await editForm.getByLabel('Title').fill(updatedTitle);
    await editForm.getByLabel('Description').fill(updatedDescription);
    await editForm.getByRole('button', { name: 'Save changes' }).click();

    // 4. Verify feedback and persisted updates
    await expect(page.getByRole('status')).toContainText('Changes saved.');
    await expect(page.getByRole('heading', { level: 1, name: updatedTitle })).toBeVisible();
    await expect(page.getByText(updatedDescription)).toBeVisible();
  });

  test('does not show edit button to non-owners', async ({ page }) => {
    const viewer = createUniqueUserData('viewer');
    await registerUser(page, viewer);

    // Navigate to seed video (owned by seed creator)
    await page.goto('/videos/1');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).not.toBeVisible();
  });
});
