import React, { createContext, useContext, useState, useEffect } from 'react';
import { getVariable, setVariable } from '../utils/localStorage';
import ApiService from '../services/Api.service';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [loading, setLoading] = useState(true);

  // Load theme from localStorage or API on mount
  useEffect(() => {
    const loadTheme = async () => {
      // Check if user is authenticated before making API call
      const token = getVariable('km_user_token');
      
      if (token) {
        try {
          // Try to get from API first (only if authenticated)
          const { data, error } = await ApiService.getUserSettings();
          if (!error && data?.result?.theme) {
            setTheme(data.result.theme);
            applyTheme(data.result.theme);
            setLoading(false);
            return;
          }
        } catch (error) {
          // Silently fail - will use localStorage
          console.log('Could not fetch theme from API, using localStorage');
        }
      }

      // Fallback to localStorage or default
      const savedTheme = getVariable('app_theme') || getVariable('app_settings')?.theme || 'dark';
      setTheme(savedTheme);
      applyTheme(savedTheme);
      setLoading(false);
    };

    loadTheme();
  }, []);

  const applyTheme = (newTheme) => {
    // Update Bootstrap theme attribute
    document.documentElement.setAttribute('data-bs-theme', newTheme);
    
    // Update CSS custom properties for theme
    const root = document.documentElement;
    if (newTheme === 'light') {
      root.classList.remove('dark-theme');
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
      root.classList.add('dark-theme');
    }
  };

  const toggleTheme = async (newTheme = null) => {
    const themeToApply = newTheme || (theme === 'dark' ? 'light' : 'dark');
    setTheme(themeToApply);
    applyTheme(themeToApply);
    setVariable('app_theme', themeToApply);

    // Save to API only if user is authenticated (check token exists and is not empty)
    const token = getVariable('km_user_token');
    if (token && token.trim() !== '') {
      try {
        // Get current voice preference from localStorage or use default
        const currentSettings = getVariable('app_settings') || {};
        const voice = currentSettings.voice || 'female';
        
        // Use setTimeout to prevent blocking the UI update
        setTimeout(async () => {
          try {
            await ApiService.updateUserSettings({ theme: themeToApply, voice });
          } catch (error) {
            // Silently fail - theme is already saved to localStorage
            // Don't log errors to prevent console spam
          }
        }, 0);
      } catch (error) {
        // Silently fail - theme is already saved to localStorage
      }
    }
  };

  const value = {
    theme,
    toggleTheme,
    loading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
