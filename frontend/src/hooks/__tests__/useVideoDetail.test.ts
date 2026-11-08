import { act, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { useVideoDetail } from '../useVideoDetail';

jest.mock('axios');
const mockedAxios = axios as unknown as { get: jest.Mock; post: jest.Mock; isAxiosError: jest.Mock };

describe('useVideoDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(result.current.video?.views).toBe(11);

    // Second view registration on same mount does not send another request
    await act(async () => {
      await result.current.registerView();
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
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
});
