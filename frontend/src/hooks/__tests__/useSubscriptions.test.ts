import { act, renderHook, waitFor } from '@testing-library/react';
import { FEED_PAGE_SIZE, useSubscriptions } from '../useSubscriptions';
import { userService } from '../../services/userService';

jest.mock('../../services/userService');

const mockedUserService = userService as jest.Mocked<typeof userService>;

const video = (id: number) => ({ id, title: `Video ${id}`, author: 'alice', duration: 60, views: 1, thumbnail: '' });

const page = (ids: number[], pageNumber: number, totalElements: number, last: boolean) => ({
  content: ids.map(video),
  page: pageNumber,
  size: FEED_PAGE_SIZE,
  totalElements,
  totalPages: Math.ceil(totalElements / FEED_PAGE_SIZE),
  last,
});

const channels = [
  {
    id: 1,
    username: 'alice',
    displayName: null,
    avatarUrl: null,
    subscriberCount: 2,
    subscribedAt: '2026-11-20T10:00:00Z',
  },
];

describe('useSubscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the channels and the first feed page together', async () => {
    mockedUserService.getMySubscriptions.mockResolvedValueOnce(channels);
    mockedUserService.getMyFeed.mockResolvedValueOnce(page([3, 2], 0, 14, false));

    const { result } = renderHook(() => useSubscriptions());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedUserService.getMyFeed).toHaveBeenCalledWith(0, FEED_PAGE_SIZE);
    expect(result.current.channels).toEqual(channels);
    expect(result.current.videos.map((v) => v.id)).toEqual([3, 2]);
    expect(result.current.totalVideos).toBe(14);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('appends the next pages, skipping repeated videos, until the last one', async () => {
    mockedUserService.getMySubscriptions.mockResolvedValueOnce(channels);
    mockedUserService.getMyFeed
      .mockResolvedValueOnce(page([5, 4], 0, 5, false))
      .mockResolvedValueOnce(page([4, 3], 1, 5, false))
      .mockResolvedValueOnce(page([2, 1], 2, 5, true));

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });
    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockedUserService.getMyFeed).toHaveBeenNthCalledWith(2, 1, FEED_PAGE_SIZE);
    expect(mockedUserService.getMyFeed).toHaveBeenNthCalledWith(3, 2, FEED_PAGE_SIZE);
    expect(result.current.videos.map((v) => v.id)).toEqual([5, 4, 3, 2, 1]);
    expect(result.current.hasMore).toBe(false);
  });

  it('ignores a second loadMore while one is in progress', async () => {
    mockedUserService.getMySubscriptions.mockResolvedValueOnce(channels);
    mockedUserService.getMyFeed.mockResolvedValueOnce(page([2], 0, 2, false));
    let resolveNext: (value: ReturnType<typeof page>) => void = () => {};
    mockedUserService.getMyFeed.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveNext = resolve;
      })
    );

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.loadMore();
      void result.current.loadMore();
    });
    expect(result.current.loadingMore).toBe(true);
    await act(async () => {
      resolveNext(page([1], 1, 2, true));
      await first;
    });

    expect(mockedUserService.getMyFeed).toHaveBeenCalledTimes(2);
    expect(result.current.videos.map((v) => v.id)).toEqual([2, 1]);
    expect(result.current.loadingMore).toBe(false);
  });

  it('reports a load error and keeps the loaded videos when loadMore fails', async () => {
    mockedUserService.getMySubscriptions.mockResolvedValueOnce(channels);
    mockedUserService.getMyFeed
      .mockResolvedValueOnce(page([2], 0, 2, false))
      .mockRejectedValueOnce(new Error('Timeout'));

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.loadMoreError).toBe('Timeout');
    expect(result.current.videos.map((v) => v.id)).toEqual([2]);
    expect(result.current.hasMore).toBe(true);
  });

  it('uses generic messages for non-Error failures', async () => {
    mockedUserService.getMySubscriptions.mockRejectedValueOnce('boom');
    mockedUserService.getMyFeed.mockResolvedValue(page([], 0, 0, true));

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to load subscriptions');

    mockedUserService.getMyFeed.mockRejectedValueOnce('boom');
    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.loadMoreError).toBe('Failed to load more videos');
  });

  it('shows the error and recovers on refresh', async () => {
    mockedUserService.getMySubscriptions
      .mockRejectedValueOnce(new Error('Server down'))
      .mockResolvedValueOnce(channels);
    mockedUserService.getMyFeed.mockResolvedValue(page([1], 0, 1, true));

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Server down');

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.channels).toEqual(channels);
    expect(result.current.videos.map((v) => v.id)).toEqual([1]);
  });
});
