import { act, renderHook, waitFor } from '@testing-library/react';
import { HISTORY_PAGE_SIZE, useHistory } from '../useHistory';
import { userService } from '../../services/userService';

jest.mock('../../services/userService');

const mockedUserService = userService as jest.Mocked<typeof userService>;

const historyVideo = (id: number) => ({
  id,
  title: `Video ${id}`,
  author: 'alice',
  duration: 60,
  views: 5,
  thumbnail: `${id}.webp`,
  lastViewedAt: `2026-11-24T10:0${id % 10}:00Z`,
});

const page = (ids: number[], pageNumber: number, totalElements: number, last: boolean) => ({
  content: ids.map(historyVideo),
  page: pageNumber,
  size: HISTORY_PAGE_SIZE,
  totalElements,
  totalPages: Math.ceil(totalElements / HISTORY_PAGE_SIZE),
  last,
});

describe('useHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the first page of watch history on mount', async () => {
    mockedUserService.getMyHistory.mockResolvedValueOnce(page([3, 2], 0, 14, false));

    const { result } = renderHook(() => useHistory());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedUserService.getMyHistory).toHaveBeenCalledWith(0, HISTORY_PAGE_SIZE);
    expect(result.current.videos.map((v) => v.id)).toEqual([3, 2]);
    expect(result.current.totalVideos).toBe(14);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('loads next pages with loadMore and deduplicates repeated videos', async () => {
    mockedUserService.getMyHistory
      .mockResolvedValueOnce(page([5, 4], 0, 5, false))
      .mockResolvedValueOnce(page([4, 3], 1, 5, false))
      .mockResolvedValueOnce(page([2, 1], 2, 5, true));

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });
    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockedUserService.getMyHistory).toHaveBeenNthCalledWith(2, 1, HISTORY_PAGE_SIZE);
    expect(mockedUserService.getMyHistory).toHaveBeenNthCalledWith(3, 2, HISTORY_PAGE_SIZE);
    expect(result.current.videos.map((v) => v.id)).toEqual([5, 4, 3, 2, 1]);
    expect(result.current.hasMore).toBe(false);
  });

  it('ignores concurrent loadMore calls and preserves loaded videos on error', async () => {
    mockedUserService.getMyHistory.mockResolvedValueOnce(page([2], 0, 2, false));
    let resolveNext: (value: ReturnType<typeof page>) => void = () => {};
    mockedUserService.getMyHistory.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveNext = resolve;
      })
    );

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.loadMore();
      void result.current.loadMore();
    });
    expect(result.current.loadingMore).toBe(true);
    await act(async () => {
      resolveNext(page([1], 1, 2, false));
      await first;
    });
    expect(mockedUserService.getMyHistory).toHaveBeenCalledTimes(2);
    expect(result.current.videos.map((v) => v.id)).toEqual([2, 1]);

    mockedUserService.getMyHistory.mockRejectedValueOnce(new Error('Timeout'));
    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.loadMoreError).toBe('Timeout');
    expect(result.current.videos.map((v) => v.id)).toEqual([2, 1]);
  });

  it('clears watch history and handles clear errors', async () => {
    mockedUserService.getMyHistory.mockResolvedValueOnce(page([3, 2], 0, 2, false));
    mockedUserService.clearMyHistory.mockRejectedValueOnce(new Error('Clear failed')).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let cleared = true;
    await act(async () => {
      cleared = await result.current.clearHistory();
    });
    expect(cleared).toBe(false);
    expect(result.current.clearError).toBe('Clear failed');
    expect(result.current.videos).toHaveLength(2);

    await act(async () => {
      cleared = await result.current.clearHistory();
    });
    expect(cleared).toBe(true);
    expect(result.current.clearError).toBeNull();
    expect(result.current.videos).toEqual([]);
    expect(result.current.totalVideos).toBe(0);
    expect(result.current.hasMore).toBe(false);
  });

  it('reports initial load errors and recovers on refresh', async () => {
    mockedUserService.getMyHistory
      .mockRejectedValueOnce(new Error('Server down'))
      .mockResolvedValueOnce(page([1], 0, 1, true));

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Server down');

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.videos.map((v) => v.id)).toEqual([1]);
  });

  it('uses generic messages for non-Error failures', async () => {
    mockedUserService.getMyHistory.mockRejectedValueOnce('boom');

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to load watch history');

    mockedUserService.getMyHistory.mockRejectedValueOnce('boom');
    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.loadMoreError).toBe('Failed to load more history');

    mockedUserService.clearMyHistory.mockRejectedValueOnce('boom');
    await act(async () => {
      await result.current.clearHistory();
    });
    expect(result.current.clearError).toBe('Failed to clear watch history');
  });
});
