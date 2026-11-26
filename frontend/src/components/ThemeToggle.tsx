import React from 'react';
import { useTheme } from '../hooks/useTheme';

/** Header button that switches between the light and dark theme. */
const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button type="button" className="pt-icon-btn" onClick={toggleTheme} aria-label={label} title={label}>
      {theme === 'dark' ? (
        <svg className="pt-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg className="pt-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z" />
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;
