import axios from 'axios';
import { getEnv } from '../utils/Env';
import { authService } from './authService';
import { UserAnalytics } from '../types/analytics';

export const analyticsService = {
  getMyAnalytics: async (passedToken?: string | null): Promise<UserAnalytics> => {
    const token = passedToken !== undefined ? passedToken : authService.getToken();
    const res = await axios.get<UserAnalytics>(`${getEnv().API_BASE_URL}/users/me/analytics`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
  },
};
