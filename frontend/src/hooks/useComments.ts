import { useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import type { Comment, CommentLikeResponse, CommentsPage } from '../types/comment';
import { authService } from '../services/authService';
import { getEnv } from '../utils/Env';

interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  totalElements: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  addComment: (text: string) => Promise<Comment>;
  addReply: (commentId: number, text: string) => Promise<Comment>;
  toggleLike: (commentId: number) => Promise<void>;
  reload: () => Promise<void>;
}

export function useComments(videoId: number | string | undefined): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  const authContext = useContext(AuthContext);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = authContext?.token || authService.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [authContext?.token]);

  const fetchComments = useCallback(
    async (targetPage = 0, append = false) => {
      if (!videoId) {
        setLoading(false);
        return;
      }
      if (!append) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await axios.get<CommentsPage>(
          `${getEnv().API_BASE_URL}/videos/${videoId}/comments?page=${targetPage}&size=10`,
          { headers: getAuthHeaders() }
        );
        if (append) {
          setComments((prev) => [...prev, ...res.data.content]);
        } else {
          setComments(res.data.content);
        }
        setPage(res.data.page);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load comments');
      } finally {
        setLoading(false);
      }
    },
    [videoId, getAuthHeaders]
  );

  useEffect(() => {
    fetchComments(0, false);
  }, [fetchComments]);

  const loadMore = useCallback(async () => {
    if (page < totalPages - 1) {
      await fetchComments(page + 1, true);
    }
  }, [fetchComments, page, totalPages]);

  const reload = useCallback(async () => {
    await fetchComments(0, false);
  }, [fetchComments]);

  const addComment = useCallback(
    async (text: string): Promise<Comment> => {
      if (!videoId) throw new Error('Video ID is required');
      const res = await axios.post<Comment>(
        `${getEnv().API_BASE_URL}/videos/${videoId}/comments`,
        { text },
        { headers: getAuthHeaders() }
      );
      setComments((prev) => [res.data, ...prev]);
      setTotalElements((prev) => prev + 1);
      return res.data;
    },
    [videoId, getAuthHeaders]
  );

  const addReply = useCallback(
    async (commentId: number, text: string): Promise<Comment> => {
      const res = await axios.post<Comment>(
        `${getEnv().API_BASE_URL}/comments/${commentId}/replies`,
        { text },
        { headers: getAuthHeaders() }
      );
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            const replies = c.replies ? [...c.replies, res.data] : [res.data];
            return { ...c, replies };
          }
          return c;
        })
      );
      setTotalElements((prev) => prev + 1);
      return res.data;
    },
    [getAuthHeaders]
  );

  const toggleLike = useCallback(
    async (commentId: number): Promise<void> => {
      // Find current like status
      let currentlyLiked = false;
      for (const root of comments) {
        if (root.id === commentId) {
          currentlyLiked = root.likedByMe;
          break;
        }
        if (root.replies) {
          const reply = root.replies.find((r) => r.id === commentId);
          if (reply) {
            currentlyLiked = reply.likedByMe;
            break;
          }
        }
      }

      const url = `${getEnv().API_BASE_URL}/comments/${commentId}/like`;
      const res = currentlyLiked
        ? await axios.delete<CommentLikeResponse>(url, { headers: getAuthHeaders() })
        : await axios.put<CommentLikeResponse>(url, {}, { headers: getAuthHeaders() });

      const { likeCount, likedByMe } = res.data;

      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, likeCount, likedByMe };
          }
          if (c.replies && c.replies.length > 0) {
            const updatedReplies = c.replies.map((r) => (r.id === commentId ? { ...r, likeCount, likedByMe } : r));
            return { ...c, replies: updatedReplies };
          }
          return c;
        })
      );
    },
    [comments, getAuthHeaders]
  );

  return {
    comments,
    loading,
    error,
    totalElements,
    hasMore: page < totalPages - 1,
    loadMore,
    addComment,
    addReply,
    toggleLike,
    reload,
  };
}
