import { act, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { useVideos } from '../useVideos';

jest.mock('axios');
const mockedAxios = axios as unknown as { get: jest.Mock };

describe('useVideos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches initial catalog page when query is not provided', async () => {
    const mockPage = {
      content: [{ id: 1, title: 'Video 1', author: 'user1', duration: 60, views: 10, thumbnail: null }],
      page: 0,
      size: 12,
      totalElements: 1,
      totalPages: 1,
      last: true,
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockPage });

    const { result } = renderHook(() => useVideos(12));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.videos).toHaveLength(1);
    expect(result.current.videos[0].title).toBe('Video 1');
    expect(result.current.hasMore).toBe(false);
    expect(mockedAxios.get).toHaveBeenCalledWith('other/videos', {
      params: { page: 0, size: 12 },
    });
  });

  it('searches videos when query is provided', async () => {
    const mockPage = {
      content: [{ id: 2, title: 'Cat Clip', author: 'user2', duration: 12, views: 5, thumbnail: null }],
      page: 0,
      size: 12,
      totalElements: 1,
      totalPages: 1,
      last: false,
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockPage });

    const { result } = renderHook(() => useVideos(12, 'cat'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.videos).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);
    expect(mockedAxios.get).toHaveBeenCalledWith('other/videos/search', {
      params: { q: 'cat', page: 0, size: 12 },
    });
  });

  it('appends next page on loadMore', async () => {
    const page0 = {
      content: [{ id: 1, title: 'Vid 1', author: 'u1', duration: 10, views: 1, thumbnail: null }],
      page: 0,
      size: 12,
      totalElements: 2,
      totalPages: 2,
      last: false,
    };
    const page1 = {
      content: [{ id: 2, title: 'Vid 2', author: 'u2', duration: 20, views: 2, thumbnail: null }],
      page: 1,
      size: 12,
      totalElements: 2,
      totalPages: 2,
      last: true,
    };
    mockedAxios.get.mockResolvedValueOnce({ data: page0 }).mockResolvedValueOnce({ data: page1 });

    const { result } = renderHook(() => useVideos(12));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.videos).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);

    // Calling loadMore again when hasMore is false should return early without request
    await act(async () => {
      await result.current.loadMore();
    });
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it('handles fetch error properly', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useVideos(12));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.videos).toEqual([]);
  });

  it('fetches videos with category and sort parameters', async () => {
    const mockPage = {
      content: [{ id: 10, title: 'Epic Play', author: 'pro', duration: 120, views: 50, thumbnail: null }],
      page: 0,
      size: 12,
      totalElements: 1,
      totalPages: 1,
      last: true,
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockPage });

    const { result } = renderHook(() => useVideos(12, undefined, 'Gaming', 'views'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.videos).toHaveLength(1);
    expect(result.current.videos[0].title).toBe('Epic Play');
    expect(mockedAxios.get).toHaveBeenCalledWith('other/videos', {
      params: { page: 0, size: 12, category: 'Gaming', sort: 'views' },
    });
  });

  it('restarts infinite scroll when category or sort changes', async () => {
    const pageGaming = {
      content: [{ id: 1, title: 'Gaming Vid', author: 'u1', duration: 10, views: 1, thumbnail: null }],
      page: 0,
      size: 12,
      totalElements: 1,
      totalPages: 1,
      last: true,
    };
    const pageMusic = {
      content: [{ id: 2, title: 'Music Track', author: 'u2', duration: 200, views: 99, thumbnail: null }],
      page: 0,
      size: 12,
      totalElements: 1,
      totalPages: 1,
      last: true,
    };
    mockedAxios.get.mockResolvedValueOnce({ data: pageGaming }).mockResolvedValueOnce({ data: pageMusic });

    let currentCategory = 'Gaming';
    const { result, rerender } = renderHook(() => useVideos(12, undefined, currentCategory, 'newest'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.videos[0].title).toBe('Gaming Vid');

    // Change category
    currentCategory = 'Music';
    rerender();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.videos[0].title).toBe('Music Track');
    expect(mockedAxios.get).toHaveBeenLastCalledWith('other/videos', {
      params: { page: 0, size: 12, category: 'Music', sort: 'newest' },
    });
  });
});
