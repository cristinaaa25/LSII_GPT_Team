import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useComments } from '../hooks/useComments';
import { formatDate } from '../utils/format';

export interface CommentSectionProps {
  videoId: number | undefined;
  initialCommentCount?: number;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ videoId, initialCommentCount = 0 }) => {
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const { comments, loading, error, totalElements, hasMore, loadMore, addComment, addReply, toggleLike } =
    useComments(videoId);

  const [newCommentText, setNewCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await addComment(newCommentText.trim());
      setNewCommentText('');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent, commentId: number) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setReplySubmitting(true);
    setReplyError(null);
    try {
      await addReply(commentId, replyText.trim());
      setReplyText('');
      setReplyingToId(null);
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : 'Failed to post reply');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleLike = async (commentId: number) => {
    if (!isAuthenticated) return;
    try {
      await toggleLike(commentId);
    } catch {
      // Like errors fail silently
    }
  };

  const displayCount =
    totalElements > 0 ? totalElements : initialCommentCount > 0 ? initialCommentCount : comments.length;

  return (
    <section className="mt-4 pt-3 border-top" aria-label="Comments">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h5 mb-0">Comments ({displayCount})</h2>
      </div>

      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} className="mb-4" aria-label="Add comment form">
          <div className="mb-2">
            <textarea
              className="form-control"
              rows={3}
              placeholder="Add a comment..."
              value={newCommentText}
              maxLength={2000}
              onChange={(e) => setNewCommentText(e.target.value)}
              disabled={submitting}
              aria-label="Add a comment"
            />
          </div>
          {submitError && <div className="alert alert-danger py-2 small">{submitError}</div>}
          <div className="d-flex justify-content-end">
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !newCommentText.trim()}>
              {submitting ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="alert alert-secondary py-3 mb-4 text-center" role="region" aria-label="Log in prompt">
          <span>Please </span>
          <Link to="/login" className="alert-link fw-semibold">
            log in to comment
          </Link>
          <span>.</span>
        </div>
      )}

      {loading && comments.length === 0 && (
        <div className="d-flex justify-content-center py-4" role="status" aria-label="Loading comments">
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Loading comments...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      {!loading && comments.length === 0 && (
        <div className="card p-4 text-center bg-body-tertiary border-secondary-subtle">
          <p className="text-body-secondary mb-0">No comments yet. Be the first to comment!</p>
        </div>
      )}

      <div className="comments-list">
        {comments.map((comment) => (
          <article
            key={comment.id}
            className="card p-3 mb-3 border-secondary-subtle"
            aria-label={`Comment by ${comment.author}`}
          >
            <header className="d-flex align-items-center justify-content-between mb-2">
              <div>
                <span className="fw-bold me-2">{comment.author}</span>
                <span className="text-body-secondary small">{formatDate(comment.createdAt)}</span>
              </div>
            </header>

            <p className="mb-2" style={{ whiteSpace: 'pre-line' }}>
              {comment.text}
            </p>

            <footer className="d-flex align-items-center gap-2 mb-2">
              <button
                type="button"
                className={`btn btn-sm ${comment.likedByMe ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => handleLike(comment.id)}
                disabled={!isAuthenticated}
                aria-label={`Like comment by ${comment.author}`}
              >
                👍 {comment.likeCount}
              </button>

              {isAuthenticated && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setReplyingToId(replyingToId === comment.id ? null : comment.id);
                    setReplyText('');
                    setReplyError(null);
                  }}
                  aria-label={`Reply to comment by ${comment.author}`}
                >
                  Reply
                </button>
              )}
            </footer>

            {replyingToId === comment.id && (
              <form
                onSubmit={(e) => handleReplySubmit(e, comment.id)}
                className="ms-3 mt-2 mb-3"
                aria-label="Reply form"
              >
                <div className="mb-2">
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    placeholder="Write a reply..."
                    value={replyText}
                    maxLength={2000}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={replySubmitting}
                    aria-label="Write a reply"
                  />
                </div>
                {replyError && <div className="alert alert-danger py-1 small">{replyError}</div>}
                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setReplyingToId(null);
                      setReplyText('');
                    }}
                    disabled={replySubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={replySubmitting || !replyText.trim()}
                  >
                    {replySubmitting ? 'Replying...' : 'Reply'}
                  </button>
                </div>
              </form>
            )}

            {comment.replies && comment.replies.length > 0 && (
              <div className="ms-4 ps-3 border-start mt-2" aria-label="Replies">
                {comment.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="py-2 border-bottom border-light-subtle last-no-border"
                    aria-label={`Reply by ${reply.author}`}
                  >
                    <div className="d-flex align-items-center mb-1">
                      <span className="fw-semibold me-2 small">{reply.author}</span>
                      <span className="text-body-secondary small">{formatDate(reply.createdAt)}</span>
                    </div>
                    <p className="mb-1 small" style={{ whiteSpace: 'pre-line' }}>
                      {reply.text}
                    </p>
                    <div className="d-flex align-items-center">
                      <button
                        type="button"
                        className={`btn btn-sm py-0 px-2 ${reply.likedByMe ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => handleLike(reply.id)}
                        disabled={!isAuthenticated}
                        aria-label={`Like reply by ${reply.author}`}
                      >
                        👍 {reply.likeCount}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-3">
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading...' : 'Load more comments'}
          </button>
        </div>
      )}
    </section>
  );
};

export default CommentSection;
