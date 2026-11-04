import { act, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { useComments } from '../useComments';
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

const sampleComment: Comment = {
  id: 1,
  videoId: 42,
  text: 'Root comment',
  author: 'alice',
  createdAt: '2024-05-15T12:00:00Z',
  likeCount: 2,
  likedByMe: false,
  parentId: null,
  replies: [
    {
      id: 2,
      videoId: 42,
      text: 'Reply comment',
      author: 'bob',
      createdAt: '2024-05-15T12:30:00Z',
      likeCount: 1,
      likedByMe: true,
      parentId: 1,
      replies: [],
    },
  ],
};

const mockPage: CommentsPage = {
  content: [sampleComment],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 2,
  last: false,
};

describe('useComments hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing and sets loading to false when videoId is undefined', async () => {
    const { result } = renderHook(() => useComments(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.comments).toEqual([]);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('fetches comments successfully on mount', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });

    const { result } = renderHook(() => useComments(42));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].text).toBe('Root comment');
    expect(result.current.hasMore).toBe(true);
    expect(result.current.totalElements).toBe(1);
  });

  it('handles error when fetching comments fails', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useComments(42));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network error');
  });

  it('adds a new comment and prepends it to the list', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });
    const newComment: Comment = {
      id: 3,
      videoId: 42,
      text: 'Brand new',
      author: 'alice',
      createdAt: '2024-05-15T13:00:00Z',
      likeCount: 0,
      likedByMe: false,
      parentId: null,
      replies: [],
    };
    mockedPost.mockResolvedValueOnce({ data: newComment });

    const { result } = renderHook(() => useComments(42));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const added = await result.current.addComment('Brand new');
      expect(added.text).toBe('Brand new');
    });

    expect(result.current.comments).toHaveLength(2);
    expect(result.current.comments[0].id).toBe(3);
    expect(result.current.totalElements).toBe(2);
  });

  it('adds a reply and nests it under the correct comment', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });
    const newReply: Comment = {
      id: 4,
      videoId: 42,
      text: 'Another reply',
      author: 'alice',
      createdAt: '2024-05-15T13:05:00Z',
      likeCount: 0,
      likedByMe: false,
      parentId: 1,
      replies: [],
    };
    mockedPost.mockResolvedValueOnce({ data: newReply });

    const { result } = renderHook(() => useComments(42));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addReply(1, 'Another reply');
    });

    const root = result.current.comments.find((c) => c.id === 1);
    expect(root?.replies).toHaveLength(2);
    expect(root?.replies[1].id).toBe(4);
  });

  it('toggles like for root comment (unliked -> liked)', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });
    mockedPut.mockResolvedValueOnce({
      data: { commentId: 1, likeCount: 3, likedByMe: true },
    });

    const { result } = renderHook(() => useComments(42));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleLike(1);
    });

    const root = result.current.comments.find((c) => c.id === 1);
    expect(root?.likeCount).toBe(3);
    expect(root?.likedByMe).toBe(true);
  });

  it('toggles like for nested reply (liked -> unliked)', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });
    mockedDelete.mockResolvedValueOnce({
      data: { commentId: 2, likeCount: 0, likedByMe: false },
    });

    const { result } = renderHook(() => useComments(42));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleLike(2);
    });

    const root = result.current.comments.find((c) => c.id === 1);
    const reply = root?.replies.find((r) => r.id === 2);
    expect(reply?.likeCount).toBe(0);
    expect(reply?.likedByMe).toBe(false);
  });

  it('loads more comments and reloads', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockPage });
    const secondPage: CommentsPage = {
      content: [
        {
          id: 5,
          videoId: 42,
          text: 'Second page',
          author: 'charlie',
          createdAt: '2024-05-15T14:00:00Z',
          likeCount: 0,
          likedByMe: false,
          parentId: null,
          replies: [],
        },
      ],
      page: 1,
      size: 10,
      totalElements: 2,
      totalPages: 2,
      last: true,
    };
    mockedGet.mockResolvedValueOnce({ data: secondPage });

    const { result } = renderHook(() => useComments(42));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.comments).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);

    // Test reload
    mockedGet.mockResolvedValueOnce({ data: mockPage });
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.comments).toHaveLength(1);
  });
});
