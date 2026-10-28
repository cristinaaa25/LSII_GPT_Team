import React, { useContext, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CommentSection from './CommentSection';
import VideoEditForm from './VideoEditForm';
import { AuthContext } from '../context/AuthContext';
import { useVideoDetail } from '../hooks/useVideoDetail';
import { getEnv } from '../utils/Env';
import { formatDate, formatViews } from '../utils/format';

const resolveMediaUrl = (value: string | undefined, fallback: string): string => {
  if (!value) return `${getEnv().MEDIA_BASE_URL}/${fallback}`;

  const normalized = value.trim();
  if (/^https?:\/\//i.test(normalized)) return normalized;

  return `${getEnv().MEDIA_BASE_URL}/${normalized.replace(/^\//, '')}`;
};

const VideoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { video, loading, error, notFound, registerView, replaceVideo } = useVideoDetail(id);
  const currentUser = useContext(AuthContext)?.user ?? null;
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const videoSrc = resolveMediaUrl(video?.videoUrl, `${id}.mp4`);
  const posterSrc = resolveMediaUrl(video?.thumbnailUrl, `${id}.webp`);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5" role="status" aria-label="Loading video">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4 text-center" role="alert">
        <h2 className="h4 alert-heading">Could not load video</h2>
        <p className="mb-3">Something went wrong while loading this video. Please try again later.</p>
        <Link to="/" className="btn btn-primary">
          Back to catalog
        </Link>
      </div>
    );
  }

  if (notFound || !video) {
    return (
      <div className="alert alert-warning my-4 text-center" role="alert">
        <h2 className="h4 alert-heading">Video Not Found</h2>
        <p className="mb-3">The video you are looking for does not exist or may have been removed.</p>
        <Link to="/" className="btn btn-primary">
          Back to catalog
        </Link>
      </div>
    );
  }

  const isOwner = currentUser !== null && currentUser.username === video.author;

  return (
    <article className="video-detail-page">
      <div className="ratio ratio-16x9 bg-black rounded shadow-sm overflow-hidden mb-3">
        <video
          controls
          src={videoSrc}
          poster={posterSrc}
          onPlay={registerView}
          className="w-100 h-100"
          aria-label={video.title}
          autoPlay={true}
        >
          Your browser does not support HTML5 video playback.
        </video>
      </div>

      {saved && !editing && (
        <div className="alert alert-success alert-dismissible" role="status">
          Changes saved.
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setSaved(false)} />
        </div>
      )}

      <header className="mb-3">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <h1 className="h3 mb-2">{video.title}</h1>
          {isOwner && !editing && video.id !== undefined && (
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => {
                setSaved(false);
                setEditing(true);
              }}
            >
              Edit
            </button>
          )}
        </div>
        <div className="d-flex flex-wrap justify-content-between align-items-center border-bottom pb-3 text-body-secondary small">
          <div className="d-flex align-items-center gap-3">
            <span className="fw-bold text-body">{video.author}</span>
            <span>{formatViews(video.views)}</span>
            {video.uploadDate && <span>Uploaded on {formatDate(video.uploadDate)}</span>}
          </div>
          <div>
            <span className="badge bg-secondary">{video.likes} likes</span>
          </div>
        </div>
      </header>

      {editing && video.id !== undefined && (
        <VideoEditForm
          video={{ ...video, id: video.id }}
          onSaved={(updated) => {
            replaceVideo(updated);
            setEditing(false);
            setSaved(true);
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {video.categories && video.categories.length > 0 && (
        <div className="mb-2">
          <span className="text-body-secondary small me-2">Categories:</span>
          {video.categories.map((cat) => (
            <span key={cat} className="badge bg-primary-subtle text-primary-emphasis me-1">
              {cat}
            </span>
          ))}
        </div>
      )}

      {video.tags && video.tags.length > 0 && (
        <div className="mb-3">
          <span className="text-body-secondary small me-2">Tags:</span>
          {video.tags.map((tag) => (
            <span key={tag} className="badge bg-secondary-subtle text-secondary-emphasis me-1">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {video.description && (
        <section className="card bg-body-tertiary border-0 p-3 mb-4" aria-label="Description">
          <p className="card-text mb-0" style={{ whiteSpace: 'pre-line' }}>
            {video.description}
          </p>
        </section>
      )}

      {video.id !== undefined && <CommentSection videoId={video.id} initialCommentCount={video.commentCount} />}
    </article>
  );
};

export default VideoDetailPage;
