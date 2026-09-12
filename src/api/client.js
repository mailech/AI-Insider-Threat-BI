import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:8000" : "");

export const API_PREFIX = "/api/v1";

export const TOKEN_KEY = "itbis.access";
export const REFRESH_KEY = "itbis.refresh";

const client = axios.create({
  baseURL: `${BASE_URL}${API_PREFIX}`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 45000,
});

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getRefreshToken = () =>
  localStorage.getItem(REFRESH_KEY);

export const storeTokens = (accessToken, refreshToken) => {
  localStorage.setItem(TOKEN_KEY, accessToken);

  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

client.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default client;