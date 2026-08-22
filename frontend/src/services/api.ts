/**
 * ITBIS — Axios API Client
 * Base URL: http://127.0.0.1:8000/api/v1
 *
 * Interceptors:
 *   Request  → attach Bearer JWT from localStorage
 *   Response → 401 clears token and redirects to /login
 */

import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  UserRead,
  RiskSummaryResponse,
  RiskCalculateRequest,
  RiskCalculateResponse,
  EmployeeCreate,
  EmployeeRead,
  TelemetryLogRead,
  TelemetryEventCreate,
  TelemetryIngestResponse,
} from '@/types/api';

// ── Constants ─────────────────────────────────────────────────────────────────

export const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';
export const TOKEN_KEY    = 'itbis_access_token';

// ── Axios instance ────────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ── Request interceptor — attach JWT ──────────────────────────────────────────

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor — handle 401 ────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login') &&
      !error.config?.url?.includes('/auth/login')
    ) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ── Token helpers ─────────────────────────────────────────────────────────────

export function setToken(token: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem(TOKEN_KEY);
  return null;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  // FastAPI OAuth2 password flow expects form-encoded body
  const formData = new URLSearchParams();
  formData.append('username', credentials.username);
  formData.append('password', credentials.password);

  const res: AxiosResponse<LoginResponse> = await api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function getAnalyticsSummary(): Promise<RiskSummaryResponse> {
  const res: AxiosResponse<RiskSummaryResponse> = await api.get('/analytics/summary');
  return res.data;
}

export async function getCurrentUser(): Promise<UserRead> {
  const res: AxiosResponse<UserRead> = await api.get('/auth/me');
  return res.data;
}

export async function calculateRisk(
  payload: RiskCalculateRequest,
): Promise<RiskCalculateResponse> {
  const res: AxiosResponse<RiskCalculateResponse> = await api.post(
    '/analytics/calculate-risk',
    payload,
  );
  return res.data;
}

// ── Employees ─────────────────────────────────────────────────────────────────

export interface ListEmployeesParams {
  skip?:          number;
  limit?:         number;
  department?:    string;
  risk_category?: string;
}

export async function listEmployees(
  params: ListEmployeesParams = {},
): Promise<EmployeeRead[]> {
  const res: AxiosResponse<EmployeeRead[]> = await api.get('/employees/', { params });
  return res.data;
}

export async function getEmployee(empId: string): Promise<EmployeeRead> {
  const res: AxiosResponse<EmployeeRead> = await api.get(`/employees/${empId}`);
  return res.data;
}

export async function createEmployee(payload: EmployeeCreate): Promise<EmployeeRead> {
  const res: AxiosResponse<EmployeeRead> = await api.post('/employees/', payload);
  return res.data;
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

export interface ListTelemetryParams {
  emp_id?:   string;
  severity?: string;
  skip?:     number;
  limit?:    number;
}

export async function listTelemetry(
  params: ListTelemetryParams = {},
): Promise<TelemetryLogRead[]> {
  const res: AxiosResponse<TelemetryLogRead[]> = await api.get('/telemetry/', { params });
  return res.data;
}

export async function getTelemetryLogs(
  empId: string,
  limit = 50,
): Promise<Record<string, unknown>[]> {
  const res: AxiosResponse<Record<string, unknown>[]> = await api.get(
    `/telemetry/logs/${empId}`,
    { params: { limit } },
  );
  return res.data;
}

export async function ingestTelemetry(
  payload: TelemetryEventCreate,
): Promise<TelemetryIngestResponse> {
  const res: AxiosResponse<TelemetryIngestResponse> = await api.post(
    '/telemetry/ingest',
    payload,
  );
  return res.data;
}

export default api;
