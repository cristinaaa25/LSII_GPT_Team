import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHistory } from '../hooks/useHistory';
import VideoCard from './VideoCard';
import { formatTimeAgo } from '../utils/format';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import Icon from './Icon';

/** Protected page: distinct videos watched by the current user, most recent first, with clear-history confirmation. */
export const HistoryPage: React.FC = () => {
  const {
    videos,
    totalVideos,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMoreError,
    clearing,
    clearError,
    loadMore,
    clearHistory,
    refresh,
  } = useHistory();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleConfirmClear = async () => {
    const cleared = await clearHistory();
    if (cleared) {
      setShowConfirmModal(false);
    }
  };

  if (loading) {
    return <Skeleton label="Loading history" variant="cards" />;
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4 text-center" role="alert">
        <h2 className="h4 alert-heading">Error Loading History</h2>
        <p className="mb-3">{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => void refresh()}>
          <Icon name="refresh" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="history-page py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-0">
            Watch History {videos.length > 0 && <span className="text-body-secondary fs-5">({totalVideos})</span>}
          </h1>
        </div>
        {videos.length > 0 && (
          <button type="button" className="btn btn-soft-danger" onClick={() => setShowConfirmModal(true)}>
            <Icon name="trash" />
            Clear history
          </button>
        )}
      </div>

      {videos.length === 0 ? (
        <EmptyState
          message="You have not watched any videos yet."
          illustration="history"
          action={
            <Link to="/" className="btn btn-primary">
              Browse videos
            </Link>
          }
        />
      ) : (
        <section aria-label="Watched videos">
          <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
            {videos.map((video) => {
              const watchedAgo = formatTimeAgo(video.lastViewedAt);
              return (
                <div key={video.id} className="col d-flex flex-column">
                  <VideoCard video={video} />
                  {watchedAgo && <p className="text-body-secondary small mt-1 mb-0">Watched {watchedAgo}</p>}
                </div>
              );
            })}
          </div>

          {loadMoreError && (
            <div className="alert alert-danger mt-3 text-center" role="alert">
              Could not load more history: {loadMoreError}
            </div>
          )}

          {hasMore && (
            <div className="text-center mt-4">
              <button type="button" className="btn btn-soft" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </section>
      )}

      {showConfirmModal && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-history-modal-title"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title h5" id="clear-history-modal-title">
                    Clear Watch History
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    disabled={clearing}
                    onClick={() => setShowConfirmModal(false)}
                  />
                </div>
                <div className="modal-body">
                  {clearError && (
                    <div className="alert alert-danger" role="alert">
                      {clearError}
                    </div>
                  )}
                  <p className="mb-0">
                    Are you sure you want to clear your watch history? This action cannot be undone.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-soft"
                    disabled={clearing}
                    onClick={() => setShowConfirmModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={clearing}
                    onClick={() => void handleConfirmClear()}
                  >
                    {clearing ? 'Clearing...' : 'Confirm clear history'}
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

export default HistoryPage;
