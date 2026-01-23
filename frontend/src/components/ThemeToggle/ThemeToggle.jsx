import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';
import './ThemeToggle.scss';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className={`theme-toggle ${className}`}
      onClick={() => toggleTheme()}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="theme-toggle-inner">
        <div className={`theme-icon ${theme === 'dark' ? 'moon' : 'sun'}`}>
          {theme === 'dark' ? (
            <FaMoon className="icon" />
          ) : (
            <FaSun className="icon" />
          )}
        </div>
      </div>
    </button>
  );
};

export default ThemeToggle;
