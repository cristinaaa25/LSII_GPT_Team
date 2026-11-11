import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AuthCallbackPage from '../AuthCallbackPage';
import { useAuth } from '../../hooks/useAuth';

jest.mock('../../hooks/useAuth');

const mockedUseAuth = useAuth as jest.Mock;

const LoginProbe = () => {
  const { search } = useLocation();
  return <div>Login Page {search}</div>;
};

describe('AuthCallbackPage', () => {
  const loginWithToken = jest.fn();

  beforeEach(() => {
    loginWithToken.mockReset();
    mockedUseAuth.mockReturnValue({ loginWithToken });
  });

  const renderAt = (url: string) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/" element={<div>Home Page Content</div>} />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>
    );

  it('shows a progress message while signing in', () => {
    loginWithToken.mockReturnValue(new Promise(() => {}));

    renderAt('/auth/callback#token=abc.def.ghi');

    expect(screen.getByText(/Signing you in/i)).toBeInTheDocument();
  });

  it('stores the token from the fragment and goes home', async () => {
    loginWithToken.mockResolvedValue({ id: 1, username: 'alice', email: 'alice@gmail.com' });

    renderAt('/auth/callback#token=abc.def.ghi');

    expect(await screen.findByText('Home Page Content')).toBeInTheDocument();
    expect(loginWithToken).toHaveBeenCalledTimes(1);
    expect(loginWithToken).toHaveBeenCalledWith('abc.def.ghi');
  });

  it('goes back to login with an error when the fragment has no token', async () => {
    renderAt('/auth/callback');

    expect(await screen.findByText('Login Page ?error=google')).toBeInTheDocument();
    expect(loginWithToken).not.toHaveBeenCalled();
  });

  it('goes back to login with an error when the token is rejected', async () => {
    loginWithToken.mockRejectedValue(new Error('401'));

    renderAt('/auth/callback#token=expired');

    expect(await screen.findByText('Login Page ?error=google')).toBeInTheDocument();
  });
});
