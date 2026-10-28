import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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
    expect(screen.queryByRole('link', { name: 'Upload' })).not.toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: 'Upload' })).toHaveAttribute('href', '/upload');
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

  it('submits the trimmed search text to the /search page', () => {
    render(
      <AuthContext.Provider value={createMockAuthContext()}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Header />} />
            <Route path="/search" element={<SearchLocation />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search videos' }), { target: { value: '  cats & dogs ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=cats%20%26%20dogs');
  });

  it('prefills the search box from the current ?q= parameter', () => {
    render(
      <AuthContext.Provider value={createMockAuthContext()}>
        <MemoryRouter initialEntries={['/search?q=cats']}>
          <Header />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByRole('searchbox', { name: 'Search videos' })).toHaveValue('cats');
  });
});

const SearchLocation = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
};
