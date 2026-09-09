import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'threat_ai_dark_mode';

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : false;
    } catch (e) {
      console.error('Failed to parse theme from localStorage', e);
      return false;
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save theme to localStorage', e);
      }
      return next;
    });
  };

  const theme = useMemo(() => ({
    bg: darkMode ? '#090d16' : '#f8fafc',
    surface: darkMode ? '#0f172a' : '#ffffff',
    surfaceVariant: darkMode ? '#1e293b' : '#f1f5f9',
    surfaceHover: darkMode ? '#273549' : '#e2e8f0',
    border: darkMode ? '#1e293b' : '#e2e8f0',
    borderSubtle: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)',
    textPrimary: darkMode ? '#f8fafc' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    textMuted: darkMode ? '#64748b' : '#94a3b8',
    primary: darkMode ? '#818cf8' : '#4f46e5',
    primaryContainer: darkMode ? '#312e81' : '#eef2ff',
    shadow: darkMode
      ? '0 4px 20px rgba(0,0,0,0.45)'
      : '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    highBg: darkMode ? 'rgba(69, 10, 10, 0.45)' : '#fef2f2',
    highText: darkMode ? '#fca5a5' : '#dc2626',
    medBg: darkMode ? 'rgba(67, 20, 7, 0.45)' : '#fff7ed',
    medText: darkMode ? '#fdba74' : '#ea580c',
    lowBg: darkMode ? 'rgba(6, 78, 59, 0.45)' : '#ecfdf5',
    lowText: darkMode ? '#6ee7b7' : '#059669'
  }), [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, toggleDarkMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
