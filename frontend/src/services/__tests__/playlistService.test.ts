import axios from 'axios';
import { authService } from '../authService';
import { extractErrorMessage, playlistService } from '../playlistService';

jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      isAxiosError: actualAxios.isAxiosError,
    },
    isAxiosError: actualAxios.isAxiosError,
  };
});

const mockedGet = axios.get as jest.Mock;
const mockedPost = axios.post as jest.Mock;
const mockedPut = axios.put as jest.Mock;
const mockedDelete = axios.delete as jest.Mock;

describe('playlistService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authService.setToken('jwt-token');
  });

  afterEach(() => {
    authService.removeToken();
  });

  it('fetches my playlists with and without videoId', async () => {
    mockedGet.mockResolvedValue({ data: [] });

    await playlistService.getMyPlaylists();
    expect(mockedGet).toHaveBeenCalledWith('other/users/me/playlists', {
      params: undefined,
      headers: { Authorization: 'Bearer jwt-token' },
    });

    await playlistService.getMyPlaylists(42);
    expect(mockedGet).toHaveBeenCalledWith('other/users/me/playlists', {
      params: { videoId: 42 },
      headers: { Authorization: 'Bearer jwt-token' },
    });
  });

  it('creates, fetches, renames, deletes playlists, and adds/removes videos', async () => {
    mockedPost.mockResolvedValueOnce({ data: { id: 2, name: 'Study' } });
    mockedGet.mockResolvedValueOnce({ data: { id: 2, name: 'Study', videos: [] } });
    mockedPut.mockResolvedValue({ data: { id: 2, name: 'Updated' } });
    mockedDelete.mockResolvedValue({ data: { id: 2, containsVideo: false } });

    await playlistService.createPlaylist('Study');
    expect(mockedPost).toHaveBeenCalledWith(
      'other/users/me/playlists',
      { name: 'Study' },
      { headers: { Authorization: 'Bearer jwt-token' } }
    );

    await playlistService.getPlaylist(2);
    expect(mockedGet).toHaveBeenCalledWith('other/playlists/2', {
      headers: { Authorization: 'Bearer jwt-token' },
    });

    await playlistService.renamePlaylist(2, 'Updated');
    expect(mockedPut).toHaveBeenCalledWith(
      'other/playlists/2',
      { name: 'Updated' },
      { headers: { Authorization: 'Bearer jwt-token' } }
    );

    await playlistService.addVideo(2, 10);
    expect(mockedPut).toHaveBeenCalledWith('other/playlists/2/videos/10', null, {
      headers: { Authorization: 'Bearer jwt-token' },
    });

    await playlistService.removeVideo(2, 10);
    expect(mockedDelete).toHaveBeenCalledWith('other/playlists/2/videos/10', {
      headers: { Authorization: 'Bearer jwt-token' },
    });

    await playlistService.deletePlaylist(2);
    expect(mockedDelete).toHaveBeenCalledWith('other/playlists/2', {
      headers: { Authorization: 'Bearer jwt-token' },
    });
  });

  it('extracts ProblemDetail or Error messages with fallback', () => {
    expect(
      extractErrorMessage({ isAxiosError: true, response: { data: { detail: 'Already exists' } } }, 'Fallback')
    ).toBe('Already exists');
    expect(
      extractErrorMessage({ isAxiosError: true, response: { data: { message: 'Bad request' } } }, 'Fallback')
    ).toBe('Bad request');
    expect(extractErrorMessage(new Error('Boom'), 'Fallback')).toBe('Boom');
    expect(extractErrorMessage('unknown', 'Fallback')).toBe('Fallback');
  });
});
