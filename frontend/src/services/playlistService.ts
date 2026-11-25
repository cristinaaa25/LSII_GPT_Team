import axios from 'axios';
import { getEnv } from '../utils/Env';
import { authService } from './authService';
import type { PlaylistDetail, PlaylistSummary } from '../types/playlist';

const authHeaders = (): Record<string, string> => {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const extractErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { detail?: unknown; message?: unknown } | undefined;
    if (typeof data?.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }
  }
  return err instanceof Error ? err.message : fallback;
};

export const playlistService = {
  getMyPlaylists: async (videoId?: number): Promise<PlaylistSummary[]> => {
    const res = await axios.get<PlaylistSummary[]>(`${getEnv().API_BASE_URL}/users/me/playlists`, {
      params: videoId !== undefined ? { videoId } : undefined,
      headers: authHeaders(),
    });
    return res.data;
  },

  createPlaylist: async (name: string): Promise<PlaylistSummary> => {
    const res = await axios.post<PlaylistSummary>(
      `${getEnv().API_BASE_URL}/users/me/playlists`,
      { name },
      { headers: authHeaders() }
    );
    return res.data;
  },

  getPlaylist: async (id: number): Promise<PlaylistDetail> => {
    const res = await axios.get<PlaylistDetail>(`${getEnv().API_BASE_URL}/playlists/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  renamePlaylist: async (id: number, name: string): Promise<PlaylistSummary> => {
    const res = await axios.put<PlaylistSummary>(
      `${getEnv().API_BASE_URL}/playlists/${id}`,
      { name },
      { headers: authHeaders() }
    );
    return res.data;
  },

  deletePlaylist: async (id: number): Promise<void> => {
    await axios.delete(`${getEnv().API_BASE_URL}/playlists/${id}`, {
      headers: authHeaders(),
    });
  },

  addVideo: async (playlistId: number, videoId: number): Promise<PlaylistSummary> => {
    const res = await axios.put<PlaylistSummary>(
      `${getEnv().API_BASE_URL}/playlists/${playlistId}/videos/${videoId}`,
      null,
      { headers: authHeaders() }
    );
    return res.data;
  },

  removeVideo: async (playlistId: number, videoId: number): Promise<PlaylistSummary> => {
    const res = await axios.delete<PlaylistSummary>(
      `${getEnv().API_BASE_URL}/playlists/${playlistId}/videos/${videoId}`,
      { headers: authHeaders() }
    );
    return res.data;
  },
};
