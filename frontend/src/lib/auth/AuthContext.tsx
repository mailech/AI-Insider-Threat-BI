"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Role } from "@/lib/types";
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
  const [isLoading, setIsLoading] = useState(true);

  // Simulate JWT token in memory
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing "token" in session (simulating memory persistence during session)
    const storedUser = sessionStorage.getItem("mock_user");
    const storedToken = sessionStorage.getItem("mock_token");
    const expiry = sessionStorage.getItem("mock_token_expiry");

    if (storedUser && storedToken && expiry) {
      if (Date.now() < parseInt(expiry, 10)) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } else {
        // Token expired
        sessionStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  // Simulate token refresh loop
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(() => {
      console.log("[Auth] Simulating JWT refresh...");
      const newExpiry = Date.now() + 15 * 60 * 1000; // 15 mins
      sessionStorage.setItem("mock_token_expiry", newExpiry.toString());
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
      const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
      
      setUser(foundUser);
      setToken(mockToken);
      
      sessionStorage.setItem("mock_user", JSON.stringify(foundUser));
      sessionStorage.setItem("mock_token", mockToken);
      sessionStorage.setItem("mock_token_expiry", expiry.toString());
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.clear();
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
