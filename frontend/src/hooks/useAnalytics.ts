import { useCallback, useEffect, useState } from 'react';
import { UserAnalytics } from '../types/analytics';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from './useAuth';

export interface UseAnalyticsResult {
  analytics: UserAnalytics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useAnalytics = (): UseAnalyticsResult => {
  const { token, isAuthenticated } = useAuth();
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!isAuthenticated) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getMyAnalytics(token);
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, loading, error, refresh: fetchAnalytics };
};
