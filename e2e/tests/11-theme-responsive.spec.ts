import { test, expect, Page } from '@playwright/test';

const theme = (page: Page) => page.locator('html').getAttribute('data-bs-theme');

test.describe('Theme and responsive layout', () => {
  test('first visit follows the system theme', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/');
    expect(await theme(page)).toBe('dark');
    await expect(page.getByRole('img', { name: 'ProTube logo' })).toHaveAttribute('src', '/logo-dark.svg');
    await context.close();
  });

  test('the theme toggle switches the theme and the choice survives a reload', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'light' });
    const page = await context.newPage();
    await page.goto('/');
    expect(await theme(page)).toBe('light');

    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    expect(await theme(page)).toBe('dark');
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe('rgb(18, 18, 32)');

    await page.reload();
    expect(await theme(page)).toBe('dark');
    await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
    await context.close();
  });

  test('on a phone the header collapses behind a hamburger and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Video catalog' }).locator('article').first()).toBeVisible();

    const search = page.getByPlaceholder('Search videos');
    const toggler = page.getByRole('button', { name: 'Toggle navigation' });
    await expect(search).toBeHidden();
    await expect(toggler).toHaveAttribute('aria-expanded', 'false');

    await toggler.click();
    await expect(toggler).toHaveAttribute('aria-expanded', 'true');
    await expect(search).toBeVisible();
    await expect(page.getByRole('link', { name: 'Log In' })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // Searching navigates and closes the menu again
    await search.fill('a');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page).toHaveURL(/\/search\?q=a/);
    await expect(search).toBeHidden();
  });

  test('on a desktop the header shows everything and the catalog uses four columns', async ({ page }) => {
    // Reduced motion: no page fade-in, so the card positions are final straight away
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Toggle navigation' })).toBeHidden();
    await expect(page.getByPlaceholder('Search videos')).toBeVisible();

    // Measured on the grid itself, so it works with any number of videos in the store (CI has only one)
    const catalog = page.getByRole('region', { name: 'Video catalog' });
    await expect(catalog.locator('article').first()).toBeVisible();
    const ratio = await catalog
      .locator('.row')
      .last()
      .evaluate((row) => {
        const col = row.querySelector(':scope > .col') as HTMLElement;
        return col.getBoundingClientRect().width / row.getBoundingClientRect().width;
      });
    expect(ratio).toBeGreaterThan(0.23);
    expect(ratio).toBeLessThan(0.27);

    // prefers-reduced-motion turns the animations off
    const pageAnimation = await page
      .locator('.pt-page')
      .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
    expect(pageAnimation).toBeLessThan(0.001);
  });

  test('the video player fills the content width on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto('/');
    await page.getByRole('region', { name: 'Video catalog' }).locator('article').first().getByRole('link').first().click();
    await expect(page).toHaveURL(/\/videos\/\d+/);

    const width = await page.locator('.pt-player').evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeGreaterThanOrEqual(370);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('opening a video from a scrolled catalog starts at the top with the player in view', async ({ page }) => {
    // Short phone viewport: the page is taller than the screen even with a single video (as in CI)
    await page.setViewportSize({ width: 375, height: 480 });
    await page.goto('/');
    const cards = page.getByRole('region', { name: 'Video catalog' }).locator('article');
    await expect(cards.first()).toBeVisible();
    const lastCard = cards.last();
    await lastCard.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await lastCard.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/videos\/\d+/);
    await expect(page.getByRole('slider', { name: 'Seek' })).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.getByRole('region', { name: 'Video player' })).toBeInViewport();
  });

  test('search with no results shows the illustrated empty state', async ({ page }) => {
    await page.goto('/search?q=zz-no-video-matches-this-zz');
    await expect(page.getByText('No videos found for "zz-no-video-matches-this-zz".')).toBeVisible();
    await expect(page.locator('.pt-empty svg[data-illustration="search"]')).toBeVisible();
  });
});
