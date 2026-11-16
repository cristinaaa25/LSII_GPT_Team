import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getEnv } from '../utils/Env';
import type { Page, VideoSummary } from '../types/video';

export const DEFAULT_PAGE_SIZE = 12;

/**
 * Loads the video catalog page by page; call `loadMore` to append the next page.
 * Supports filtering by category and sorting by newest, oldest, views, likes.
 * With a `query` it loads ranked search results instead.
 * Changing category, sort or query restarts pagination from page 0.
 */
export function useVideos(pageSize = DEFAULT_PAGE_SIZE, query?: string, category?: string, sort?: string) {
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [nextPage, setNextPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const buildParams = useCallback(
    (page: number) => {
      const params: Record<string, unknown> = { page, size: pageSize };
      if (category && category.trim()) {
        params.category = category.trim();
      }
      if (sort && sort.trim()) {
        params.sort = sort.trim();
      }
      return params;
    },
    [category, pageSize, sort]
  );

  useEffect(() => {
    let ignore = false;
    inFlight.current = false;
    setVideos([]);
    setNextPage(0);
    setHasMore(true);
    setLoading(true);
    setError(null);

    const loadInitial = async () => {
      try {
        const params = buildParams(0);
        const response =
          query === undefined
            ? await axios.get<Page<VideoSummary>>(`${getEnv().API_BASE_URL}/videos`, { params })
            : await axios.get<Page<VideoSummary>>(`${getEnv().API_BASE_URL}/videos/search`, {
                params: { q: query, page: 0, size: pageSize },
              });

        if (!ignore && response?.data) {
          setVideos(response.data.content);
          setNextPage(response.data.page + 1);
          setHasMore(!response.data.last);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!ignore) {
          setError(e instanceof Error ? e.message : 'Unknown error');
          setLoading(false);
        }
      }
    };

    void loadInitial();

    return () => {
      ignore = true;
    };
  }, [buildParams, pageSize, query]);

  const loadMore = useCallback(async () => {
    if (inFlight.current || !hasMore || loading) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(nextPage);
      const response =
        query === undefined
          ? await axios.get<Page<VideoSummary>>(`${getEnv().API_BASE_URL}/videos`, { params })
          : await axios.get<Page<VideoSummary>>(`${getEnv().API_BASE_URL}/videos/search`, {
              params: { q: query, page: nextPage, size: pageSize },
            });
      if (response?.data) {
        setVideos((prev) => [...prev, ...response.data.content]);
        setNextPage(response.data.page + 1);
        setHasMore(!response.data.last);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [buildParams, hasMore, loading, nextPage, pageSize, query]);

  return { videos, loading, error, hasMore, loadMore };
}
