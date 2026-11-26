import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { resolveAvatarUrl } from '../utils/format';
import Avatar from './Avatar';
import ThemeToggle from './ThemeToggle';

const USER_MENU_LINKS = [
  { to: '/profile', label: 'Profile' },
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/history', label: 'History' },
  { to: '/playlists', label: 'Playlists' },
  { to: '/analytics', label: 'Analytics' },
];

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Mobile (< lg): the search and the actions collapse behind the hamburger button
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Starts with the current ?q= so the box still shows the query after reloading /search
  const [searchText, setSearchText] = useState(searchParams.get('q') ?? '');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close both menus after navigating to another page
  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname, location.search]);

  // Close the user menu with Escape or a click outside it
  useEffect(() => {
    if (!dropdownOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDropdownOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [dropdownOpen]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchText.trim())}`);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const displayName = user ? user.displayName || user.username : '';

  return (
    <header className="navbar navbar-expand-lg pt-header sticky-top">
      <nav className="container-fluid pt-header-bar" aria-label="Main">
        <Link to="/" className="navbar-brand d-flex align-items-center py-0 me-0" aria-label="ProTube home">
          <img
            src={theme === 'dark' ? '/logo-dark.svg' : '/logo.svg'}
            alt="ProTube logo"
            className="pt-logo"
            width={150}
            height={36}
          />
        </Link>

        <div className="pt-header-group ms-auto order-lg-last ms-lg-0">
          <ThemeToggle />
          <button
            type="button"
            className="pt-icon-btn d-lg-none"
            aria-controls="main-navigation"
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        <div id="main-navigation" className={`collapse navbar-collapse pt-nav-collapse ${menuOpen ? 'show' : ''}`}>
          <form className="pt-search mx-lg-auto" role="search" onSubmit={handleSearch}>
            <input
              type="search"
              className="form-control pt-search-input"
              placeholder="Search videos"
              aria-label="Search videos"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <button type="submit" className="pt-search-btn" aria-label="Search" title="Search">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </form>

          <div className="pt-header-group">
            {isAuthenticated && user ? (
              <>
                <Link to="/upload" className="btn btn-primary pt-header-btn">
                  Upload
                </Link>
                <div className="dropdown position-relative" ref={dropdownRef}>
                  <button
                    type="button"
                    className="btn pt-header-btn pt-user-btn dropdown-toggle"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                    aria-label="User menu"
                  >
                    <Avatar src={resolveAvatarUrl(user.avatarUrl)} name={user.username} size={28} />
                    <span className="text-truncate" style={{ maxWidth: '10rem' }}>
                      {displayName}
                    </span>
                  </button>

                  {dropdownOpen && (
                    <ul
                      className="dropdown-menu dropdown-menu-end show position-absolute end-0 mt-2 shadow"
                      style={{ minWidth: '200px' }}
                    >
                      <li className="dropdown-item-text">
                        <div className="fw-bold">{displayName}</div>
                        <small className="text-body-secondary">{user.email}</small>
                      </li>
                      <li>
                        <hr className="dropdown-divider" />
                      </li>
                      {USER_MENU_LINKS.map((link) => (
                        <li key={link.to}>
                          <Link to={link.to} className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                            {link.label}
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link
                          to={`/users/${encodeURIComponent(user.username)}`}
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          Public Profile
                        </Link>
                      </li>
                      <li>
                        <hr className="dropdown-divider" />
                      </li>
                      <li>
                        <button type="button" className="dropdown-item text-danger" onClick={handleLogout}>
                          Logout
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline-primary pt-header-btn">
                  Log In
                </Link>
                <Link to="/register" className="btn btn-primary pt-header-btn">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
