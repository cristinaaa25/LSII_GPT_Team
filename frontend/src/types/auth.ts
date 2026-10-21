export interface User {
  id: number;
  username: string;
  email: string;
  avatarUrl?: string | null;
  description?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  avatarUrl?: string;
  description?: string;
}
