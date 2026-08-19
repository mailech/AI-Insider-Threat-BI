# ============================================================
# ITBIS — Insider Threat Behavioral Intelligence System
# AI Agent Rules & Code-Generation Standards
# ============================================================

## Project Overview
You are assisting with an AI-powered Insider Threat Behavioral Intelligence System (ITBIS).
- **Backend**: FastAPI (Python 3.11+) + SQLAlchemy 2.0 (PostgreSQL 15) + Motor (MongoDB 7.0)
- **Frontend**: Next.js 16 (App Router, React 19) + Tailwind CSS v4 + TypeScript (strict)
- **Authentication & RBAC**: OAuth2 JWT Bearer tokens with 4 distinct roles (`ADMINISTRATOR`, `SECURITY_MANAGER`, `SOC_ENGINEER`, `SECURITY_ANALYST`)

# ─────────────────────────────────────────────────────────────
# 1. DESIGN SYSTEM — Dark-Mode Cybersecurity Theme
# ─────────────────────────────────────────────────────────────

## Color Palette
- Background (base):      `#0B0F19`   (deep navy-black)
- Card / container:       `#161C2E`   (dark navy)
- Elevated surface:       `#1E2640`   (mid navy)
- Border / divider:       `#2A3352`   (muted navy)
- Primary accent:         `#3B82F6`   (electric blue)
- Secondary accent:       `#6366F1`   (indigo)
- Danger / alert:         `#EF4444`   (red)
- Warning:                `#F59E0B`   (amber)
- Success / safe:         `#10B981`   (emerald)
- Text primary:           `#E2E8F0`   (light slate)
- Text secondary:         `#94A3B8`   (muted slate)
- Text muted:             `#475569`   (dim slate)

## Typography & Layout
- Font family: 'Inter', 'JetBrains Mono' (monospace for IDs/hashes/telemetry logs), system-ui, sans-serif
- High-density, compact layout — minimize vertical whitespace
- Sidebar navigation: fixed, 240px wide, `#161C2E` background
- Top header bar: 56px tall, `#0B0F19` with border-b border-[#2A3352]
- Data tables: dense rows, alternating dark navy backgrounds
- Cards: rounded-lg border border-[#2A3352] bg-[#161C2E] p-4 shadow-lg

# ─────────────────────────────────────────────────────────────
# 2. TYPESCRIPT & FRONTEND STANDARDS
# ─────────────────────────────────────────────────────────────

- Always enable strict mode in `tsconfig.json`
- No implicit `any` — all function parameters and return types must be explicitly typed
- Prefer `interface` over `type` for object shapes; use `type` for unions/intersections
- All async functions must have explicit `Promise<T>` return types
- Discriminated unions for API response states: `{ status: 'loading' | 'success' | 'error' }`
- Enums: prefer string literal unions over numeric enums
- Never use `any`; use `unknown` and narrow with type guards

## Naming Conventions
- Components:    `PascalCase`  (e.g., `ThreatOverviewCards.tsx`, `RiskScoreGauge.tsx`)
- Hooks:         `camelCase` prefixed with `use`  (e.g., `useTelemetryLogs.ts`)
- API routes:    `kebab-case`  (e.g., `/api/v1/telemetry/ingest`)
- Types/Interfaces: `PascalCase` with descriptive suffix (e.g., `EmployeeResponse`, `TelemetryLog`)
- Constants:     `SCREAMING_SNAKE_CASE`

# ─────────────────────────────────────────────────────────────
# 3. NEXT.JS 16 APP ROUTER RULES
# ─────────────────────────────────────────────────────────────

- Use Next.js 16 App Router (`src/app/` directory) exclusively — no `pages/` directory
- React 19 compatibility: handle async dynamic page parameters/searchParams where applicable
- Server Components by default; add `'use client'` only when state/interactivity/browser APIs are required
- Data fetching: use Server Components + fetch or centralized typed client in `src/services/api.ts`
- Route groups: `(auth)`, `(dashboard)` for clean layout isolation
- Loading states: provide `loading.tsx` skeleton screens
- Error states: provide `error.tsx` error boundaries with reset/retry capability
- Metadata: export descriptive `metadata` objects from pages
- Styling: TailwindCSS v4 theme tokens via `@import "tailwindcss";` in `globals.css`

# ─────────────────────────────────────────────────────────────
# 4. FASTAPI BACKEND RULES
# ─────────────────────────────────────────────────────────────

- Python 3.11+ with full type annotations on every function
- Pydantic v2 models for all request/response schemas
- Use `pydantic-settings` for environment configuration (`BaseSettings`)
- SQLAlchemy 2.0 (PostgreSQL) for relational data; Motor (MongoDB) for async telemetry logs
- JWT authentication via `python-jose`; password hashing via `passlib[bcrypt]` / `bcrypt`
- All REST endpoints under `/api/v1/` prefix
- Dependency injection for DB sessions (`get_db`), Mongo (`get_mongo_db`), and user authentication (`get_current_active_user`, `require_roles`)
- Never return raw ORM model instances — always serialize through Pydantic schemas
- Standard HTTP status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

# ─────────────────────────────────────────────────────────────
# 5. SECURITY & THREAT INTELLIGENCE RULES
# ─────────────────────────────────────────────────────────────

- All sensitive fields (passwords, tokens, PII) must be excluded from logs and responses
- Threat score scale: `0.0` to `1.0` (normalized in DB) / `0` to `100` (UI representation)
- Threat severity levels: `CRITICAL` | `HIGH` | `MEDIUM` | `LOW` | `INFO`
- Monitored event classifications: `LOGIN`, `FILE_DOWNLOAD`, `FILE_UPLOAD`, `DATA_TRANSFER`, `EMAIL_ACTIVITY`, `PRIVILEGE_CHANGE`, `REMOTE_ACCESS`
- Strict RBAC validation on both backend endpoints and frontend UI action gates

# ─────────────────────────────────────────────────────────────
# 6. CODE QUALITY & WORKFLOW
# ─────────────────────────────────────────────────────────────

- Conventional Commits format (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`)
- Verification scripts: run `backend/milestone1_verify.py` to validate API integrity
- Do not modify code inside `backend/app/` or `frontend/src/` unless explicitly tasked
