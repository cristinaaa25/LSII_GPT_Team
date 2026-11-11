import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Landing page after Google login. The backend sends our JWT in the URL fragment (/auth/callback#token=...),
 * which browsers never send to servers. The token is validated with /me, stored through AuthProvider, and the
 * page is replaced in the history so the token does not stay in the address bar or the back button.
 */
export const AuthCallbackPage: React.FC = () => {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const handled = useRef(false);

  useEffect(() => {
    // StrictMode runs effects twice in development: use the token only once
    if (handled.current) {
      return;
    }
    handled.current = true;

    const token = new URLSearchParams(hash.replace(/^#/, '')).get('token');
    if (!token) {
      navigate('/login?error=google', { replace: true });
      return;
    }

    loginWithToken(token)
      .then(() => navigate('/', { replace: true }))
      .catch(() => navigate('/login?error=google', { replace: true }));
  }, [hash, loginWithToken, navigate]);

  return (
    <div className="container py-5 text-center">
      <div className="spinner-border text-primary" role="status" aria-hidden="true" />
      <p className="mt-3 text-muted">Signing you in...</p>
    </div>
  );
};

export default AuthCallbackPage;
