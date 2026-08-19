# Insider/IQ - AI Insider Threat BI System

This is the Milestone 1 Frontend implementation of the INSIDER/IQ application.

## Overview
This milestone establishes the foundational frontend architecture, design system, and core UI screens for the application. It uses a mocked backend to simulate functionality, Role-Based Access Control (RBAC), and authentication.

## Features Implemented
- **Design System**: Strict monochrome palette (Carbon, Onyx) with a single Signal Lime accent (`#c5ff4a`). Validation errors specifically use an amber/orange deviation.
- **Authentication**: Simulated JWT authentication flow with in-memory persistence and silent refreshing logic.
- **RBAC**: Four distinct roles (Administrator, Security Manager, SOC Engineer, Security Analyst) with protected routes and a secure `NotAuthorized` screen.
- **Core Screens**: 
  - Login & Registration (with password strength meter)
  - Users & Roles Administration
  - Employee Identity Management (Listing, Onboarding, Profile)
  - Activity Log Ingestion & Monitoring Setup
  - Global Security Settings
- **API Layer**: Simulated API endpoints in `src/lib/api/` with artificial latency (300-800ms) for realistic loading states.

## How to Run Locally

### Prerequisites
- Node.js (v18+)

### Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

### Mock Data & Future Backend Wiring
Currently, all data is mocked. The data layer lives in `src/lib/mock-data/` and is accessed via the simulated API client in `src/lib/api/client.ts`. 

In future milestones, the following functions in `client.ts` will need to be wired to a real backend:
- `getEmployees()`
- `getUsers()`
- `getActivityLogs()`
- `getLogSources()`
- `testLogSourceConnection(id)`

## Dataset
The project includes the CERT r4.2 synthetic dataset in the `data/` folder at the root. This is strictly for the backend ML pipeline in Milestone 2 and should not be parsed by the frontend.
