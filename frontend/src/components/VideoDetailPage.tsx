import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CommentSection from './CommentSection';
import VideoEditForm from './VideoEditForm';
import { AuthContext } from '../context/AuthContext';
import { useVideoDetail } from '../hooks/useVideoDetail';
import { videoService } from '../services/videoService';
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
  const navigate = useNavigate();
  const { video, loading, error, notFound, registerView, replaceVideo } = useVideoDetail(id);
  const currentUser = useContext(AuthContext)?.user ?? null;
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userLiked, setUserLiked] = useState<boolean | null>(null);
  const [likeOffset, setLikeOffset] = useState<number>(0);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setUserLiked(null);
    setLikeOffset(0);
    setLikeError(null);
    setShowDeleteModal(false);
    setDeleteError(null);
  }, [id]);

  const liked = userLiked !== null ? userLiked : Boolean(video?.likedByMe);
  const likeCount = Math.max(0, (video?.likes ?? 0) + likeOffset);

  const handleDeleteVideo = async () => {
    if (!video || video.id === undefined) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await videoService.deleteVideo(video.id);
      setShowDeleteModal(false);
      navigate(`/users/${encodeURIComponent(video.author)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete video';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleLike = async () => {
    if (!video || video.id === undefined) return;
    const prevLiked = liked;
    const prevOffset = likeOffset;

    const newLiked = !prevLiked;
    const newOffset = newLiked ? prevOffset + 1 : prevOffset - 1;

    setUserLiked(newLiked);
    setLikeOffset(newOffset);
    setLikeError(null);

    try {
      if (newLiked) {
        await videoService.likeVideo(video.id);
      } else {
        await videoService.unlikeVideo(video.id);
      }
    } catch (err: unknown) {
      setUserLiked(prevLiked);
      setLikeOffset(prevOffset);
      setLikeError(err instanceof Error ? err.message : 'Failed to update like');
    }
  };
  const videoSrc = resolveMediaUrl(video?.videoUrl, `${id}.mp4`);
  // Uploads without ffmpeg have no thumbnail: no poster rather than guessing a file that does not exist
  const posterSrc = video?.thumbnailUrl ? resolveMediaUrl(video.thumbnailUrl, '') : undefined;

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
            <div className="d-flex gap-2">
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
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => {
                  setDeleteError(null);
                  setShowDeleteModal(true);
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
        <div className="d-flex flex-wrap justify-content-between align-items-center border-bottom pb-3 text-body-secondary small">
          <div className="d-flex align-items-center gap-3">
            <Link to={`/users/${encodeURIComponent(video.author)}`} className="fw-bold text-body text-decoration-none">
              {video.author}
            </Link>
            <span>{formatViews(video.views)}</span>
            {video.uploadDate && <span>Uploaded on {formatDate(video.uploadDate)}</span>}
          </div>
          <div className="d-flex flex-column align-items-end">
            {currentUser ? (
              <button
                type="button"
                className={`btn btn-sm ${liked ? 'btn-primary' : 'btn-outline-secondary'}`}
                aria-pressed={liked}
                onClick={handleToggleLike}
                aria-label={liked ? 'Unlike video' : 'Like video'}
              >
                👍 <span className="badge bg-secondary ms-1">{likeCount} likes</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="btn btn-outline-secondary btn-sm text-decoration-none"
                aria-label="Log in to like"
              >
                👍 <span className="badge bg-secondary ms-1">{likeCount} likes</span>
              </Link>
            )}
            {likeError && (
              <div className="alert alert-danger py-1 px-2 small mt-1 mb-0" role="alert">
                {likeError}
              </div>
            )}
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

      {showDeleteModal && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-video-modal-title"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="delete-video-modal-title">
                    Delete Video
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    disabled={isDeleting}
                    onClick={() => {
                      if (!isDeleting) {
                        setShowDeleteModal(false);
                        setDeleteError(null);
                      }
                    }}
                  />
                </div>
                <div className="modal-body">
                  {deleteError && (
                    <div className="alert alert-danger" role="alert">
                      {deleteError}
                    </div>
                  )}
                  <p className="mb-0">Are you sure you want to delete this video? This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={isDeleting}
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" disabled={isDeleting} onClick={handleDeleteVideo}>
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </article>
  );
};

export default VideoDetailPage;
