import { createContext } from 'react';
import { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  /** Signs in with a JWT issued by the backend outside the login form (Google login callback). */
  loginWithToken: (token: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser?: (updatedUser: User) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
