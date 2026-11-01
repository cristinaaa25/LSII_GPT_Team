import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicProfile } from '../hooks/usePublicProfile';
import VideoCard from './VideoCard';
import { resolveAvatarUrl } from '../utils/format';

export const PublicProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { profile, loading, error, notFound } = usePublicProfile(username);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5" role="status" aria-label="Loading profile">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading profile...</span>
        </div>
      </div>
    );
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
      <div className="alert alert-warning my-4 text-center" role="alert">
        <h2 className="h4 alert-heading">User Not Found</h2>
        <p className="mb-3">The user @{username} does not exist or may have been removed.</p>
        <Link to="/" className="btn btn-primary">
          Back to home
        </Link>
      </div>
    );
  }

  const avatar = resolveAvatarUrl(profile.avatarUrl);
  const initial = profile.username.charAt(0).toUpperCase();

  return (
    <div className="public-profile-page py-3">
      {/* Profile Header (Public view, strictly read-only) */}
      <header className="card shadow-sm mb-4" aria-label="User profile">
        <div className="card-body d-flex flex-column flex-sm-row align-items-center gap-4 p-4">
          <div>
            {avatar ? (
              <img
                src={avatar}
                alt={profile.username}
                className="rounded-circle border"
                style={{ width: '96px', height: '96px', objectFit: 'cover' }}
              />
            ) : (
              <span
                className="rounded-circle bg-primary text-white d-inline-flex justify-content-center align-items-center fs-1 fw-bold"
                style={{ width: '96px', height: '96px' }}
              >
                {initial}
              </span>
            )}
          </div>

          <div className="text-center text-sm-start flex-grow-1">
            <h1 className="h3 mb-1">{profile.displayName || profile.username}</h1>
            <div className="text-secondary mb-2">@{profile.username}</div>
            {profile.description ? (
              <p className="mb-0 text-body" style={{ whiteSpace: 'pre-line' }}>
                {profile.description}
              </p>
            ) : (
              <p className="text-secondary small fst-italic mb-0">No description provided.</p>
            )}
          </div>
        </div>
      </header>

      {/* Videos Section */}
      <section aria-label="User videos">
        <h2 className="h4 mb-3">
          Videos <span className="text-secondary fs-6">({profile.videos.length})</span>
        </h2>

        {profile.videos.length === 0 ? (
          <div className="text-center py-5 text-secondary border rounded bg-light" role="status">
            <p className="mb-0">No videos uploaded yet.</p>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
            {profile.videos.map((video) => (
              <div key={video.id} className="col">
                <VideoCard video={video} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PublicProfilePage;
