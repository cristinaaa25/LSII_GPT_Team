import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlaylists } from '../hooks/usePlaylists';
import { extractErrorMessage } from '../services/playlistService';
import type { PlaylistSummary } from '../types/playlist';

/** Protected page listing the user's private playlists ("Watch later" first) with create/rename/delete. */
export const PlaylistsPage: React.FC = () => {
  const { playlists, loading, error, createPlaylist, renamePlaylist, deletePlaylist, refresh } = usePlaylists();

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PlaylistSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError('Playlist name is required');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createPlaylist(trimmed);
      setNewName('');
    } catch (err) {
      setCreateError(extractErrorMessage(err, 'Failed to create playlist'));
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (playlist: PlaylistSummary) => {
    setEditingId(playlist.id);
    setEditName(playlist.name);
    setActionError(null);
  };

  const handleSaveEdit = async (event: React.FormEvent<HTMLFormElement>, id: number) => {
    event.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed) {
      setActionError('Playlist name is required');
      return;
    }
    setRenaming(true);
    setActionError(null);
    try {
      await renamePlaylist(id, trimmed);
      setEditingId(null);
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Failed to rename playlist'));
    } finally {
      setRenaming(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deletePlaylist(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Failed to delete playlist'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5" role="status" aria-label="Loading playlists">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading playlists...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4 text-center" role="alert">
        <h2 className="h4 alert-heading">Error Loading Playlists</h2>
        <p className="mb-3">{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="playlists-page py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <h1 className="h3 mb-0">Playlists</h1>
        <form className="d-flex gap-2" onSubmit={(e) => void handleCreate(e)} aria-label="Create playlist">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="New playlist name"
            aria-label="New playlist name"
            maxLength={100}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={creating}
          />
          <button type="submit" className="btn btn-primary btn-sm text-nowrap" disabled={creating}>
            {creating ? 'Creating...' : 'New list'}
          </button>
        </form>
      </div>

      {createError && (
        <div className="alert alert-danger py-2" role="alert">
          {createError}
        </div>
      )}

      {actionError && !deleteTarget && (
        <div className="alert alert-danger py-2" role="alert">
          {actionError}
        </div>
      )}

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3" role="list" aria-label="Your playlists">
        {playlists.map((playlist) => (
          <div key={playlist.id} className="col" role="listitem">
            <div className="card h-100 shadow-sm">
              <div className="card-body d-flex flex-column justify-content-between gap-3">
                {editingId === playlist.id ? (
                  <form onSubmit={(e) => void handleSaveEdit(e, playlist.id)} className="d-flex flex-column gap-2">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      aria-label="Rename playlist"
                      maxLength={100}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={renaming}
                      autoFocus
                    />
                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-primary btn-sm" disabled={renaming}>
                        {renaming ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={renaming}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                      <h2 className="h5 card-title mb-0 text-truncate">
                        <Link to={`/playlists/${playlist.id}`} className="text-decoration-none">
                          {playlist.name}
                        </Link>
                      </h2>
                      {playlist.watchLater && (
                        <span className="badge bg-secondary-subtle text-secondary-emphasis">Default</span>
                      )}
                    </div>
                    <p className="card-text text-body-secondary small mb-0">
                      {playlist.videoCount} {playlist.videoCount === 1 ? 'video' : 'videos'}
                    </p>
                  </div>
                )}

                <div className="d-flex justify-content-between align-items-center gap-2">
                  <Link to={`/playlists/${playlist.id}`} className="btn btn-outline-primary btn-sm">
                    Open
                  </Link>
                  {!playlist.watchLater && editingId !== playlist.id && (
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => handleStartEdit(playlist)}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => {
                          setActionError(null);
                          setDeleteTarget(playlist);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-playlist-modal-title"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title h5" id="delete-playlist-modal-title">
                    Delete Playlist
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    disabled={deleting}
                    onClick={() => setDeleteTarget(null)}
                  />
                </div>
                <div className="modal-body">
                  {actionError && (
                    <div className="alert alert-danger" role="alert">
                      {actionError}
                    </div>
                  )}
                  <p className="mb-0">
                    Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={deleting}
                    onClick={() => setDeleteTarget(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={deleting}
                    onClick={() => void handleConfirmDelete()}
                  >
                    {deleting ? 'Deleting...' : 'Confirm delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </div>
  );
};

export default PlaylistsPage;
