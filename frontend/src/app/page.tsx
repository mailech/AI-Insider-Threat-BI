import { redirect } from 'next/navigation';

/**
 * Root page — redirect to /login.
 * The login page will redirect to /dashboard after successful auth.
 */
export default function RootPage() {
  redirect('/login');
}
