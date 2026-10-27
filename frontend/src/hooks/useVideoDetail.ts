import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import type { VideoDetail } from '../types/video';
import { getEnv } from '../utils/Env';

interface UseVideoDetailReturn {
  video: VideoDetail | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  registerView: () => Promise<void>;
}

export function useVideoDetail(id: string | undefined): UseVideoDetailReturn {
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  // Only the first play on each page load counts as a view (pause/resume must not inflate analytics).
  const viewRegistered = useRef(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let isMounted = true;
    viewRegistered.current = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    axios
      .get<VideoDetail>(`${getEnv().API_BASE_URL}/videos/${id}`)
      .then((res) => {
        if (isMounted) {
          setVideo(res.data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const axiosErr = axios.isAxiosError(err) ? err : null;
        const status = axiosErr?.response?.status ?? (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load video');
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const registerView = useCallback(async () => {
    if (!id || viewRegistered.current) return;
    viewRegistered.current = true;
    try {
      await axios.post(`${getEnv().API_BASE_URL}/videos/${id}/views`);
      setVideo((prev) => (prev ? { ...prev, views: prev.views + 1 } : prev));
    } catch {
      // view registration failure shouldn't disrupt playback
    }
  }, [id]);

  return { video, loading, error, notFound, registerView };
}
