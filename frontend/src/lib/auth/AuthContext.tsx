"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { User } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const TOKEN_KEY = "insideriq_token";
const USER_KEY = "insideriq_user";
const EXPIRY_KEY = "insideriq_token_expiry";

const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface BackendUser {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  is_active?: boolean;
  status?: string;
  last_login_at?: string;
}

function mapBackendUser(user: BackendUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.full_name || user.email,
    role: user.role as User["role"],
    status: (user.status as User["status"]) || (user.is_active ? "Active" : "Disabled"),
    lastLogin: user.last_login_at || new Date().toISOString(),
  };
}

function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<number | null>(null);

  // Used only while the application is restoring the saved session.
  const [isInitializing, setIsInitializing] = useState(true);

  // Used for an active login request.
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setExpiry(null);

    clearStoredSession();
  }, []);

  /*
   * Restore the saved authentication session when the application starts.
   *
   * Important:
   * We do not call logout() for a normal "no stored session" case because
   * logout is intended to actively clear an existing session.
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const restoreSession = () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);
        const storedExpiry = localStorage.getItem(EXPIRY_KEY);

        console.log("[Auth] Restoring session", {
          hasToken: Boolean(storedToken),
          hasUser: Boolean(storedUser),
          hasExpiry: Boolean(storedExpiry),
        });

        // No saved session.
        if (!storedToken || !storedUser || !storedExpiry) {
          setUser(null);
          setToken(null);
          setExpiry(null);
          return;
        }

        const expiryTime = Number(storedExpiry);

        // Invalid expiry.
        if (!Number.isFinite(expiryTime)) {
          console.warn("[Auth] Invalid stored expiry.");
          clearStoredSession();

          setUser(null);
          setToken(null);
          setExpiry(null);
          return;
        }

        // Expired token.
        if (expiryTime <= Date.now()) {
          console.warn("[Auth] Stored session has expired.");
          clearStoredSession();

          setUser(null);
          setToken(null);
          setExpiry(null);
          return;
        }

        // Restore the stored user.
        const parsedUser = JSON.parse(storedUser) as User;

        if (!parsedUser?.id || !parsedUser?.email || !parsedUser?.role) {
          throw new Error("Stored user data is invalid.");
        }

        setToken(storedToken);
        setUser(parsedUser);
        setExpiry(expiryTime);

        console.log("[Auth] Session restored successfully.", {
          email: parsedUser.email,
          role: parsedUser.role,
        });
      } catch (error) {
        console.error("[Auth] Failed to restore session:", error);

        clearStoredSession();

        setUser(null);
        setToken(null);
        setExpiry(null);
      } finally {
        // This must always happen, regardless of whether a session exists.
        setIsInitializing(false);
      }
    };

    restoreSession();
  }, []);

  /*
   * Automatically log the user out when the stored JWT expires.
   */
  useEffect(() => {
    if (!token || !expiry) {
      return;
    }

    const timeUntilExpiry = expiry - Date.now();

    if (timeUntilExpiry <= 0) {
      logout();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      console.log("[Auth] JWT expired. Logging out.");
      logout();
    }, timeUntilExpiry);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [token, expiry, logout]);

  /*
   * Login using the real FastAPI backend.
   */
  const login = async (
    email: string,
    password: string,
  ): Promise<void> => {
    setIsLoggingIn(true);

    try {
      console.log("[Auth] Logging in:", email);

      /*
       * Step 1:
       * Authenticate against FastAPI.
       */
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!loginResponse.ok) {
        let message = "Invalid credentials.";

        try {
          const errorBody = await loginResponse.json();

          if (typeof errorBody?.detail === "string") {
            message = errorBody.detail;
          }
        } catch {
          // Keep the default message.
        }

        throw new Error(message);
      }

      const loginData =
        (await loginResponse.json()) as LoginResponse;

      if (!loginData.access_token) {
        throw new Error(
          "Login succeeded, but the server did not return an access token.",
        );
      }

      /*
       * Step 2:
       * Fetch the authenticated user's actual backend profile.
       */
      const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${loginData.access_token}`,
        },
      });

      if (!meResponse.ok) {
        throw new Error(
          "Login succeeded, but the authenticated user could not be retrieved.",
        );
      }

      const backendUser =
        (await meResponse.json()) as BackendUser;

      if (!backendUser?.id || !backendUser?.email) {
        throw new Error(
          "The backend returned invalid user information.",
        );
      }

      const frontendUser = mapBackendUser(backendUser);

      /*
       * Step 3:
       * Calculate the token expiry timestamp.
       */
      const expiresInSeconds =
        loginData.expires_in ??
        DEFAULT_TOKEN_LIFETIME_SECONDS;

      const expiryTime =
        Date.now() + expiresInSeconds * 1000;

      /*
       * Step 4:
       * Persist the complete session BEFORE navigating.
       *
       * This is important because /dashboard can mount immediately
       * after router.push().
       */
      localStorage.setItem(
        TOKEN_KEY,
        loginData.access_token,
      );

      localStorage.setItem(
        USER_KEY,
        JSON.stringify(frontendUser),
      );

      localStorage.setItem(
        EXPIRY_KEY,
        String(expiryTime),
      );

      /*
       * Step 5:
       * Update React state.
       */
      setToken(loginData.access_token);
      setUser(frontendUser);
      setExpiry(expiryTime);

      console.log("[Auth] Login successful.", {
        email: frontendUser.email,
        role: frontendUser.role,
      });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const isLoading = isInitializing || isLoggingIn;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user && token),
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider.",
    );
  }

  return context;
}