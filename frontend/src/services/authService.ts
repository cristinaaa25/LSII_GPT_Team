import axios from 'axios';
import { getEnv } from '../utils/Env';
import { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';

const TOKEN_KEY = 'protube_token';

export const authService = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore
    }
  },

  removeToken: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await axios.post<AuthResponse>(`${getEnv().API_BASE_URL}/auth/register`, payload);
    return res.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await axios.post<AuthResponse>(`${getEnv().API_BASE_URL}/auth/login`, payload);
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      const token = authService.getToken();
      await axios.post(
        `${getEnv().API_BASE_URL}/auth/logout`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
    } finally {
      authService.removeToken();
    }
  },

  getMe: async (token?: string | null): Promise<User> => {
    const activeToken = token || authService.getToken();
    const res = await axios.get<User>(`${getEnv().API_BASE_URL}/auth/me`, {
      headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
    });
    return res.data;
  },
};
