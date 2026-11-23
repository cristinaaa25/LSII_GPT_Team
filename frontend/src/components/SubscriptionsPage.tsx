import React from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptions } from '../hooks/useSubscriptions';
import VideoCard from './VideoCard';
import { formatSubscribers, resolveAvatarUrl } from '../utils/format';

/** Protected page: the channels the user follows and the newest videos from them. */
export const SubscriptionsPage: React.FC = () => {
  const { channels, videos, totalVideos, loading, error, hasMore, loadingMore, loadMoreError, loadMore, refresh } =
    useSubscriptions();

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5" role="status" aria-label="Loading subscriptions">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading subscriptions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4 text-center" role="alert">
        <h2 className="h4 alert-heading">Error Loading Subscriptions</h2>
        <p className="mb-3">{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="subscriptions-page py-3">
        <h1 className="h3 mb-4">Subscriptions</h1>
        <div className="text-center py-5 text-secondary border rounded bg-light" role="status">
          <p className="mb-3">You are not subscribed to any channel yet.</p>
          <Link to="/" className="btn btn-primary">
            Browse videos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="subscriptions-page py-3">
      <h1 className="h3 mb-4">Subscriptions</h1>

      <section aria-label="Subscribed channels" className="mb-5">
        <h2 className="h5 mb-3">
          Channels <span className="text-secondary fs-6">({channels.length})</span>
        </h2>
        <ul className="list-unstyled d-flex flex-wrap gap-3 mb-0">
          {channels.map((channel) => {
            const avatar = resolveAvatarUrl(channel.avatarUrl);
            return (
              <li key={channel.id}>
                <Link
                  to={`/users/${encodeURIComponent(channel.username)}`}
                  className="card shadow-sm text-decoration-none text-body d-flex flex-row align-items-center gap-2 p-2 pe-3"
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt=""
                      className="rounded-circle"
                      style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                    />
                  ) : (
                    <span
                      className="rounded-circle bg-primary text-white d-inline-flex justify-content-center align-items-center fw-bold"
                      style={{ width: '40px', height: '40px' }}
                      aria-hidden="true"
                    >
                      {channel.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>
                    <span className="d-block fw-semibold">{channel.displayName || channel.username}</span>
                    <small className="text-secondary">{formatSubscribers(channel.subscriberCount)}</small>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Subscription feed">
        <h2 className="h5 mb-3">
          Latest videos <span className="text-secondary fs-6">({totalVideos})</span>
        </h2>

        {videos.length === 0 ? (
          <div className="text-center py-5 text-secondary border rounded bg-light" role="status">
            <p className="mb-0">Your channels have not uploaded any videos yet.</p>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
            {videos.map((video) => (
              <div key={video.id} className="col">
                <VideoCard video={video} />
              </div>
            ))}
          </div>
        )}

        {loadMoreError && (
          <div className="alert alert-danger mt-3 text-center" role="alert">
            Could not load more videos: {loadMoreError}
          </div>
        )}

        {hasMore && (
          <div className="text-center mt-4">
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => void loadMore()}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default SubscriptionsPage;
