import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useComments } from '../hooks/useComments';
import { formatDate } from '../utils/format';

export interface CommentSectionProps {
  videoId: number | undefined;
  initialCommentCount?: number;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ videoId, initialCommentCount }) => {
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const currentUsername = authContext?.user?.username;
  const {
    comments,
    loading,
    error,
    totalElements,
    addedCount,
    hasMore,
    loadMore,
    addComment,
    addReply,
    editComment,
    deleteComment,
    toggleLike,
  } = useComments(videoId);

  const [newCommentText, setNewCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const handleStartEdit = (id: number, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
    setEditError(null);
    setReplyingToId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent, commentId: number) => {
    e.preventDefault();
    if (!editText.trim()) return;

    setEditSubmitting(true);
    setEditError(null);
    try {
      await editComment(commentId, editText.trim());
      setEditingId(null);
      setEditText('');
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handlePromptDelete = (commentId: number) => {
    setDeletingCommentId(commentId);
    setDeleteError(null);
  };

  const handleCancelDelete = () => {
    if (!deleteSubmitting) {
      setDeletingCommentId(null);
      setDeleteError(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingCommentId === null) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await deleteComment(deletingCommentId);
      setDeletingCommentId(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // The video's commentCount includes replies, while totalElements only counts root comments:
  // prefer the former so the heading does not change once the first page loads
  const displayCount = Math.max(
    0,
    initialCommentCount !== undefined ? initialCommentCount + addedCount : totalElements
  );

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
        {comments.map((comment) => {
          const isAuthor = isAuthenticated && currentUsername === comment.author;
          return (
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

              {editingId === comment.id ? (
                <form onSubmit={(e) => handleEditSubmit(e, comment.id)} className="mb-2" aria-label="Edit comment form">
                  <div className="mb-2">
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={editText}
                      maxLength={2000}
                      onChange={(e) => setEditText(e.target.value)}
                      disabled={editSubmitting}
                      aria-label="Edit comment"
                    />
                  </div>
                  {editError && <div className="alert alert-danger py-1 small">{editError}</div>}
                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleCancelEdit}
                      disabled={editSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={editSubmitting || !editText.trim()}
                    >
                      {editSubmitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="mb-2" style={{ whiteSpace: 'pre-line' }}>
                  {comment.text}
                </p>
              )}

              {editingId !== comment.id && (
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
                        setEditingId(null);
                      }}
                      aria-label={`Reply to comment by ${comment.author}`}
                    >
                      Reply
                    </button>
                  )}

                  {isAuthor && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleStartEdit(comment.id, comment.text)}
                        aria-label={`Edit comment by ${comment.author}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handlePromptDelete(comment.id)}
                        aria-label={`Delete comment by ${comment.author}`}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </footer>
              )}

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
                  {comment.replies.map((reply) => {
                    const isReplyAuthor = isAuthenticated && currentUsername === reply.author;
                    return (
                      <div
                        key={reply.id}
                        className="py-2 border-bottom border-light-subtle last-no-border"
                        aria-label={`Reply by ${reply.author}`}
                      >
                        <div className="d-flex align-items-center mb-1">
                          <span className="fw-semibold me-2 small">{reply.author}</span>
                          <span className="text-body-secondary small">{formatDate(reply.createdAt)}</span>
                        </div>

                        {editingId === reply.id ? (
                          <form
                            onSubmit={(e) => handleEditSubmit(e, reply.id)}
                            className="mb-2"
                            aria-label="Edit reply form"
                          >
                            <div className="mb-2">
                              <textarea
                                className="form-control form-control-sm"
                                rows={2}
                                value={editText}
                                maxLength={2000}
                                onChange={(e) => setEditText(e.target.value)}
                                disabled={editSubmitting}
                                aria-label="Edit reply"
                              />
                            </div>
                            {editError && <div className="alert alert-danger py-1 small">{editError}</div>}
                            <div className="d-flex justify-content-end gap-2">
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleCancelEdit}
                                disabled={editSubmitting}
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="btn btn-primary btn-sm"
                                disabled={editSubmitting || !editText.trim()}
                              >
                                {editSubmitting ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <p className="mb-1 small" style={{ whiteSpace: 'pre-line' }}>
                            {reply.text}
                          </p>
                        )}

                        {editingId !== reply.id && (
                          <div className="d-flex align-items-center gap-2">
                            <button
                              type="button"
                              className={`btn btn-sm py-0 px-2 ${reply.likedByMe ? 'btn-primary' : 'btn-outline-secondary'}`}
                              onClick={() => handleLike(reply.id)}
                              disabled={!isAuthenticated}
                              aria-label={`Like reply by ${reply.author}`}
                            >
                              👍 {reply.likeCount}
                            </button>
                            {isReplyAuthor && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm py-0 px-2 btn-outline-secondary"
                                  onClick={() => handleStartEdit(reply.id, reply.text)}
                                  aria-label={`Edit reply by ${reply.author}`}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm py-0 px-2 btn-outline-danger"
                                  onClick={() => handlePromptDelete(reply.id)}
                                  aria-label={`Delete reply by ${reply.author}`}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {hasMore && (
        <div className="text-center mt-3">
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading...' : 'Load more comments'}
          </button>
        </div>
      )}

      {deletingCommentId !== null && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-comment-modal-title"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="delete-comment-modal-title">
                    Delete Comment
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    disabled={deleteSubmitting}
                    onClick={handleCancelDelete}
                  />
                </div>
                <div className="modal-body">
                  {deleteError && (
                    <div className="alert alert-danger" role="alert">
                      {deleteError}
                    </div>
                  )}
                  <p className="mb-0">Are you sure you want to delete this comment? This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={deleteSubmitting}
                    onClick={handleCancelDelete}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={deleteSubmitting}
                    onClick={handleConfirmDelete}
                  >
                    {deleteSubmitting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </section>
  );
};

export default CommentSection;
