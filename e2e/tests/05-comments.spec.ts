import { test, expect } from '@playwright/test';
import { createUniqueUserData, registerUser } from '../helpers/auth';

test.describe('Comments, Replies and Likes (US-09, US-10)', () => {
  test('prompts unauthenticated user to log in before commenting', async ({ page }) => {
    await page.goto('/videos/1');

    const commentSection = page.getByRole('region', { name: 'Comments' });
    await expect(commentSection).toBeVisible();

    await expect(page.getByRole('link', { name: 'log in to comment' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Add a comment' })).not.toBeVisible();
  });

  test('authenticated user can post a comment, reply to it, and like it', async ({ page }) => {
    const user = createUniqueUserData('commenter');
    await registerUser(page, user);

    // Go to seed video detail page
    await page.goto('/videos/1');

    const commentSection = page.getByRole('region', { name: 'Comments' });
    await expect(commentSection).toBeVisible();

    // 1. Post a new comment
    const commentForm = page.getByRole('form', { name: 'Add comment form' });
    const commentInput = commentForm.getByRole('textbox', { name: 'Add a comment' });
    await expect(commentInput).toBeVisible();

    const commentText = `Great video! Test comment ${Date.now()}`;
    await commentInput.fill(commentText);
    await commentForm.getByRole('button', { name: 'Comment', exact: true }).click();

    // Verify comment appears
    const commentArticle = page.getByRole('article', { name: `Comment by ${user.username}` }).first();
    await expect(commentArticle).toBeVisible();
    await expect(commentArticle).toContainText(commentText);

    // 2. Post a reply to the comment
    const replyTriggerButton = commentArticle.getByRole('button', { name: `Reply to comment by ${user.username}` });
    await replyTriggerButton.click();

    const replyForm = commentArticle.getByRole('form', { name: 'Reply form' });
    await expect(replyForm).toBeVisible();

    const replyInput = replyForm.getByRole('textbox', { name: 'Write a reply' });
    await expect(replyInput).toBeVisible();

    const replyText = `Thanks for sharing! Reply ${Date.now()}`;
    await replyInput.fill(replyText);
    await replyForm.getByRole('button', { name: 'Reply', exact: true }).click();

    // Verify reply is rendered
    await expect(commentArticle).toContainText(replyText);

    // 3. Like the comment
    const likeButton = commentArticle.getByRole('button', { name: `Like comment by ${user.username}` });
    await expect(likeButton).toContainText('👍 0');
    await likeButton.click();

    // Verify like count incremented
    await expect(likeButton).toContainText('👍 1');
  });
});
