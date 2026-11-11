import React, { useCallback, useEffect, useState } from 'react';
import { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';
import { authService } from '../services/authService';
import { AuthContext } from './AuthContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(authService.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const storedToken = authService.getToken();
      if (!storedToken) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }
      try {
        const currentUser = await authService.getMe(storedToken);
        if (isMounted) {
          setUser(currentUser);
          setToken(storedToken);
        }
      } catch {
        authService.removeToken();
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await authService.login(payload);
    authService.setToken(res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await authService.register(payload);
    authService.setToken(res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {
      // ignore logout errors so local state is cleared even if server fails
    } finally {
      authService.removeToken();
      setUser(null);
      setToken(null);
    }
  }, []);

  const updateUser = useCallback((updatedUser: User): void => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
