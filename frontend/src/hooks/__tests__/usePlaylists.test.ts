import { act, renderHook, waitFor } from '@testing-library/react';
import { usePlaylists } from '../usePlaylists';
import { playlistService } from '../../services/playlistService';

jest.mock('../../services/playlistService', () => {
  const actual = jest.requireActual('../../services/playlistService');
  return {
    ...actual,
    playlistService: {
      getMyPlaylists: jest.fn(),
      createPlaylist: jest.fn(),
      renamePlaylist: jest.fn(),
      deletePlaylist: jest.fn(),
    },
  };
});

const mockedService = playlistService as jest.Mocked<typeof playlistService>;

describe('usePlaylists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads playlists and supports create, rename, and delete', async () => {
    mockedService.getMyPlaylists.mockResolvedValueOnce([
      {
        id: 1,
        name: 'Watch later',
        watchLater: true,
        videoCount: 1,
        containsVideo: false,
        createdAt: '2026-11-24T10:00:00Z',
      },
    ]);
    mockedService.createPlaylist.mockResolvedValueOnce({
      id: 2,
      name: 'Study',
      watchLater: false,
      videoCount: 0,
      containsVideo: false,
      createdAt: '2026-11-25T10:00:00Z',
    });
    mockedService.renamePlaylist.mockResolvedValueOnce({
      id: 2,
      name: 'Work',
      watchLater: false,
      videoCount: 0,
      containsVideo: false,
      createdAt: '2026-11-25T10:00:00Z',
    });
    mockedService.deletePlaylist.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => usePlaylists());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.playlists).toHaveLength(1);

    await act(async () => {
      await result.current.createPlaylist('Study');
    });
    expect(result.current.playlists.map((p) => p.name)).toEqual(['Watch later', 'Study']);

    await act(async () => {
      await result.current.renamePlaylist(2, 'Work');
    });
    expect(result.current.playlists.map((p) => p.name)).toEqual(['Watch later', 'Work']);

    await act(async () => {
      await result.current.deletePlaylist(2);
    });
    expect(result.current.playlists.map((p) => p.name)).toEqual(['Watch later']);
  });

  it('exposes load errors', async () => {
    mockedService.getMyPlaylists.mockRejectedValueOnce(new Error('Network down'));

    const { result } = renderHook(() => usePlaylists());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network down');
  });
});
