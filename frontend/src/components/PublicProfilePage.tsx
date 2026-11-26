import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicProfile } from '../hooks/usePublicProfile';
import VideoCard from './VideoCard';
import NotFoundPage from './NotFoundPage';
import SubscribeButton from './SubscribeButton';
import { formatSubscribers, resolveAvatarUrl } from '../utils/format';
import Skeleton from './Skeleton';
import Avatar from './Avatar';
import EmptyState from './EmptyState';

export const PublicProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const {
    profile,
    loading,
    error,
    notFound,
    videos,
    totalVideos,
    hasMore,
    loadingMore,
    loadMoreError,
    loadMore,
    applySubscription,
  } = usePublicProfile(username);

  if (loading) {
    return <Skeleton label="Loading profile" variant="cards" />;
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4 text-center" role="alert">
        <h2 className="h4 alert-heading">Error Loading Profile</h2>
        <p className="mb-3">{error}</p>
        <Link to="/" className="btn btn-primary">
          Back to home
        </Link>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <NotFoundPage title="User Not Found" message={`The user @${username} does not exist or may have been removed.`} />
    );
  }

  const avatar = resolveAvatarUrl(profile.avatarUrl);

  return (
    <div className="public-profile-page py-3">
      {/* Profile Header (Public view, strictly read-only) */}
      <header className="card shadow-sm mb-4" aria-label="User profile">
        <div className="card-body d-flex flex-column flex-sm-row align-items-center gap-4 p-4">
          <div>
            <Avatar src={avatar} name={profile.username} size={96} className="border fs-1" />
          </div>

          <div className="text-center text-sm-start flex-grow-1">
            <h1 className="h3 mb-1">{profile.displayName || profile.username}</h1>
            <div className="text-body-secondary mb-2">
              <span>@{profile.username}</span> · <span>{formatSubscribers(profile.subscriberCount)}</span>
            </div>
            {profile.description ? (
              <p className="mb-0 text-body" style={{ whiteSpace: 'pre-line' }}>
                {profile.description}
              </p>
            ) : (
              <p className="text-body-secondary small fst-italic mb-0">No description provided.</p>
            )}
          </div>

          <div className="text-center">
            <SubscribeButton
              channel={profile.username}
              subscribed={profile.subscribedByMe}
              onChange={applySubscription}
            />
          </div>
        </div>
      </header>

      {/* Videos Section */}
      <section aria-label="User videos">
        <h2 className="h4 mb-3">
          Videos <span className="text-body-secondary fs-6">({totalVideos})</span>
        </h2>

        {videos.length === 0 ? (
          <EmptyState message="No videos uploaded yet." illustration="videos" />
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

export default PublicProfilePage;
