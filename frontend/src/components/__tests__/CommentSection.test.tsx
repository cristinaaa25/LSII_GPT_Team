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

const renderWithAuth = (component: React.ReactElement, isAuthenticated = false) => {
  const mockAuthContext: AuthContextType = {
    user: isAuthenticated ? { id: 10, username: 'charlie', email: 'charlie@example.com' } : null,
    token: isAuthenticated ? 'valid-jwt-token' : null,
    isAuthenticated,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
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
});
