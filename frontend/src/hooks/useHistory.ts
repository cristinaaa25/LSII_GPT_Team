import { useCallback, useEffect, useRef, useState } from 'react';
import { HistoryVideo } from '../types/video';
import { userService } from '../services/userService';

export const HISTORY_PAGE_SIZE = 12;

interface UseHistoryResult {
  /** Distinct watched videos loaded so far, most recent view first. */
  videos: HistoryVideo[];
  totalVideos: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  clearing: boolean;
  clearError: string | null;
  loadMore: () => Promise<void>;
  clearHistory: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

/** Watch history page data: paginated distinct watched videos and clear-history action. */
export const useHistory = (): UseHistoryResult => {
  const [videos, setVideos] = useState<HistoryVideo[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const nextPage = useRef(0);
  const loadingMoreRef = useRef(false);
  const clearingRef = useRef(false);

  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    setClearError(null);
    try {
      const firstPage = await userService.getMyHistory(0, HISTORY_PAGE_SIZE);
      setVideos(firstPage.content);
      setTotalVideos(firstPage.totalElements);
      setHasMore(!firstPage.last);
      nextPage.current = 1;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load watch history');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) {
      return;
    }
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await userService.getMyHistory(nextPage.current, HISTORY_PAGE_SIZE);
      nextPage.current += 1;
      // Offset paging can repeat a video if the user watched another one meanwhile
      setVideos((prev) => {
        const seen = new Set(prev.map((v) => v.id));
        return [...prev, ...page.content.filter((v) => !seen.has(v.id))];
      });
      setTotalVideos(page.totalElements);
      setHasMore(!page.last);
    } catch (err) {
      setLoadMoreError(err instanceof Error ? err.message : 'Failed to load more history');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  const clearHistory = useCallback(async (): Promise<boolean> => {
    if (clearingRef.current) {
      return false;
    }
    clearingRef.current = true;
    setClearing(true);
    setClearError(null);
    try {
      await userService.clearMyHistory();
      setVideos([]);
      setTotalVideos(0);
      setHasMore(false);
      setLoadMoreError(null);
      nextPage.current = 1;
      return true;
    } catch (err) {
      setClearError(err instanceof Error ? err.message : 'Failed to clear watch history');
      return false;
    } finally {
      clearingRef.current = false;
      setClearing(false);
    }
  }, []);

  useEffect(() => {
    void fetchFirstPage();
  }, [fetchFirstPage]);

  return {
    videos,
    totalVideos,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMoreError,
    clearing,
    clearError,
    loadMore,
    clearHistory,
    refresh: fetchFirstPage,
  };
};
