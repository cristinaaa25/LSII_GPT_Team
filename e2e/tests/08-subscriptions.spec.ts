import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { createUniqueUserData, logoutUser, loginUser, registerUser } from '../helpers/auth';

/** Uploads a video and returns the path of its detail page (/videos/{id}). */
async function uploadVideo(page: Page, title: string): Promise<string> {
  await page.locator('header').getByRole('link', { name: 'Upload' }).click();
  await expect(page.getByRole('heading', { name: 'Upload Video' })).toBeVisible();
  await page.getByLabel('Video File').setInputFiles(path.join(__dirname, '../fixtures/sample-video.mp4'));
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Description').fill('Video for the subscriptions feed test.');
  await page.getByRole('button', { name: 'Upload Video' }).click();
  await expect(page).toHaveURL(/\/videos\/\d+/, { timeout: 20000 });
  return new URL(page.url()).pathname;
}

test.describe('Subscriptions', () => {
  test('a viewer subscribes to the author from the video page', async ({ browser }) => {
    // The author sees the count on their own video, but no button
    const channel = createUniqueUserData('vchan');
    const channelContext = await browser.newContext();
    const channelPage = await channelContext.newPage();
    await registerUser(channelPage, channel);
    const videoPath = await uploadVideo(channelPage, `Detail Video ${Date.now()}`);
    await expect(channelPage.getByText('0 subscribers')).toBeVisible();
    await expect(channelPage.getByRole('button', { name: 'Subscribe', exact: true })).toHaveCount(0);
    await channelContext.close();

    const viewer = createUniqueUserData('vfan');
    const viewerContext = await browser.newContext();
    const page = await viewerContext.newPage();
    await registerUser(page, viewer);

    // Subscribe next to the author's name: button and count change, and survive a reload
    await page.goto(videoPath);
    await expect(page.getByRole('link', { name: channel.username, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Subscribed' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('1 subscriber', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Subscribed' })).toBeVisible();

    // The same state on the author's profile
    await page.getByRole('link', { name: channel.username, exact: true }).click();
    await expect(page).toHaveURL(`/users/${encodeURIComponent(channel.username)}`);
    await expect(page.getByRole('button', { name: 'Subscribed' })).toBeVisible();
    await expect(page.getByText('1 subscriber', { exact: true })).toBeVisible();

    // Unsubscribe again from the video page
    await page.goto(videoPath);
    await page.getByRole('button', { name: 'Subscribed' }).click();
    await expect(page.getByRole('button', { name: 'Subscribe', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('0 subscribers')).toBeVisible();
    await viewerContext.close();
  });

  test('redirects anonymous users away from the subscriptions page', async ({ page }) => {
    await page.goto('/subscriptions');
    await expect(page).toHaveURL(/\/login/);
  });

  test('a viewer subscribes to a channel, sees its videos in the feed and unsubscribes', async ({ browser }) => {
    // 1. The channel uploads a video; on its own profile there is no Subscribe button
    const channel = createUniqueUserData('chan');
    const channelContext = await browser.newContext();
    const channelPage = await channelContext.newPage();
    await registerUser(channelPage, channel);
    const videoTitle = `Feed Video ${Date.now()}`;
    await uploadVideo(channelPage, videoTitle);

    await channelPage.goto(`/users/${encodeURIComponent(channel.username)}`);
    await expect(channelPage.getByText('0 subscribers')).toBeVisible();
    await expect(channelPage.getByRole('button', { name: /subscribe/i })).toHaveCount(0);
    await channelContext.close();

    // 2. A logged-out visitor is sent to log in and comes back to the profile
    const viewer = createUniqueUserData('fan');
    const viewerContext = await browser.newContext();
    const page = await viewerContext.newPage();
    await registerUser(page, viewer);
    await logoutUser(page);

    const profileUrl = `/users/${encodeURIComponent(channel.username)}`;
    await page.goto(profileUrl);
    await page.getByRole('link', { name: 'Subscribe', exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel('Email or Username').fill(viewer.username);
    await page.getByLabel('Password').fill(viewer.password);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(profileUrl);

    // 3. Subscribe: button and count change, and survive a reload
    await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Subscribed' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('1 subscriber', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Subscribed' })).toBeVisible();

    // 4. The subscriptions page lists the channel and its video
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('link', { name: 'Subscriptions' }).click();
    await expect(page).toHaveURL('/subscriptions');
    const channels = page.getByRole('region', { name: 'Subscribed channels' });
    await expect(channels.getByRole('link', { name: new RegExp(channel.username) })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Subscription feed' }).getByRole('article', { name: videoTitle }))
      .toBeVisible();

    // 5. Unsubscribe from the profile: the subscriptions page becomes empty
    await page.goto(profileUrl);
    await page.getByRole('button', { name: 'Subscribed' }).click();
    await expect(page.getByRole('button', { name: 'Subscribe', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('0 subscribers')).toBeVisible();

    await page.goto('/subscriptions');
    await expect(page.getByText('You are not subscribed to any channel yet.')).toBeVisible();
    await viewerContext.close();
  });

  test('the subscription survives logging out and in again', async ({ browser }) => {
    const channel = createUniqueUserData('chan2');
    const viewer = createUniqueUserData('fan2');
    const context = await browser.newContext();
    const page = await context.newPage();
    await registerUser(page, channel);
    await logoutUser(page);
    await registerUser(page, viewer);

    await page.goto(`/users/${encodeURIComponent(channel.username)}`);
    await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Subscribed' })).toBeVisible();

    await logoutUser(page);
    await page.goto(`/users/${encodeURIComponent(channel.username)}`);
    // Anonymous: the count is public, subscribedByMe is not
    await expect(page.getByText('1 subscriber', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Subscribe', exact: true })).toBeVisible();

    await loginUser(page, viewer.email, viewer.password);
    await page.goto(`/users/${encodeURIComponent(channel.username)}`);
    await expect(page.getByRole('button', { name: 'Subscribed' })).toBeVisible();
    await context.close();
  });
});
