import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { extractErrorMessage, playlistService } from '../services/playlistService';
import type { PlaylistDetail } from '../types/playlist';

interface UsePlaylistDetailResult {
  playlist: PlaylistDetail | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  forbidden: boolean;
  removeVideo: (videoId: number) => Promise<void>;
  renamePlaylist: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/** Single private playlist detail with videos (newest added first), rename, and remove-video actions. */
export const usePlaylistDetail = (idParam: string | undefined): UsePlaylistDetailResult => {
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const numericId = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null;

  const refresh = useCallback(async () => {
    if (numericId === null) {
      setPlaylist(null);
      setNotFound(true);
      setForbidden(false);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);
    setForbidden(false);
    try {
      const data = await playlistService.getPlaylist(numericId);
      setPlaylist(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setNotFound(true);
      } else if (axios.isAxiosError(err) && err.response?.status === 403) {
        setForbidden(true);
      } else {
        setError(extractErrorMessage(err, 'Failed to load playlist'));
      }
    } finally {
      setLoading(false);
    }
  }, [numericId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const removeVideo = useCallback(
    async (videoId: number) => {
      if (!playlist) return;
      await playlistService.removeVideo(playlist.id, videoId);
      setPlaylist((prev) =>
        prev
          ? {
              ...prev,
              videos: prev.videos.filter((v) => v.id !== videoId),
            }
          : null
      );
    },
    [playlist]
  );

  const renamePlaylist = useCallback(
    async (name: string) => {
      if (!playlist) return;
      const updated = await playlistService.renamePlaylist(playlist.id, name);
      setPlaylist((prev) => (prev ? { ...prev, name: updated.name } : null));
    },
    [playlist]
  );

  return {
    playlist,
    loading,
    error,
    notFound,
    forbidden,
    removeVideo,
    renamePlaylist,
    refresh,
  };
};
