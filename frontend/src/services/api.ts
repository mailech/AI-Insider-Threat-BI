/**
 * CYBER AI — Axios API Client
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

// ── UEBA Intelligence Engine ──────────────────────────────────────────────────

export async function getUEBAOverview(): Promise<import('@/types/api').UEBAOverview> {
  const res = await api.get('/ueba/overview');
  return res.data;
}

export async function getUEBAUserProfile(
  empId: string,
): Promise<import('@/types/api').UEBAUserProfileResponse> {
  const res = await api.get(`/ueba/user/${empId}`);
  return res.data;
}

export async function getUEBAEntities(
  limit = 15,
): Promise<import('@/types/api').UEBAEntityRead[]> {
  const res = await api.get('/ueba/entities', { params: { limit } });
  return res.data;
}

// ── Reports & Export API Helpers ─────────────────────────────────────────────

export async function getReportTypes(): Promise<import('@/types/api').ReportTypeMetadata[]> {
  const res = await api.get('/reports/types');
  return res.data;
}

export async function getReportPreview(
  payload: import('@/types/api').ReportFilterPayload,
): Promise<import('@/types/api').ReportPreviewResponse> {
  const res = await api.post('/reports/preview', payload);
  return res.data;
}

export async function downloadReportPDF(
  payload: import('@/types/api').ReportFilterPayload,
): Promise<void> {
  const res = await api.post('/reports/export/pdf', payload, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `cyber_ai_${payload.report_type}_report.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadReportExcel(
  payload: import('@/types/api').ReportFilterPayload,
): Promise<void> {
  const res = await api.post('/reports/export/excel', payload, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `cyber_ai_${payload.report_type}_report.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function getScoringMatrix(): Promise<import('@/types/api').ScoringOverviewResponse> {
  const res = await api.get('/analytics/scoring-matrix');
  return res.data;
}

export default api;
