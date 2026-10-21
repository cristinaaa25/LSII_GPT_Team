import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [description, setDescription] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please provide a valid email address');
      return;
    }

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        username: trimmedUsername,
        email: trimmedEmail,
        password,
        avatarUrl: avatarUrl.trim() || undefined,
        description: description.trim() || undefined,
      });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { detail?: string; message?: string } } }).response;
        setError(res?.data?.detail || res?.data?.message || 'Registration failed');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Registration failed. Please check your details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="card-title text-center mb-4">Create Your ProTube Account</h2>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">
                    Username <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username (min 3 chars)"
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email address <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Password <span className="text-danger">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="avatarUrl" className="form-label">
                    Avatar URL <span className="text-muted">(optional)</span>
                  </label>
                  <input
                    type="url"
                    className="form-control"
                    id="avatarUrl"
                    name="avatarUrl"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    disabled={isLoading}
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="description" className="form-label">
                    Bio / Description <span className="text-muted">(optional)</span>
                  </label>
                  <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us a bit about yourself"
                    disabled={isLoading}
                  />
                </div>

                <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Register'}
                </button>
              </form>

              <div className="text-center mt-3">
                <span className="text-muted">Already have an account? </span>
                <Link to="/login">Log In</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
