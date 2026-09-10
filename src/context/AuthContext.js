import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, tokenStorage } from '../services/api';

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

  // On mount, if a session token exists, verify active analyst clearance with live backend
  useEffect(() => {
    const verifySession = async () => {
      const token = tokenStorage.get();
      if (!token) return;

      try {
        const freshUser = await api.getMe();
        if (freshUser) {
          const userData = {
            id: freshUser.id,
            email: freshUser.email,
            name: freshUser.name,
            role: freshUser.role,
            initials: freshUser.initials || 'SO',
            department: freshUser.department,
            clearance: freshUser.clearance
          };
          setUser(userData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        }
      } catch {
        // Backend unavailable or token expired; preserve local session
      }
    };

    verifySession();
  }, []);

  const login = async (email, password) => {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Attempt live authentication with FastAPI backend
    try {
      const authResponse = await api.login(trimmedEmail, password);
      if (authResponse && authResponse.user) {
        const userData = {
          id: authResponse.user.id,
          email: authResponse.user.email,
          name: authResponse.user.name,
          role: authResponse.user.role,
          initials: authResponse.user.initials || 'SO',
          department: authResponse.user.department,
          clearance: authResponse.user.clearance
        };
        setUser(userData);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        } catch (err) {
          console.error('Failed to save auth to localStorage', err);
        }
        return { success: true };
      }
    } catch (apiError) {
      // If server returned 401 or 403, credentials are invalid
      if (apiError.status === 401 || apiError.status === 403) {
        return {
          success: false,
          message: apiError.message || 'Invalid authorization credentials.'
        };
      }

      // 2. Resilient Offline Fallback (if backend is not running or network error)
      if (trimmedEmail === 'admin@threat.ai' && password === 'admin123') {
        const userData = {
          email: 'admin@threat.ai',
          name: 'Security Ops',
          role: 'Lead SOC Analyst',
          initials: 'SO',
          department: 'Security Operations',
          clearance: 'TOP SECRET // SCI'
        };
        setUser(userData);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        } catch (err) {
          console.error('Failed to save auth to localStorage', err);
        }
        return { success: true };
      }

      return {
        success: false,
        message: apiError.message || 'Invalid email or password.'
      };
    }

    return { success: false, message: 'Invalid email or password.' };
  };

  const logout = () => {
    setUser(null);
    tokenStorage.remove();
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
