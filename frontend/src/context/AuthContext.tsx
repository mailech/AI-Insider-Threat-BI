'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AuthState } from '@/lib/types';
import { api } from '@/lib/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  ssoLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => Promise<void>;
}

const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  'Administrator': { email: 'admin@ams.internal', pass: 'Admin1234!' },
  'Security Manager': { email: 'manager@ams.internal', pass: 'Manager123!' },
  'SOC Engineer': { email: 'soc@ams.internal', pass: 'SocEng123!' },
  'Security Analyst': { email: 'analyst@ams.internal', pass: 'Analyst123!' },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('ams_auth_token');
      if (storedToken) {
        try {
          setToken(storedToken);
          const userData = await api.getMe();
          if (userData && userData.id) {
            setUser(userData);
          } else {
            localStorage.removeItem('ams_auth_token');
            setToken(null);
            setUser(null);
          }
        } catch {
          localStorage.removeItem('ams_auth_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);


  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.login({ email, password });
      localStorage.setItem('ams_auth_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('ams_auth_token');
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const ssoLogin = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const data = await api.ssoLogin({ role, provider: 'Corporate_SSO_Demo' });
      localStorage.setItem('ams_auth_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const switchDemoRole = async (role: UserRole) => {
    const creds = DEMO_CREDENTIALS[role];
    if (creds) {
      await login(creds.email, creds.pass);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        ssoLogin,
        logout,
        switchDemoRole,
      }}
    >
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
