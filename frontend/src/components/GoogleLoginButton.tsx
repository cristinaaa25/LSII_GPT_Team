import React from 'react';
import { getEnv } from '../utils/Env';

/**
 * Starts Google login. It is a full-page link (not an API call): the backend redirects the browser to Google,
 * and Google back to the backend, which finally redirects to /auth/callback with our JWT.
 */
export const GoogleLoginButton: React.FC = () => {
  const href = `${getEnv().API_DOMAIN}/oauth2/authorization/google`;

  return (
    <>
      <div className="d-flex align-items-center my-3 text-muted">
        <hr className="flex-grow-1" />
        <span className="px-2 small">or</span>
        <hr className="flex-grow-1" />
      </div>
      <a href={href} className="btn btn-outline-secondary w-100 py-2 fw-semibold">
        Continue with Google
      </a>
    </>
  );
};

export default GoogleLoginButton;
