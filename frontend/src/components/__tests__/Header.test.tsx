import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../Header';
import { AuthContext, AuthContextType } from '../../context/AuthContext';

describe('Header', () => {
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

  it('renders logo and login/register links when unauthenticated', () => {
    const authContext = createMockAuthContext({ isAuthenticated: false, user: null });

    render(
      <AuthContext.Provider value={authContext}>
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByRole('img', { name: 'ProTube logo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log In' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
    expect(screen.queryByLabelText('User menu')).not.toBeInTheDocument();
  });

  it('renders user menu with username and avatar when authenticated', () => {
    const authContext = createMockAuthContext({
      isAuthenticated: true,
      user: {
        id: 1,
        username: 'alice',
        email: 'alice@example.com',
        avatarUrl: 'http://avatar.jpg',
      },
    });

    render(
      <AuthContext.Provider value={authContext}>
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByRole('img', { name: 'alice' })).toHaveAttribute('src', 'http://avatar.jpg');
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Log In' })).not.toBeInTheDocument();
  });

  it('opens dropdown menu and handles logout when clicked', async () => {
    const mockLogout = jest.fn().mockResolvedValue(undefined);
    const authContext = createMockAuthContext({
      isAuthenticated: true,
      user: {
        id: 1,
        username: 'alice',
        email: 'alice@example.com',
        avatarUrl: null,
      },
      logout: mockLogout,
    });

    render(
      <AuthContext.Provider value={authContext}>
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    // Initial avatar shows first letter
    expect(screen.getByText('A')).toBeInTheDocument();

    const userMenuButton = screen.getByLabelText('User menu');
    fireEvent.click(userMenuButton);

    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    const logoutButton = screen.getByRole('button', { name: /Logout/i });
    expect(logoutButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(logoutButton);
    });
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
