const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export async function getDashboard(signal) {
  const response = await fetch(`${API_URL}/dashboard/overview`, {
    signal,
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Unable to load dashboard data.');
  return response.json();
}

export async function acknowledgeAlert(id) {
  const response = await fetch(`${API_URL}/alerts/${encodeURIComponent(id)}/acknowledge`, {
    method: 'POST', headers: { Accept: 'application/json' }, credentials: 'include'
  });
  if (!response.ok) throw new Error('Unable to acknowledge alert.');
  return response.json();
}
