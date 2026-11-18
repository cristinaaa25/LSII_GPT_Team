import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import CommentSection from '../CommentSection';
import { AuthContext, AuthContextType } from '../../context/AuthContext';
import type { Comment, CommentsPage } from '../../types/comment';

jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      isAxiosError:
        actualAxios.isAxiosError || ((err: unknown) => Boolean((err as { isAxiosError?: boolean })?.isAxiosError)),
    },
  };
});

const mockedGet = axios.get as jest.Mock;
const mockedPost = axios.post as jest.Mock;
const mockedPut = axios.put as jest.Mock;
const mockedDelete = axios.delete as jest.Mock;

const sampleComments: Comment[] = [
  {
    id: 1,
    videoId: 42,
    text: 'Great video on wildlife!',
    author: 'alice',
    createdAt: '2024-05-15T12:00:00Z',
    likeCount: 5,
    likedByMe: false,
    parentId: null,
    replies: [
      {
        id: 2,
        videoId: 42,
        text: 'I totally agree with you.',
        author: 'bob',
        createdAt: '2024-05-15T12:30:00Z',
        likeCount: 1,
        likedByMe: true,
        parentId: 1,
        replies: [],
      },
    ],
  },
];

const mockPage: CommentsPage = {
  content: sampleComments,
  page: 0,
  size: 10,
  totalElements: 2,
  totalPages: 1,
  last: true,
};

