"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "@/lib/types";
import { MOCK_USERS } from "@/lib/mock-data/users";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<number | null>(null);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setExpiry(null);
  }, []);

  // Simulate token expiry
  useEffect(() => {
    if (!token || !expiry) return;

    const timeUntilExpiry = expiry - Date.now();
    if (timeUntilExpiry <= 0) {
      setTimeout(logout, 0);
      return;
    }

    const timeout = setTimeout(() => {
      console.log("[Auth] Token expired in memory. Forcing logout.");
      logout();
    }, timeUntilExpiry);

    return () => clearTimeout(timeout);
  }, [token, expiry, logout]);

  // Simulate token refresh loop (silent refresh before expiry)
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(() => {
      console.log("[Auth] Simulating silent JWT refresh in memory...");
      setExpiry(Date.now() + 15 * 60 * 1000); // 15 mins from now
    }, 10 * 60 * 1000); // refresh every 10 mins

    return () => clearInterval(interval);
  }, [token]);

  const login = async (email: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const foundUser = MOCK_USERS.find(u => u.email === email);
      if (!foundUser) {
        throw new Error("Invalid credentials");
      }
      
      const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.${Date.now()}`;
      
      setUser(foundUser);
      setToken(mockToken);
      setExpiry(Date.now() + 15 * 60 * 1000); // 15 minutes expiry
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
