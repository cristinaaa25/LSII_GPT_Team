import { act, renderHook, waitFor } from '@testing-library/react';
import { usePlaylistDetail } from '../usePlaylistDetail';
import { playlistService } from '../../services/playlistService';

jest.mock('../../services/playlistService', () => {
  const actual = jest.requireActual('../../services/playlistService');
  return {
    ...actual,
    playlistService: {
      getPlaylist: jest.fn(),
      removeVideo: jest.fn(),
      renamePlaylist: jest.fn(),
    },
  };
});

const mockedService = playlistService as jest.Mocked<typeof playlistService>;

describe('usePlaylistDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads playlist details, renames, and removes videos', async () => {
    mockedService.getPlaylist.mockResolvedValueOnce({
      id: 5,
      name: 'Study',
      watchLater: false,
      createdAt: '2026-11-25T10:00:00Z',
      videos: [
        {
          id: 10,
          title: 'Video 1',
          author: 'alice',
          duration: 60,
          views: 10,
          thumbnail: '10.webp',
          addedAt: '2026-11-25T10:05:00Z',
        },
      ],
    });
    mockedService.renamePlaylist.mockResolvedValueOnce({
      id: 5,
      name: 'Courses',
      watchLater: false,
      videoCount: 1,
      containsVideo: false,
      createdAt: '2026-11-25T10:00:00Z',
    });
    mockedService.removeVideo.mockResolvedValueOnce({
      id: 5,
      name: 'Courses',
      watchLater: false,
      videoCount: 0,
      containsVideo: false,
      createdAt: '2026-11-25T10:00:00Z',
    });

    const { result } = renderHook(() => usePlaylistDetail('5'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.playlist?.name).toBe('Study');

    await act(async () => {
      await result.current.renamePlaylist('Courses');
    });
    expect(result.current.playlist?.name).toBe('Courses');

    await act(async () => {
      await result.current.removeVideo(10);
    });
    expect(result.current.playlist?.videos).toHaveLength(0);
  });

  it('handles invalid ids, 404, and 403 responses', async () => {
    const invalid = renderHook(() => usePlaylistDetail('abc'));
    await waitFor(() => expect(invalid.result.current.loading).toBe(false));
    expect(invalid.result.current.notFound).toBe(true);

    mockedService.getPlaylist.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } });
    const forbidden = renderHook(() => usePlaylistDetail('9'));
    await waitFor(() => expect(forbidden.result.current.loading).toBe(false));
    expect(forbidden.result.current.forbidden).toBe(true);

    mockedService.getPlaylist.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    const missing = renderHook(() => usePlaylistDetail('99'));
    await waitFor(() => expect(missing.result.current.loading).toBe(false));
    expect(missing.result.current.notFound).toBe(true);
  });
});
