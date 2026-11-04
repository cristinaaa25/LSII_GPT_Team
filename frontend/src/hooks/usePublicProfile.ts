import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { UserProfile } from '../types/user';
import { userService } from '../services/userService';

interface UsePublicProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  refresh: () => Promise<void>;
}

export const usePublicProfile = (username: string | undefined): UsePublicProfileResult => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);

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

    try {
      const data = await userService.getPublicProfile(username.trim());
      setProfile(data);
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

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, notFound, refresh: fetchProfile };
};
