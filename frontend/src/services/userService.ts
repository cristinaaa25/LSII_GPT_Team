import axios from 'axios';
import { getEnv } from '../utils/Env';
import { authService } from './authService';
import { User } from '../types/auth';
import { UpdateProfilePayload, UserProfile } from '../types/user';

export const userService = {
  getPublicProfile: async (username: string): Promise<UserProfile> => {
    const res = await axios.get<UserProfile>(`${getEnv().API_BASE_URL}/users/${encodeURIComponent(username)}`);
    return res.data;
  },

  getMyProfile: async (): Promise<User> => {
    const token = authService.getToken();
    const res = await axios.get<User>(`${getEnv().API_BASE_URL}/users/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
  },

  updateMyProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    const token = authService.getToken();
    const res = await axios.put<User>(`${getEnv().API_BASE_URL}/users/me`, payload, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
  },

  uploadAvatar: async (file: File): Promise<User> => {
    const token = authService.getToken();
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await axios.post<User>(`${getEnv().API_BASE_URL}/users/me/avatar`, formData, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};
