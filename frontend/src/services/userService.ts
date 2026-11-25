import axios from 'axios';
import { getEnv } from '../utils/Env';
import { authService } from './authService';
import { User } from '../types/auth';
import { Channel, SubscriptionStatus, UpdateProfilePayload, UserProfile } from '../types/user';
import { Page, VideoSummary } from '../types/video';

/** Authorization header with the stored token, or no header at all when logged out. */
const authHeaders = (): Record<string, string> => {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const userPath = (username: string) => `${getEnv().API_BASE_URL}/users/${encodeURIComponent(username)}`;

export const userService = {
  /** Public profile. The token (if any) is sent so the backend can fill `subscribedByMe`. */
  getPublicProfile: async (username: string): Promise<UserProfile> => {
    const res = await axios.get<UserProfile>(userPath(username), { headers: authHeaders() });
    return res.data;
  },

  /** One page of a user's videos, newest first (public, same shape as /api/videos). */
  getPublicVideos: async (username: string, page: number, size: number): Promise<Page<VideoSummary>> => {
    const res = await axios.get<Page<VideoSummary>>(`${userPath(username)}/videos`, { params: { page, size } });
    return res.data;
  },

  getMyProfile: async (): Promise<User> => {
    const res = await axios.get<User>(`${getEnv().API_BASE_URL}/users/me`, { headers: authHeaders() });
    return res.data;
  },

  updateMyProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    const res = await axios.put<User>(`${getEnv().API_BASE_URL}/users/me`, payload, { headers: authHeaders() });
    return res.data;
  },

  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await axios.post<User>(`${getEnv().API_BASE_URL}/users/me/avatar`, formData, {
      headers: {
        ...authHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  /** Subscribe to a channel (idempotent). */
  subscribe: async (username: string): Promise<SubscriptionStatus> => {
    const res = await axios.put<SubscriptionStatus>(`${userPath(username)}/subscription`, null, {
      headers: authHeaders(),
    });
    return res.data;
  },

  /** Unsubscribe from a channel (idempotent). */
  unsubscribe: async (username: string): Promise<SubscriptionStatus> => {
    const res = await axios.delete<SubscriptionStatus>(`${userPath(username)}/subscription`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  /** Channels the current user is subscribed to, most recent subscription first. */
  getMySubscriptions: async (): Promise<Channel[]> => {
    const res = await axios.get<Channel[]>(`${getEnv().API_BASE_URL}/users/me/subscriptions`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  /** One page of the subscription feed, newest first. */
  getMyFeed: async (page: number, size: number): Promise<Page<VideoSummary>> => {
    const res = await axios.get<Page<VideoSummary>>(`${getEnv().API_BASE_URL}/users/me/feed`, {
      params: { page, size },
      headers: authHeaders(),
    });
    return res.data;
  },
};
