import React from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptions } from '../hooks/useSubscriptions';
import VideoCard from './VideoCard';
import { formatSubscribers, resolveAvatarUrl } from '../utils/format';
import Skeleton from './Skeleton';
import Avatar from './Avatar';
import EmptyState from './EmptyState';

/** Protected page: the channels the user follows and the newest videos from them. */
export const SubscriptionsPage: React.FC = () => {
  const { channels, videos, totalVideos, loading, error, hasMore, loadingMore, loadMoreError, loadMore, refresh } =
    useSubscriptions();

  if (loading) {
    return <Skeleton label="Loading subscriptions" variant="cards" />;
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
        <EmptyState
          message="You are not subscribed to any channel yet."
          illustration="people"
          action={
            <Link to="/" className="btn btn-primary">
              Browse videos
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="subscriptions-page py-3">
      <h1 className="h3 mb-4">Subscriptions</h1>

      <section aria-label="Subscribed channels" className="mb-5">
        <h2 className="h5 mb-3">
          Channels <span className="text-body-secondary fs-6">({channels.length})</span>
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
                  <Avatar src={avatar} name={channel.username} size={40} alt="" />
                  <span>
                    <span className="d-block fw-semibold">{channel.displayName || channel.username}</span>
                    <small className="text-body-secondary">{formatSubscribers(channel.subscriberCount)}</small>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Subscription feed">
        <h2 className="h5 mb-3">
          Latest videos <span className="text-body-secondary fs-6">({totalVideos})</span>
        </h2>

        {videos.length === 0 ? (
          <EmptyState message="Your channels have not uploaded any videos yet." illustration="videos" />
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
            <button type="button" className="btn btn-soft" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default SubscriptionsPage;
