import { useCallback, useEffect, useState } from 'react';
import type { CategoryCount } from '../types/video';
import { videoService } from '../services/videoService';

export interface UseCategoriesResult {
  categories: CategoryCount[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCategories(enabled = true): UseCategoriesResult {
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await videoService.getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      void fetchCategories();
    }
  }, [enabled, fetchCategories]);

  return { categories, loading, error, refresh: fetchCategories };
}
