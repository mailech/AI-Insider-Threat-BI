import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('threat_bi_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('threat_bi_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('threat_bi_token');
      if (storedToken) {
        try {
          const res = await api.getCurrentUser();
          setUser(res.data);
          localStorage.setItem('threat_bi_user', JSON.stringify(res.data));
        } catch (err) {
          console.error("Failed to restore session", err);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    const { access_token, role, full_name } = res.data;
    const userData = { username, role, full_name };

    setToken(access_token);
    setUser(userData);
    localStorage.setItem('threat_bi_token', access_token);
    localStorage.setItem('threat_bi_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('threat_bi_token');
    localStorage.removeItem('threat_bi_user');
  };

  const hasRole = (allowedRoles) => {
    if (!user) return false;
    if (user.role === 'Administrator') return true;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
