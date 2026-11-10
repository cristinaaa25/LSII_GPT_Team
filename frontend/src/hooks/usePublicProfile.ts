import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { UserProfile } from '../types/user';
import { VideoSummary } from '../types/video';
import { userService } from '../services/userService';

export const PROFILE_VIDEOS_PAGE_SIZE = 12;

interface UsePublicProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  refresh: () => Promise<void>;
  /** Videos loaded so far, newest first. */
  videos: VideoSummary[];
  /** Total number of videos of the user. */
  totalVideos: number;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  loadMore: () => Promise<void>;
}

export const usePublicProfile = (username: string | undefined): UsePublicProfileResult => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [totalVideos, setTotalVideos] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  // Next page to request; a ref so a second click while loading cannot ask for the same page twice
  const nextPage = useRef(0);
  const loadingMoreRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (!username || !username.trim()) {
      setProfile(null);
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);
    setLoadMoreError(null);

    try {
      const name = username.trim();
      const [data, firstPage] = await Promise.all([
        userService.getPublicProfile(name),
        userService.getPublicVideos(name, 0, PROFILE_VIDEOS_PAGE_SIZE),
      ]);
      setProfile(data);
      setVideos(firstPage.content);
      setTotalVideos(firstPage.totalElements);
      setHasMore(!firstPage.last);
      nextPage.current = 1;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  }, [username]);

  const loadMore = useCallback(async () => {
    if (!username || !username.trim() || loadingMoreRef.current) {
      return;
    }
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await userService.getPublicVideos(username.trim(), nextPage.current, PROFILE_VIDEOS_PAGE_SIZE);
      nextPage.current += 1;
      // Skip videos already shown (offset paging can repeat one if a video was uploaded meanwhile)
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
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    notFound,
    refresh: fetchProfile,
    videos,
    totalVideos,
    hasMore,
    loadingMore,
    loadMoreError,
    loadMore,
  };
};
