import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { extractErrorMessage, playlistService } from '../services/playlistService';
import type { PlaylistSummary } from '../types/playlist';
import Icon from './Icon';

interface Props {
  videoId: number;
}

/**
 * "Save" button + dropdown on VideoDetailPage allowing authenticated users to toggle
 * video membership across their private playlists ("Watch later" first) or create a new list.
 */
export const SaveToPlaylistDropdown: React.FC<Props> = ({ videoId }) => {
  const currentUser = useContext(AuthContext)?.user ?? null;
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  // True once the playlists for this video were requested (success or error), so opening does not refetch
  const [fetched, setFetched] = useState(false);
  // Ignores a late answer for a previous video
  const videoIdRef = useRef(videoId);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    videoIdRef.current = videoId;
    setOpen(false);
    setFetched(false);
    setPlaylists([]);
    setLoadError(null);
    setActionError(null);
    setShowNewForm(false);
    setNewName('');
  }, [videoId]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const fetchPlaylists = useCallback(async () => {
    const requestedFor = videoId;
    setLoading(true);
    setLoadError(null);
    setActionError(null);
    try {
      const data = await playlistService.getMyPlaylists(requestedFor);
      if (videoIdRef.current === requestedFor) setPlaylists(Array.isArray(data) ? data : []);
    } catch (err) {
      if (videoIdRef.current === requestedFor) setLoadError(extractErrorMessage(err, 'Failed to load playlists'));
    } finally {
      if (videoIdRef.current === requestedFor) {
        setLoading(false);
        setFetched(true);
      }
    }
  }, [videoId]);

  // Logged-in users: load once per video so the button shows "Saved" straight away
  const isLoggedIn = currentUser !== null;
  useEffect(() => {
    if (isLoggedIn && !fetched && !loading) void fetchPlaylists();
  }, [isLoggedIn, fetched, loading, fetchPlaylists]);

  const saved = playlists.some((playlist) => playlist.containsVideo);

  if (!currentUser) {
    return (
      <Link to="/login" state={{ from: location }} className="btn btn-soft">
        <Icon name="bookmark" />
        Save
      </Link>
    );
  }

  const handleToggleOpen = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !fetched && !loading) {
      void fetchPlaylists();
    }
  };

  const handleTogglePlaylist = async (playlist: PlaylistSummary) => {
    if (togglingIds.has(playlist.id)) return;
    setTogglingIds((prev) => new Set(prev).add(playlist.id));
    setActionError(null);
    try {
      const updated = playlist.containsVideo
        ? await playlistService.removeVideo(playlist.id, videoId)
        : await playlistService.addVideo(playlist.id, videoId);
      setPlaylists((prev) => prev.map((pl) => (pl.id === playlist.id ? updated : pl)));
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Failed to update playlist'));
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(playlist.id);
        return next;
      });
    }
  };

  const handleCreatePlaylist = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setActionError('Playlist name is required');
      return;
    }
    setCreating(true);
    setActionError(null);
    try {
      const created = await playlistService.createPlaylist(trimmed);
      const withVideo = await playlistService.addVideo(created.id, videoId);
      setPlaylists((prev) => [...prev, withVideo]);
      setNewName('');
      setShowNewForm(false);
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Failed to create playlist'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="dropdown position-relative" ref={containerRef}>
      <button
        type="button"
        className={`btn ${saved ? 'btn-tint' : 'btn-soft'}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={handleToggleOpen}
        title={saved ? 'Saved in a playlist' : 'Save to a playlist'}
      >
        <Icon name="bookmark" filled={saved} />
        {saved ? 'Saved' : 'Save'}
      </button>

      {open && (
        <div
          className="dropdown-menu show position-absolute end-0 mt-2 p-3 shadow pt-popover"
          style={{ minWidth: '280px', zIndex: 1050 }}
          role="dialog"
          aria-label="Save video to playlist"
        >
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-semibold small">Save to...</span>
            <button
              type="button"
              className="btn-close btn-sm"
              aria-label="Close save menu"
              onClick={() => setOpen(false)}
            />
          </div>

          {loading ? (
            <div className="d-flex align-items-center gap-2 py-2 text-body-secondary small" role="status">
              <div className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
              <span>Loading playlists...</span>
            </div>
          ) : loadError ? (
            <div className="alert alert-danger py-2 px-2 small mb-2" role="alert">
              <div>{loadError}</div>
              <button type="button" className="btn btn-soft-danger btn-sm mt-2" onClick={() => void fetchPlaylists()}>
                <Icon name="refresh" />
                Try again
              </button>
            </div>
          ) : (
            <div className="mb-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
              {playlists.map((playlist) => (
                <div key={playlist.id} className="form-check mb-1">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={`save-playlist-${playlist.id}`}
                    checked={playlist.containsVideo}
                    disabled={togglingIds.has(playlist.id)}
                    onChange={() => void handleTogglePlaylist(playlist)}
                  />
                  <label
                    className="form-check-label d-flex justify-content-between align-items-center w-100 small"
                    htmlFor={`save-playlist-${playlist.id}`}
                  >
                    <span className="text-truncate me-2">{playlist.name}</span>
                    <span className="text-body-secondary">{playlist.videoCount}</span>
                  </label>
                </div>
              ))}
            </div>
          )}

          {actionError && (
            <div className="alert alert-danger py-1 px-2 small mb-2" role="alert">
              {actionError}
            </div>
          )}

          <hr className="my-2" />

          {showNewForm ? (
            <form onSubmit={(e) => void handleCreatePlaylist(e)} className="d-flex flex-column gap-2">
              <div className="pt-input-pill pt-input-pill-sm">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Playlist name"
                  aria-label="New playlist name"
                  maxLength={100}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={creating}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>
                  <Icon name="plus" />
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm align-self-end"
                disabled={creating}
                onClick={() => {
                  setShowNewForm(false);
                  setNewName('');
                  setActionError(null);
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn-soft btn-sm w-100"
              onClick={() => {
                setActionError(null);
                setShowNewForm(true);
              }}
            >
              <Icon name="plus" />
              New list
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SaveToPlaylistDropdown;
