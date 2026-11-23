import { useCallback, useEffect, useRef, useState } from 'react';
import { Channel } from '../types/user';
import { VideoSummary } from '../types/video';
import { userService } from '../services/userService';

export const FEED_PAGE_SIZE = 12;

interface UseSubscriptionsResult {
  /** Channels the current user follows, most recent subscription first. */
  channels: Channel[];
  /** Feed videos loaded so far, newest first. */
  videos: VideoSummary[];
  totalVideos: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

/** Subscriptions page data: the channel list and the paged feed of their videos. */
export const useSubscriptions = (): UseSubscriptionsResult => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  // Refs so a second click while loading cannot ask for the same page twice
  const nextPage = useRef(0);
  const loadingMoreRef = useRef(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    try {
      const [subscriptions, firstPage] = await Promise.all([
        userService.getMySubscriptions(),
        userService.getMyFeed(0, FEED_PAGE_SIZE),
      ]);
      setChannels(subscriptions);
      setVideos(firstPage.content);
      setTotalVideos(firstPage.totalElements);
      setHasMore(!firstPage.last);
      nextPage.current = 1;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
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
      const page = await userService.getMyFeed(nextPage.current, FEED_PAGE_SIZE);
      nextPage.current += 1;
      // Offset paging can repeat a video if a channel uploaded one meanwhile: skip those already shown
      setVideos((prev) => {
        const seen = new Set(prev.map((v) => v.id));
        return [...prev, ...page.content.filter((v) => !seen.has(v.id))];
      });
      setTotalVideos(page.totalElements);
      setHasMore(!page.last);
    } catch (err) {
      setLoadMoreError(err instanceof Error ? err.message : 'Failed to load more videos');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return {
    channels,
    videos,
    totalVideos,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMoreError,
    loadMore,
    refresh: fetchAll,
  };
};