const renderWithAuth = (component: React.ReactElement, isAuthenticated = false, username = 'charlie') => {
  const mockAuthContext: AuthContextType = {
    user: isAuthenticated ? { id: 10, username, email: `${username}@example.com` } : null,
    token: isAuthenticated ? 'valid-jwt-token' : null,
    isAuthenticated,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    loginWithToken: jest.fn(),
    logout: jest.fn(),
  };

  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <MemoryRouter>{component}</MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('CommentSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders comments and nested replies correctly', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });

    renderWithAuth(<CommentSection videoId={42} />);

    expect(await screen.findByText('Great video on wildlife!')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('I totally agree with you.')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Comments (2)' })).toBeInTheDocument();
  });

  it('anonymous users see "log in to comment" instead of the comment form', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });

    renderWithAuth(<CommentSection videoId={42} />, false);

    expect(await screen.findByText(/log in to comment/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Comment' })).not.toBeInTheDocument();
  });

  it('authenticated users see comment form and can post a new comment', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });

    const newComment: Comment = {
      id: 3,
      videoId: 42,
      text: 'My brand new comment',
      author: 'charlie',
      createdAt: '2024-05-15T13:00:00Z',
      likeCount: 0,
      likedByMe: false,
      parentId: null,
      replies: [],
    };
    mockedPost.mockResolvedValueOnce({ data: newComment });

    renderWithAuth(<CommentSection videoId={42} />, true);

    const textarea = await screen.findByPlaceholderText('Add a comment...');
    const submitBtn = screen.getByRole('button', { name: 'Comment' });

    expect(submitBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'My brand new comment' } });
    expect(submitBtn).toBeEnabled();

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockedPost).toHaveBeenCalledWith(
      expect.stringContaining('/videos/42/comments'),
      { text: 'My brand new comment' },
      expect.objectContaining({
        headers: { Authorization: 'Bearer valid-jwt-token' },
      })
    );

    expect(await screen.findByText('My brand new comment')).toBeInTheDocument();
    expect(textarea).toHaveValue('');
  });

  it('shows error if posting comment fails', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });
    mockedPost.mockRejectedValueOnce(new Error('Network failure'));

    renderWithAuth(<CommentSection videoId={42} />, true);

    const textarea = await screen.findByPlaceholderText('Add a comment...');
    const submitBtn = screen.getByRole('button', { name: 'Comment' });

    fireEvent.change(textarea, { target: { value: 'Some text' } });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(await screen.findByText('Network failure')).toBeInTheDocument();
  });

  it('authenticated user can reply to a comment', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });

    const newReply: Comment = {
      id: 4,
      videoId: 42,
      text: 'Here is my reply to Alice',
      author: 'charlie',
      createdAt: '2024-05-15T13:10:00Z',
      likeCount: 0,
      likedByMe: false,
      parentId: 1,
      replies: [],
    };
    mockedPost.mockResolvedValueOnce({ data: newReply });

    renderWithAuth(<CommentSection videoId={42} />, true);

    const replyToggleBtn = await screen.findByRole('button', { name: 'Reply to comment by alice' });
    fireEvent.click(replyToggleBtn);

    const replyInput = screen.getByPlaceholderText('Write a reply...');
    const replySubmitBtn = screen.getByRole('button', { name: 'Reply' });

    fireEvent.change(replyInput, { target: { value: 'Here is my reply to Alice' } });

    await act(async () => {
      fireEvent.click(replySubmitBtn);
    });

    expect(mockedPost).toHaveBeenCalledWith(
      expect.stringContaining('/comments/1/replies'),
      { text: 'Here is my reply to Alice' },
      expect.any(Object)
    );

    expect(await screen.findByText('Here is my reply to Alice')).toBeInTheDocument();
  });

  it('keeps the count from the video (replies included) and adds new replies to it', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });
    mockedPost.mockResolvedValueOnce({
      data: { ...sampleComments[0], id: 9, text: 'Another reply', parentId: 1, replies: [] },
    });

    renderWithAuth(<CommentSection videoId={42} initialCommentCount={3} />, true);

    await screen.findByText('Great video on wildlife!');
    // The first page reports 2 root comments, but the heading keeps the total of 3 (with the reply)
    expect(screen.getByRole('heading', { level: 2, name: 'Comments (3)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reply to comment by alice' }));
    fireEvent.change(screen.getByPlaceholderText('Write a reply...'), { target: { value: 'Another reply' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    });

    expect(screen.getByRole('heading', { level: 2, name: 'Comments (4)' })).toBeInTheDocument();
  });

  it('displays error message when reply submission fails', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });
    mockedPost.mockRejectedValueOnce(new Error('Server error replying'));

    renderWithAuth(<CommentSection videoId={42} />, true);

    const replyToggleBtn = await screen.findByRole('button', { name: 'Reply to comment by alice' });
    fireEvent.click(replyToggleBtn);

    const replyInput = screen.getByPlaceholderText('Write a reply...');
    fireEvent.change(replyInput, { target: { value: 'Will fail' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    });

    expect(await screen.findByText('Server error replying')).toBeInTheDocument();
  });

  it('cancelling reply closes the reply form', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });

    renderWithAuth(<CommentSection videoId={42} />, true);

    const replyToggleBtn = await screen.findByRole('button', { name: 'Reply to comment by alice' });
    fireEvent.click(replyToggleBtn);

    expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByPlaceholderText('Write a reply...')).not.toBeInTheDocument();
  });

  it('toggles like on a comment (PUT when unliked, DELETE when liked)', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });
    mockedPut.mockResolvedValueOnce({
      data: { commentId: 1, likeCount: 6, likedByMe: true },
    });

    renderWithAuth(<CommentSection videoId={42} />, true);

    // Comment 1 is currently likedByMe: false -> clicking calls PUT
    const likeBtn = await screen.findByRole('button', { name: 'Like comment by alice' });
    expect(likeBtn).toHaveTextContent('👍 5');

    await act(async () => {
      fireEvent.click(likeBtn);
    });

    expect(mockedPut).toHaveBeenCalledWith(expect.stringContaining('/comments/1/like'), {}, expect.any(Object));
    expect(likeBtn).toHaveTextContent('👍 6');

    // Comment 2 is likedByMe: true -> clicking calls DELETE
    mockedDelete.mockResolvedValueOnce({
      data: { commentId: 2, likeCount: 0, likedByMe: false },
    });

    const replyLikeBtn = screen.getByRole('button', { name: 'Like reply by bob' });
    expect(replyLikeBtn).toHaveTextContent('👍 1');

    await act(async () => {
      fireEvent.click(replyLikeBtn);
    });

    expect(mockedDelete).toHaveBeenCalledWith(expect.stringContaining('/comments/2/like'), expect.any(Object));
    expect(replyLikeBtn).toHaveTextContent('👍 0');
  });

  it('shows empty state when there are no comments', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true },
    });

    renderWithAuth(<CommentSection videoId={42} />, false);

    expect(await screen.findByText('No comments yet. Be the first to comment!')).toBeInTheDocument();
  });

  it('shows error state when comments fetch fails', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Failed to fetch'));

    renderWithAuth(<CommentSection videoId={42} />, false);

    expect(await screen.findByText('Failed to fetch')).toBeInTheDocument();
  });

  it('loads more comments when "Load more comments" is clicked', async () => {
    const multiPage: CommentsPage = {
      content: [sampleComments[0]],
      page: 0,
      size: 1,
      totalElements: 2,
      totalPages: 2,
      last: false,
    };
    mockedGet.mockResolvedValueOnce({ data: multiPage });

    const secondPage: CommentsPage = {
      content: [
        {
          id: 5,
          videoId: 42,
          text: 'Second page comment',
          author: 'dan',
          createdAt: '2024-05-15T14:00:00Z',
          likeCount: 0,
          likedByMe: false,
          parentId: null,
          replies: [],
        },
      ],
      page: 1,
      size: 1,
      totalElements: 2,
      totalPages: 2,
      last: true,
    };
    mockedGet.mockResolvedValueOnce({ data: secondPage });

    renderWithAuth(<CommentSection videoId={42} />, false);

    const loadMoreBtn = await screen.findByRole('button', { name: 'Load more comments' });
    expect(loadMoreBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(loadMoreBtn);
    });

    expect(await screen.findByText('Second page comment')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more comments' })).not.toBeInTheDocument();
  });

  it('does not duplicate a comment that shifts into the next page', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { content: [sampleComments[0]], page: 0, size: 1, totalElements: 2, totalPages: 2, last: false },
    });
    // Offset pagination: a new comment pushed the first one into page 1
    mockedGet.mockResolvedValueOnce({
      data: { content: [sampleComments[0]], page: 1, size: 1, totalElements: 3, totalPages: 3, last: false },
    });

    renderWithAuth(<CommentSection videoId={42} />, false);

    const loadMoreBtn = await screen.findByRole('button', { name: 'Load more comments' });
    await act(async () => {
      fireEvent.click(loadMoreBtn);
    });

    expect(screen.getAllByText('Great video on wildlife!')).toHaveLength(1);
  });

  describe('edit and delete comments/replies', () => {
    it('shows Edit and Delete buttons only to the author', async () => {
      mockedGet.mockResolvedValueOnce({ data: mockPage });
      // Authenticated as charlie (not author of comment 1 or reply 2)
      renderWithAuth(<CommentSection videoId={42} />, true, 'charlie');

      await screen.findByText('Great video on wildlife!');
      expect(screen.queryByRole('button', { name: 'Edit comment by alice' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete comment by alice' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit reply by bob' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete reply by bob' })).not.toBeInTheDocument();
    });

    it('shows Edit and Delete buttons to author of root comment', async () => {
      mockedGet.mockResolvedValueOnce({ data: mockPage });
      // Authenticated as alice (author of comment 1)
      renderWithAuth(<CommentSection videoId={42} />, true, 'alice');

      await screen.findByText('Great video on wildlife!');
      expect(screen.getByRole('button', { name: 'Edit comment by alice' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete comment by alice' })).toBeInTheDocument();
      // But not for bob's reply
      expect(screen.queryByRole('button', { name: 'Edit reply by bob' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete reply by bob' })).not.toBeInTheDocument();
    });

    it('shows Edit and Delete buttons to author of reply', async () => {
      mockedGet.mockResolvedValueOnce({ data: mockPage });
      // Authenticated as bob (author of reply 2)
      renderWithAuth(<CommentSection videoId={42} />, true, 'bob');

      await screen.findByText('Great video on wildlife!');
      // Not for alice's comment
      expect(screen.queryByRole('button', { name: 'Edit comment by alice' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete comment by alice' })).not.toBeInTheDocument();
      // But yes for bob's reply
      expect(screen.getByRole('button', { name: 'Edit reply by bob' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete reply by bob' })).toBeInTheDocument();
    });

    it('edits root comment inline and saves changes', async () => {
      mockedGet.mockResolvedValueOnce({ data: mockPage });
      mockedPut.mockResolvedValueOnce({
        data: { ...sampleComments[0], text: 'Edited text for Alice comment' },
      });

      renderWithAuth(<CommentSection videoId={42} />, true, 'alice');
      await screen.findByText('Great video on wildlife!');

      const editBtn = screen.getByRole('button', { name: 'Edit comment by alice' });
      fireEvent.click(editBtn);

      const textarea = screen.getByLabelText('Edit comment');
      expect(textarea).toHaveValue('Great video on wildlife!');

      // Cancel button test
      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelBtn);
      expect(screen.queryByLabelText('Edit comment')).not.toBeInTheDocument();
      expect(screen.getByText('Great video on wildlife!')).toBeInTheDocument();

      // Re-open and edit
      fireEvent.click(screen.getByRole('button', { name: 'Edit comment by alice' }));
      const textareaAgain = screen.getByLabelText('Edit comment');
      fireEvent.change(textareaAgain, { target: { value: 'Edited text for Alice comment' } });

      const saveBtn = screen.getByRole('button', { name: 'Save' });
      await act(async () => {
        fireEvent.click(saveBtn);
      });

      expect(mockedPut).toHaveBeenCalledWith(
        expect.stringContaining('/comments/1'),
        { text: 'Edited text for Alice comment' },
        expect.any(Object)
      );

      expect(await screen.findByText('Edited text for Alice comment')).toBeInTheDocument();
      expect(screen.queryByLabelText('Edit comment')).not.toBeInTheDocument();
    });

    it('displays error when editing comment fails', async () => {
      mockedGet.mockResolvedValueOnce({ data: mockPage });
      mockedPut.mockRejectedValueOnce(new Error('Update failed on server'));

      renderWithAuth(<CommentSection videoId={42} />, true, 'alice');
      await screen.findByText('Great video on wildlife!');

      fireEvent.click(screen.getByRole('button', { name: 'Edit comment by alice' }));
      const textarea = screen.getByLabelText('Edit comment');
      fireEvent.change(textarea, { target: { value: 'Will fail' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      });

      expect(await screen.findByText('Update failed on server')).toBeInTheDocument();
    });

    it('edits reply inline and saves changes', async () => {
      mockedGet.mockResolvedValueOnce({ data: mockPage });
      mockedPut.mockResolvedValueOnce({
        data: { ...sampleComments[0].replies[0], text: 'Edited reply text by Bob' },
      });

      renderWithAuth(<CommentSection videoId={42} />, true, 'bob');
      await screen.findByText('I totally agree with you.');

      fireEvent.click(screen.getByRole('button', { name: 'Edit reply by bob' }));
      const textarea = screen.getByLabelText('Edit reply');
      expect(textarea).toHaveValue('I totally agree with you.');

      fireEvent.change(textarea, { target: { value: 'Edited reply text by Bob' } });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      });

      expect(mockedPut).toHaveBeenCalledWith(
        expect.stringContaining('/comments/2'),
        { text: 'Edited reply text by Bob' },
        expect.any(Object)
      );

      expect(await screen.findByText('Edited reply text by Bob')).toBeInTheDocument();
    });

    it('opens confirmation modal and dismisses on Cancel', async () => {
      mockedGet.mockResolvedValueOnce({ data: mockPage });

      renderWithAuth(<CommentSection videoId={42} />, true, 'alice');
      await screen.findByText('Great video on wildlife!');

      fireEvent.click(screen.getByRole('button', { name: 'Delete comment by alice' }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Delete Comment')).toBeInTheDocument();
      expect(
        screen.getByText('Are you sure you want to delete this comment? This action cannot be undone.')
      ).toBeInTheDocument();

      const cancelBtn = screen.getByRole('dialog').querySelector('.modal-footer .btn-secondary') as HTMLElement;
      fireEvent.click(cancelBtn);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByText('Great video on wildlife!')).toBeInTheDocument();
      expect(mockedDelete).not.toHaveBeenCalled();
    });

    it('deletes root comment, updates list, and decrements counter with cascade', async () => {
      mockedGet.mockResolvedValueOnce({ data: mockPage });
      mockedDelete.mockResolvedValueOnce({ status: 204 });

      renderWithAuth(<CommentSection videoId={42} initialCommentCount={3} />, true, 'alice');
      await screen.findByText('Great video on wildlife!');
      expect(screen.getByRole('heading', { level: 2, name: 'Comments (3)' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Delete comment by alice' }));
      const confirmDeleteBtn = screen.getByRole('dialog').querySelector('.modal-footer .btn-danger') as HTMLElement;

      await act(async () => {
        fireEvent.click(confirmDeleteBtn);
      });

      expect(mockedDelete).toHaveBeenCalledWith(expect.stringContaining('/comments/1'), expect.any(Object));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Great video on wildlife!')).not.toBeInTheDocument();
      // Counter: was 3, root comment + 1 reply deleted -> 3 - 2 = 1
      expect(screen.getByRole('heading', { level: 2, name: 'Comments (1)' })).toBeInTheDocument();
    });

    it('deletes reply comment, updates list, and decrements counter by 1', async () => {
      mockedGet.mockResolvedValueOnce({ data: mockPage });
      mockedDelete.mockResolvedValueOnce({ status: 204 });

      renderWithAuth(<CommentSection videoId={42} initialCommentCount={3} />, true, 'bob');
      await screen.findByText('I totally agree with you.');
      expect(screen.getByRole('heading', { level: 2, name: 'Comments (3)' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Delete reply by bob' }));
      const confirmDeleteBtn = screen.getByRole('dialog').querySelector('.modal-footer .btn-danger') as HTMLElement;

      await act(async () => {
        fireEvent.click(confirmDeleteBtn);
      });

      expect(mockedDelete).toHaveBeenCalledWith(expect.stringContaining('/comments/2'), expect.any(Object));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('I totally agree with you.')).not.toBeInTheDocument();
      // Root comment remains
      expect(screen.getByText('Great video on wildlife!')).toBeInTheDocument();
      // Counter: was 3, 1 reply deleted -> 3 - 1 = 2
      expect(screen.getByRole('heading', { level: 2, name: 'Comments (2)' })).toBeInTheDocument();
    });

    it('displays error in modal when delete fails', async () => {
      mockedGet.mockResolvedValueOnce({ data: mockPage });
      mockedDelete.mockRejectedValueOnce(new Error('Cannot delete comment'));

      renderWithAuth(<CommentSection videoId={42} />, true, 'alice');
      await screen.findByText('Great video on wildlife!');

      fireEvent.click(screen.getByRole('button', { name: 'Delete comment by alice' }));
      const confirmDeleteBtn = screen.getByRole('dialog').querySelector('.modal-footer .btn-danger') as HTMLElement;

      await act(async () => {
        fireEvent.click(confirmDeleteBtn);
      });

      expect(await screen.findByText('Cannot delete comment')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
