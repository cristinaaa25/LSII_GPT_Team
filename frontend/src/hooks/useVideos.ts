import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getEnv } from '../utils/Env';
import type { Page, VideoSummary } from '../types/video';

export const DEFAULT_PAGE_SIZE = 12;

/** Loads the video catalog page by page; call `loadMore` to append the next page. */
export function useVideos(pageSize = DEFAULT_PAGE_SIZE) {
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [nextPage, setNextPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against concurrent requests (scroll events, StrictMode double effects)
  const inFlight = useRef(false);
  const started = useRef(false);

  const loadMore = useCallback(async () => {
    if (inFlight.current || !hasMore) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<Page<VideoSummary>>(`${getEnv().API_BASE_URL}/videos`, {
        params: { page: nextPage, size: pageSize },
      });
      setVideos((prev) => [...prev, ...data.content]);
      setNextPage(data.page + 1);
      setHasMore(!data.last);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [hasMore, nextPage, pageSize]);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      void loadMore();
    }
  }, [loadMore]);

  return { videos, loading, error, hasMore, loadMore };
}
