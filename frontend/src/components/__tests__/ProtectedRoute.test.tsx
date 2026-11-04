import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { AuthContext, AuthContextType } from '../../context/AuthContext';

describe('ProtectedRoute', () => {
  const createMockAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  });

  const renderWithContext = (authContextValue: AuthContextType) => {
    return render(
      <AuthContext.Provider value={authContextValue}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Secret Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('renders loading spinner while authentication state is initializing', () => {
    const authContext = createMockAuthContext({ isLoading: true });
    renderWithContext(authContext);

    expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
    expect(screen.queryByText('Secret Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    const authContext = createMockAuthContext({ isAuthenticated: false, isLoading: false });
    renderWithContext(authContext);

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    const authContext = createMockAuthContext({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: 'alice', email: 'alice@example.com' },
    });
    renderWithContext(authContext);

    expect(screen.getByText('Secret Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
