import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CommentSection from './CommentSection';
import VideoEditForm from './VideoEditForm';
import NotFoundPage from './NotFoundPage';
import SubscribeButton from './SubscribeButton';
import SaveToPlaylistDropdown from './SaveToPlaylistDropdown';
import Skeleton from './Skeleton';
import { AuthContext } from '../context/AuthContext';
import { useVideoDetail } from '../hooks/useVideoDetail';
import { useToast } from '../hooks/useToast';
import { videoService } from '../services/videoService';
import { getEnv } from '../utils/Env';
import { formatDate, formatSubscribers, formatViews } from '../utils/format';
import { SubscriptionStatus } from '../types/user';
import Icon from './Icon';
import Avatar from './Avatar';
import VideoPlayer from './VideoPlayer';

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
  const { showToast } = useToast();
  const [userLiked, setUserLiked] = useState<boolean | null>(null);
  const [likeOffset, setLikeOffset] = useState<number>(0);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [likePending, setLikePending] = useState(false);
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

  const handleSubscriptionChange = (status: SubscriptionStatus) => {
    // Ignore a late answer for another author (the user moved to another video meanwhile)
    if (video && status.username === video.author) {
      replaceVideo({
        ...video,
        authorSubscriberCount: status.subscriberCount,
        subscribedByMe: status.subscribedByMe,
      });
    }
  };
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
    // One request at a time: fast clicks could otherwise reach the server out of order
    if (!video || video.id === undefined || likePending) return;
    const prevLiked = liked;
    const prevOffset = likeOffset;

    const newLiked = !prevLiked;
    const newOffset = newLiked ? prevOffset + 1 : prevOffset - 1;

    setUserLiked(newLiked);
    setLikeOffset(newOffset);
    setLikeError(null);
    setLikePending(true);

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
    } finally {
      setLikePending(false);
    }
  };
  const videoSrc = resolveMediaUrl(video?.videoUrl, `${id}.mp4`);
  // Uploads without ffmpeg have no thumbnail: no poster rather than guessing a file that does not exist
  const posterSrc = video?.thumbnailUrl ? resolveMediaUrl(video.thumbnailUrl, '') : undefined;

  if (loading) {
    return <Skeleton label="Loading video" variant="detail" />;
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
      <NotFoundPage
        title="Video Not Found"
        message="The video you are looking for does not exist or may have been removed."
      />
    );
  }

  const isOwner = currentUser !== null && currentUser.username === video.author;

  return (
    <article className="video-detail-page">
      <VideoPlayer src={videoSrc} poster={posterSrc} title={video.title} onPlay={registerView} autoPlay />

      <header className="mb-3">
        <h1 className="h3 mb-3">{video.title}</h1>
        <div className="pt-video-actions">
          {/* Channel: avatar + name + Subscribe, on one centre line */}
          <div className="pt-action-row">
            <div className="d-flex align-items-center gap-2">
              {/* Same destination as the name link: hidden from assistive tech and the tab order */}
              <Link to={`/users/${encodeURIComponent(video.author)}`} tabIndex={-1} aria-hidden="true">
                <Avatar name={video.author} size={40} alt="" />
              </Link>
              <span className="d-flex flex-column lh-sm">
                <Link
                  to={`/users/${encodeURIComponent(video.author)}`}
                  className="fw-semibold text-body text-decoration-none"
                >
                  {video.author}
                </Link>
                <span className="small text-body-secondary">{formatSubscribers(video.authorSubscriberCount ?? 0)}</span>
              </span>
            </div>
            <SubscribeButton
              channel={video.author}
              subscribed={Boolean(video.subscribedByMe)}
              onChange={handleSubscriptionChange}
            />
          </div>

          {/* Actions: Like, Save and (owner) Edit / Delete, all 40px pills */}
          <div className="pt-action-row">
            {currentUser ? (
              <button
                type="button"
                className={`btn ${liked ? 'btn-tint' : 'btn-soft'}`}
                aria-pressed={liked}
                onClick={handleToggleLike}
                disabled={likePending}
                aria-label={liked ? 'Unlike video' : 'Like video'}
              >
                <Icon name="thumbs-up" filled={liked} />
                <span>{likeCount} likes</span>
              </button>
            ) : (
              <Link to="/login" className="btn btn-soft" aria-label="Log in to like">
                <Icon name="thumbs-up" />
                <span>{likeCount} likes</span>
              </Link>
            )}
            {video.id !== undefined && <SaveToPlaylistDropdown videoId={video.id} />}
            {isOwner && !editing && video.id !== undefined && (
              <>
                <button type="button" className="btn btn-soft" onClick={() => setEditing(true)}>
                  <Icon name="pencil" />
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-soft-danger"
                  onClick={() => {
                    setDeleteError(null);
                    setShowDeleteModal(true);
                  }}
                >
                  <Icon name="trash" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
        {likeError && (
          <div className="alert alert-danger py-1 px-2 small mt-2 mb-0" role="alert">
            {likeError}
          </div>
        )}
      </header>

      {editing && video.id !== undefined && (
        <VideoEditForm
          video={{ ...video, id: video.id }}
          onSaved={(updated) => {
            replaceVideo(updated);
            setEditing(false);
            showToast('Changes saved.');
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

      <section className="card bg-body-tertiary border-0 p-3 mb-4" aria-label="Description">
        <p className="fw-semibold small mb-1">
          <span>{formatViews(video.views)}</span>
          {video.uploadDate && <span className="ms-2">Uploaded on {formatDate(video.uploadDate)}</span>}
        </p>
        {video.description && (
          <p className="card-text mb-0" style={{ whiteSpace: 'pre-line' }}>
            {video.description}
          </p>
        )}
      </section>

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
                  <h2 className="modal-title h5" id="delete-video-modal-title">
                    Delete Video
                  </h2>
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
                    className="btn btn-soft"
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
