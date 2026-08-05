# INSIDER/IQ - Milestone 1 Frontend

This repository contains the frontend implementation for Milestone 1 of the Insider Threat Behavioral Intelligence System.

## Architecture

The application is built with **Next.js (App Router)** and **Tailwind CSS**. It implements a strict, near-monochrome design system ("Encrypted Terminal / Classified Broadsheet") using a single accent color (Signal Lime).

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.
4. Log in using any email from the mock users (e.g., `admin@sentrix.local`). Any password works for the mock login.

## Mock Data Layer & API Swapping

Currently, all data and authentication flows are mocked to allow for UI/UX development without a backend.

### How it works currently:
- **`src/lib/mock-data/*`**: Contains JSON arrays representing the database state (Users, Employees, Logs).
- **`src/lib/auth/AuthContext.tsx`**: Simulates a login request, generates a mock JWT token, stores it in `sessionStorage` to persist across reloads within the same session, and simulates a token refresh loop every 10 minutes.

### How to swap to a real API later:
To connect this frontend to a real backend, you will need to replace the mocked functions, primarily in `AuthContext.tsx` and the data-fetching logic that you'll build into API utility functions.

1. **Authentication**: 
   - Update the `login` function in `src/lib/auth/AuthContext.tsx` to make a real `fetch` or `axios` call to your backend's `/api/auth/login` endpoint.
   - Replace the `sessionStorage` token management with secure HTTP-only cookies or real JWT handling depending on your security architecture.
   - Update the token refresh loop to call your `/api/auth/refresh` endpoint.

2. **Data Fetching**:
   - Currently, components import from `mock-data` directly for simplicity in Milestone 1. 
   - For Milestone 2, create a `src/lib/api/client.ts` that configures your HTTP client (e.g., adding the Authorization header automatically).
   - Create functions like `getEmployees()` or `getActivityLogs()` that make GET requests to your backend instead of returning the mock arrays.
   - Update the components (like `EmployeesPage`) to use `useEffect` or React Query/SWR to call these API functions and store the result in state, rather than mapping over the mock arrays directly.
