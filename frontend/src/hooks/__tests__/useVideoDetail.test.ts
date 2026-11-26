import { act, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { useVideoDetail } from '../useVideoDetail';
import { authService } from '../../services/authService';

jest.mock('axios');
const mockedAxios = axios as unknown as { get: jest.Mock; post: jest.Mock; isAxiosError: jest.Mock };

describe('useVideoDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockedAxios.isAxiosError.mockImplementation((err) => !!err && typeof err === 'object' && 'response' in err);
  });

  it('marks notFound immediately when id is undefined', async () => {
    const { result } = renderHook(() => useVideoDetail(undefined));

    expect(result.current.notFound).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.video).toBeNull();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('fetches and sets video details successfully', async () => {
    const mockDetail = {
      id: 5,
      title: 'Detail Title',
      description: 'Detail desc',
      videoUrl: 'http://video.mp4',
      thumbnailUrl: 'http://thumb.jpg',
      author: 'alice',
      views: 100,
      createdAt: '2026-01-01T00:00:00Z',
      tags: ['tag1'],
      categories: ['cat1'],
      user: { id: 1, username: 'alice', displayName: 'Alice', avatarUrl: null },
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockDetail });

    const { result } = renderHook(() => useVideoDetail('5'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.video).toEqual(mockDetail);
    expect(result.current.notFound).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('marks notFound when API returns 404', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { status: 404 },
    });

    const { result } = renderHook(() => useVideoDetail('999'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(true);
    expect(result.current.video).toBeNull();
  });

  it('sets error when API fails with non-404 error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Server crashed'));

    const { result } = renderHook(() => useVideoDetail('5'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Server crashed');
    expect(result.current.notFound).toBe(false);
  });

  it('registers view only once per page load', async () => {
    const mockDetail = {
      id: 5,
      title: 'Detail Title',
      description: 'Detail desc',
      videoUrl: 'http://video.mp4',
      thumbnailUrl: null,
      author: 'alice',
      views: 10,
      createdAt: '2026-01-01T00:00:00Z',
      tags: [],
      categories: [],
      user: { id: 1, username: 'alice', displayName: 'Alice', avatarUrl: null },
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockDetail });
    mockedAxios.post.mockResolvedValueOnce({});

    const { result } = renderHook(() => useVideoDetail('5'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // First view registration
    await act(async () => {
      await result.current.registerView();
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith('other/videos/5/views', null, { headers: {} });
    expect(result.current.video?.views).toBe(11);

    // Second view registration on same mount does not send another request
    await act(async () => {
      await result.current.registerView();
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('sends the Authorization header when registering a view while logged in', async () => {
    authService.setToken('viewer-jwt');
    const mockDetail = {
      id: 5,
      title: 'Detail Title',
      description: 'Detail desc',
      videoUrl: 'http://video.mp4',
      thumbnailUrl: null,
      author: 'alice',
      views: 10,
      createdAt: '2026-01-01T00:00:00Z',
      tags: [],
      categories: [],
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockDetail });
    mockedAxios.post.mockResolvedValueOnce({});

    const { result } = renderHook(() => useVideoDetail('5'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.registerView();
    });

    expect(mockedAxios.post).toHaveBeenCalledWith('other/videos/5/views', null, {
      headers: { Authorization: 'Bearer viewer-jwt' },
    });
  });

  it('allows replacing video state', async () => {
    const mockDetail = {
      id: 5,
      title: 'Old Title',
      description: 'Old desc',
      videoUrl: 'http://video.mp4',
      thumbnailUrl: null,
      author: 'alice',
      views: 10,
      createdAt: '2026-01-01T00:00:00Z',
      tags: [],
      categories: [],
      user: { id: 1, username: 'alice', displayName: 'Alice', avatarUrl: null },
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockDetail });

    const { result } = renderHook(() => useVideoDetail('5'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.replaceVideo({ ...mockDetail, title: 'Updated Title' });
    });

    expect(result.current.video?.title).toBe('Updated Title');
  });

  it('deduplicates anonymous view when video was already counted in this tab (sessionStorage)', async () => {
    const mockDetail = {
      id: 5,
      title: 'Detail Title',
      description: 'Detail desc',
      videoUrl: 'http://video.mp4',
      thumbnailUrl: null,
      author: 'alice',
      views: 10,
      createdAt: '2026-01-01T00:00:00Z',
      tags: [],
      categories: [],
    };
    mockedAxios.get.mockResolvedValue({ data: mockDetail });
    mockedAxios.post.mockResolvedValue({});

    // First visit in this tab
    const firstRender = renderHook(() => useVideoDetail('5'));
    await waitFor(() => expect(firstRender.result.current.loading).toBe(false));

    await act(async () => {
      await firstRender.result.current.registerView();
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(firstRender.result.current.video?.views).toBe(11);

    // Second visit / page reload in the same tab (remount)
    const secondRender = renderHook(() => useVideoDetail('5'));
    await waitFor(() => expect(secondRender.result.current.loading).toBe(false));

    await act(async () => {
      await secondRender.result.current.registerView();
    });

    // Should NOT post again for anonymous viewer
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(secondRender.result.current.video?.views).toBe(10);
  });

  it('allows different videos to be counted for anonymous viewer in the same tab', async () => {
    const mockDetail5 = { id: 5, title: 'Vid 5', views: 10, tags: [], categories: [] };
    const mockDetail6 = { id: 6, title: 'Vid 6', views: 20, tags: [], categories: [] };
    mockedAxios.get.mockResolvedValueOnce({ data: mockDetail5 }).mockResolvedValueOnce({ data: mockDetail6 });
    mockedAxios.post.mockResolvedValue({});

    const render5 = renderHook(() => useVideoDetail('5'));
    await waitFor(() => expect(render5.result.current.loading).toBe(false));
    await act(async () => {
      await render5.result.current.registerView();
    });

    const render6 = renderHook(() => useVideoDetail('6'));
    await waitFor(() => expect(render6.result.current.loading).toBe(false));
    await act(async () => {
      await render6.result.current.registerView();
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedAxios.post).toHaveBeenNthCalledWith(1, 'other/videos/5/views', null, { headers: {} });
    expect(mockedAxios.post).toHaveBeenNthCalledWith(2, 'other/videos/6/views', null, { headers: {} });
  });

  it('safely handles sessionStorage errors without failing view registration', async () => {
    const mockDetail = { id: 5, title: 'Vid 5', views: 10, tags: [], categories: [] };
    mockedAxios.get.mockResolvedValueOnce({ data: mockDetail });
    mockedAxios.post.mockResolvedValueOnce({});

    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: Access is denied');
    });
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useVideoDetail('5'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.registerView();
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(result.current.video?.views).toBe(11);

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('allows authenticated viewer to post even when video is present in sessionStorage', async () => {
    sessionStorage.setItem('protube_viewed_5', 'true');
    authService.setToken('auth-token');

    const mockDetail = { id: 5, title: 'Vid 5', views: 10, tags: [], categories: [] };
    mockedAxios.get.mockResolvedValueOnce({ data: mockDetail });
    mockedAxios.post.mockResolvedValueOnce({});

    const { result } = renderHook(() => useVideoDetail('5'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.registerView();
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith('other/videos/5/views', null, {
      headers: { Authorization: 'Bearer auth-token' },
    });
  });
});
