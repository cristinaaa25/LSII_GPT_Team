import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Starts with the current ?q= so the box still shows the query after reloading /search
  const [searchText, setSearchText] = useState(searchParams.get('q') ?? '');

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchText.trim())}`);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : '?';

  return (
    <header className="navbar navbar-expand-lg navbar-dark bg-dark px-4 py-2 shadow-sm">
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2">
          <img
            src="/protube-logo-removebg-preview.png"
            alt="ProTube logo"
            style={{ height: '40px' }}
            className="App-logo"
          />
        </Link>

        <form className="d-flex flex-grow-1 mx-3" role="search" onSubmit={handleSearch} style={{ maxWidth: '520px' }}>
          <input
            type="search"
            className="form-control me-2"
            placeholder="Search videos"
            aria-label="Search videos"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <button type="submit" className="btn btn-outline-light">
            Search
          </button>
        </form>

        <div className="d-flex align-items-center gap-3">
          {isAuthenticated && user ? (
            <div className="dropdown position-relative">
              <button
                type="button"
                className="btn btn-outline-light dropdown-toggle d-flex align-items-center gap-2"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-label="User menu"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="rounded-circle"
                    style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                  />
                ) : (
                  <span
                    className="rounded-circle bg-primary text-white d-inline-flex justify-content-center align-items-center"
                    style={{ width: '28px', height: '28px', fontSize: '14px', fontWeight: 'bold' }}
                  >
                    {userInitial}
                  </span>
                )}
                <span>{user.username}</span>
              </button>

              {dropdownOpen && (
                <ul
                  className="dropdown-menu dropdown-menu-end show position-absolute end-0 mt-2 shadow"
                  style={{ minWidth: '180px' }}
                >
                  <li className="dropdown-item-text">
                    <div className="fw-bold">{user.username}</div>
                    <small className="text-muted">{user.email}</small>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <button type="button" className="dropdown-item text-danger" onClick={handleLogout} role="button">
                      Logout
                    </button>
                  </li>
                </ul>
              )}
            </div>
          ) : (
            <div className="d-flex align-items-center gap-2">
              <Link to="/login" className="btn btn-outline-light btn-sm">
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
