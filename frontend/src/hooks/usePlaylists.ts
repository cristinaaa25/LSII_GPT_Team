import { useCallback, useEffect, useState } from 'react';
import { extractErrorMessage, playlistService } from '../services/playlistService';
import type { PlaylistSummary } from '../types/playlist';

interface UsePlaylistsResult {
  playlists: PlaylistSummary[];
  loading: boolean;
  error: string | null;
  createPlaylist: (name: string) => Promise<PlaylistSummary>;
  renamePlaylist: (id: number, name: string) => Promise<PlaylistSummary>;
  deletePlaylist: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

/** Current user's playlists ("Watch later" first) with create, rename, and delete actions. */
export const usePlaylists = (): UsePlaylistsResult => {
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await playlistService.getMyPlaylists();
      setPlaylists(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load playlists'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createPlaylist = useCallback(async (name: string): Promise<PlaylistSummary> => {
    const created = await playlistService.createPlaylist(name);
    setPlaylists((prev) => [...prev, created]);
    return created;
  }, []);

  const renamePlaylist = useCallback(async (id: number, name: string): Promise<PlaylistSummary> => {
    const updated = await playlistService.renamePlaylist(id, name);
    setPlaylists((prev) => prev.map((pl) => (pl.id === id ? updated : pl)));
    return updated;
  }, []);

  const deletePlaylist = useCallback(async (id: number): Promise<void> => {
    await playlistService.deletePlaylist(id);
    setPlaylists((prev) => prev.filter((pl) => pl.id !== id));
  }, []);

  return {
    playlists,
    loading,
    error,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    refresh,
  };
};
