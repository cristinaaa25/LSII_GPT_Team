import { test, expect } from '@playwright/test';

test.describe('Video Search (US-08)', () => {
  test('searches videos from the header and displays results', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByRole('search').getByPlaceholder('Search videos');
    await expect(searchInput).toBeVisible();

    // Query for a term guaranteed in catalog (e.g. 'Video')
    const query = 'Video';
    await searchInput.fill(query);
    await page.getByRole('search').getByRole('button', { name: 'Search' }).click();

    // Verify URL
    await expect(page).toHaveURL(new RegExp(`/search\\?q=${query}`));

    // Verify search results contain video card
    const resultsCatalog = page.getByRole('region', { name: 'Video catalog' });
    await expect(resultsCatalog).toBeVisible();

    const resultCard = resultsCatalog.locator('article').first();
    await expect(resultCard).toBeVisible();
    await expect(resultCard).toContainText(query);
  });

  test('displays empty state when no videos match query', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByRole('search').getByPlaceholder('Search videos');
    const obscureQuery = 'nonexistentquery_xyz_12345';
    await searchInput.fill(obscureQuery);
    await page.getByRole('search').getByRole('button', { name: 'Search' }).click();

    await expect(page).toHaveURL(new RegExp(`/search\\?q=${obscureQuery}`));
    await expect(page.getByText(`No videos found for "${obscureQuery}".`)).toBeVisible();
  });
});
