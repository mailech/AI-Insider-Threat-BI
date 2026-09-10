import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'threat_ai_auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error('Failed to parse saved auth from localStorage', e);
      return null;
    }
  });

  const isAuthenticated = !!user;

  const login = (email, password) => {
    if (email.trim().toLowerCase() === 'admin@threat.ai' && password === 'admin123') {
      const userData = {
        email: 'admin@threat.ai',
        name: 'Security Ops',
        role: 'Senior Threat Analyst',
        initials: 'SO',
        department: 'Security Operations'
      };
      setUser(userData);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      } catch (err) {
        console.error('Failed to save auth to localStorage', err);
      }
      return { success: true };
    }
    return { success: false, message: 'Invalid email or password.' };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to remove auth from localStorage', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

