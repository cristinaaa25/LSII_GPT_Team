import type React from 'react';
import { act, fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Header from '../Header';
import { AuthContext, AuthContextType } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeProvider';

// The page needs the app-level provider; wrap every render in it.
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: ThemeProvider });

describe('Header', () => {
  const createMockAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    loginWithToken: jest.fn(),
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
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('link', { name: 'Analytics' })).toHaveAttribute('href', '/analytics');
    expect(screen.getByRole('link', { name: 'Subscriptions' })).toHaveAttribute('href', '/subscriptions');
    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('href', '/history');
    expect(screen.getByRole('link', { name: 'Playlists' })).toHaveAttribute('href', '/playlists');
    expect(screen.getByRole('link', { name: 'Public Profile' })).toHaveAttribute('href', '/users/alice');
    const logoutButton = screen.getByRole('button', { name: /Logout/i });
    expect(logoutButton).toBeInTheDocument();

    // Clicking dropdown link closes the dropdown
    fireEvent.click(screen.getByRole('link', { name: 'Profile' }));
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();

    // Reopen menu and click Analytics
    fireEvent.click(userMenuButton);
    fireEvent.click(screen.getByRole('link', { name: 'Analytics' }));
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();

    // Reopen menu and click Subscriptions
    fireEvent.click(userMenuButton);
    fireEvent.click(screen.getByRole('link', { name: 'Subscriptions' }));
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();

    // Reopen menu and click History
    fireEvent.click(userMenuButton);
    fireEvent.click(screen.getByRole('link', { name: 'History' }));
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();

    // Reopen menu and click Public Profile
    fireEvent.click(userMenuButton);
    fireEvent.click(screen.getByRole('link', { name: 'Public Profile' }));
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();

    // Reopen menu and logout
    fireEvent.click(userMenuButton);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Logout/i }));
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

describe('Header (responsive menu, theme and logo)', () => {
  const authContext: AuthContextType = {
    user: { id: 1, username: 'alice', email: 'alice@example.com', avatarUrl: null },
    token: 't',
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    loginWithToken: jest.fn(),
    logout: jest.fn(),
  };

  const renderHeader = (path = '/') =>
    render(
      <AuthContext.Provider value={authContext}>
        <MemoryRouter initialEntries={[path]}>
          <Header />
          <Routes>
            <Route path="*" element={<SearchLocation />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('collapses the search and actions behind the hamburger button', () => {
    renderHeader();

    const toggler = screen.getByRole('button', { name: 'Toggle navigation' });
    const menu = document.getElementById('main-navigation');
    expect(toggler).toHaveAttribute('aria-controls', 'main-navigation');
    expect(toggler).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveClass('collapse');
    expect(menu).not.toHaveClass('show');

    fireEvent.click(toggler);
    expect(toggler).toHaveAttribute('aria-expanded', 'true');
    expect(menu).toHaveClass('show');

    fireEvent.click(toggler);
    expect(menu).not.toHaveClass('show');
  });

  it('closes the mobile menu after navigating', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
    fireEvent.change(screen.getByPlaceholderText('Search videos'), { target: { value: 'cats' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=cats');
    expect(document.getElementById('main-navigation')).not.toHaveClass('show');
  });

  it('shows the user initial when there is no avatar picture', () => {
    renderHeader();
    expect(screen.getByRole('img', { name: 'alice' })).toHaveTextContent('A');
  });

  it('switches the logo with the theme toggle', () => {
    renderHeader();
    expect(screen.getByRole('img', { name: 'ProTube logo' })).toHaveAttribute('src', '/logo.svg');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(screen.getByRole('img', { name: 'ProTube logo' })).toHaveAttribute('src', '/logo-dark.svg');
    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'dark');
  });

  it('closes the user menu with Escape and with a click outside', () => {
    renderHeader();
    const userMenu = screen.getByRole('button', { name: 'User menu' });

    fireEvent.click(userMenu);
    expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('link', { name: 'History' })).not.toBeInTheDocument();

    fireEvent.click(userMenu);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('link', { name: 'History' })).not.toBeInTheDocument();
  });
});

describe('Header (standard controls)', () => {
  const renderLoggedOut = () =>
    render(
      <AuthContext.Provider
        value={{
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          login: jest.fn(),
          register: jest.fn(),
          loginWithToken: jest.fn(),
          logout: jest.fn(),
        }}
      >
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      </AuthContext.Provider>
    );

  it('uses an icon search button that keeps the accessible name "Search"', () => {
    renderLoggedOut();
    const search = screen.getByRole('search');
    const button = screen.getByRole('button', { name: 'Search' });

    expect(search).toHaveClass('pt-search');
    expect(search).toContainElement(screen.getByRole('searchbox', { name: 'Search videos' }));
    expect(button).toHaveClass('pt-search-btn');
    expect(button).toHaveTextContent('');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('gives every text button in the bar the same shared class and no Bootstrap size class', () => {
    renderLoggedOut();
    for (const name of ['Log In', 'Register']) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveClass('pt-header-btn');
      expect(link).not.toHaveClass('btn-sm');
    }
    expect(screen.getByRole('button', { name: 'Toggle navigation' })).toHaveClass('pt-icon-btn');
    expect(screen.getByRole('button', { name: /switch to/i })).toHaveClass('pt-icon-btn');
  });
});
