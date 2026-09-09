import React, { createContext, useContext, useState, useMemo } from 'react';

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
    bg: darkMode ? '#0f172a' : '#f8fafc',
    surface: darkMode ? '#1e293b' : '#ffffff',
    surfaceVariant: darkMode ? '#334155' : '#f1f5f9',
    surfaceHover: darkMode ? '#334155' : '#e2e8f0',
    border: darkMode ? '#334155' : '#e2e8f0',
    textPrimary: darkMode ? '#f8fafc' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    primary: darkMode ? '#818cf8' : '#4f46e5',
    primaryContainer: darkMode ? '#312e81' : '#eef2ff',
    shadow: darkMode
      ? '0 4px 20px rgba(0,0,0,0.4)'
      : '0 1px 3px rgba(0,0,0,0.1)',
    highBg: darkMode ? '#450a0a' : '#fef2f2',
    highText: darkMode ? '#fca5a5' : '#dc2626',
    medBg: darkMode ? '#431407' : '#fff7ed',
    medText: darkMode ? '#fdba74' : '#ea580c',
    lowBg: darkMode ? '#064e3b' : '#ecfdf5',
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
