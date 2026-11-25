import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { usePlaylistDetail } from '../hooks/usePlaylistDetail';
import { extractErrorMessage } from '../services/playlistService';
import { formatTimeAgo } from '../utils/format';
import VideoCard from './VideoCard';

/** Protected page showing a private playlist's videos (newest added first) and remove controls. */
export const PlaylistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { playlist, loading, error, notFound, forbidden, removeVideo, renamePlaylist, refresh } = usePlaylistDetail(id);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());

  const handleStartRename = () => {
    if (!playlist) return;
    setEditName(playlist.name);
    setActionError(null);
    setEditing(true);
  };

  const handleRenameSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed) {
      setActionError('Playlist name is required');
      return;
    }
    setRenaming(true);
    setActionError(null);
    try {
      await renamePlaylist(trimmed);
      setEditing(false);
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Failed to rename playlist'));
    } finally {
      setRenaming(false);
    }
  };

  const handleRemoveVideo = async (videoId: number) => {
    if (removingIds.has(videoId)) return;
    setRemovingIds((prev) => new Set(prev).add(videoId));
    setActionError(null);
    try {
      await removeVideo(videoId);
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Failed to remove video from playlist'));
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5" role="status" aria-label="Loading playlist">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading playlist...</span>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="alert alert-danger my-4 text-center" role="alert">
        <h2 className="h4 alert-heading">Access Denied</h2>
        <p className="mb-3">You do not have permission to view this private playlist.</p>
        <Link to="/playlists" className="btn btn-primary">
          Back to playlists
        </Link>
      </div>
    );
  }

  if (notFound || !playlist) {
    return (
      <div className="alert alert-warning my-4 text-center" role="alert">
        <h2 className="h4 alert-heading">Playlist Not Found</h2>
        <p className="mb-3">The playlist you are looking for does not exist.</p>
        <Link to="/playlists" className="btn btn-primary">
          Back to playlists
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4 text-center" role="alert">
        <h2 className="h4 alert-heading">Error Loading Playlist</h2>
        <p className="mb-3">{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="playlist-detail-page py-3">
      <div className="mb-3">
        <Link to="/playlists" className="text-decoration-none small">
          &larr; Back to playlists
        </Link>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        {editing ? (
          <form className="d-flex flex-wrap align-items-center gap-2" onSubmit={(e) => void handleRenameSubmit(e)}>
            <input
              type="text"
              className="form-control form-control-sm"
              aria-label="Playlist name"
              maxLength={100}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={renaming}
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={renaming}>
              {renaming ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={renaming}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="d-flex align-items-center gap-2">
            <h1 className="h3 mb-0">{playlist.name}</h1>
            <span className="text-secondary fs-5">({playlist.videos.length})</span>
            {playlist.watchLater && <span className="badge bg-secondary-subtle text-secondary-emphasis">Default</span>}
          </div>
        )}

        {!playlist.watchLater && !editing && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleStartRename}>
            Rename
          </button>
        )}
      </div>

      {actionError && (
        <div className="alert alert-danger py-2" role="alert">
          {actionError}
        </div>
      )}

      {playlist.videos.length === 0 ? (
        <div className="text-center py-5 text-secondary border rounded bg-light" role="status">
          <p className="mb-3">This playlist has no videos yet.</p>
          <Link to="/" className="btn btn-primary">
            Browse videos
          </Link>
        </div>
      ) : (
        <section aria-label="Playlist videos">
          <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
            {playlist.videos.map((video) => {
              const addedAgo = formatTimeAgo(video.addedAt);
              return (
                <div key={video.id} className="col d-flex flex-column">
                  <VideoCard video={video} />
                  <div className="d-flex justify-content-between align-items-center mt-1 gap-2">
                    <span className="text-body-secondary small">{addedAgo ? `Added ${addedAgo}` : ''}</span>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      aria-label={`Remove ${video.title} from playlist`}
                      disabled={removingIds.has(video.id)}
                      onClick={() => void handleRemoveVideo(video.id)}
                    >
                      {removingIds.has(video.id) ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default PlaylistDetailPage;
