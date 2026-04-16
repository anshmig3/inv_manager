import type { SKUCard, SKUDetail, DashboardOut, ChatMessage, ChatResponse, NotificationPref, User, AlertOut } from '../types';

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('giq_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (res.status === 401) { localStorage.removeItem('giq_token'); localStorage.removeItem('giq_user'); window.location.reload(); }
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) { localStorage.removeItem('giq_token'); localStorage.removeItem('giq_user'); window.location.reload(); }
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  // SKUs
  getSKUs: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return get<SKUCard[]>(`/skus${q}`);
  },
  getSKUDetail: (id: number) => get<SKUDetail>(`/skus/${id}`),
  getCategories: () => get<string[]>('/skus/categories'),

  // Dashboard
  getDashboard: () => get<DashboardOut>('/dashboard'),

  // Alerts
  getAlerts: (status?: string) => get<AlertOut[]>(`/alerts${status ? `?status=${status}` : ''}`),
  triggerAlertScan: () => post<{ message: string }>('/alerts/scan', {}),
  acknowledgeAlert: (id: number, note?: string) => post<AlertOut>(`/alerts/${id}/acknowledge`, { note }),
  assignAlert: (id: number, assigned_to: string, note?: string) => post<AlertOut>(`/alerts/${id}/assign`, { assigned_to, note }),
  resolveAlert: (id: number, resolution_action: string) => post<AlertOut>(`/alerts/${id}/resolve`, { resolution_action }),

  // Chat
  chat: (message: string, history: ChatMessage[]) =>
    post<ChatResponse>('/chat', { message, history }),

  // Purchase orders
  createPO: (sku_id: number, quantity: number, notes?: string) =>
    post('/purchase-orders', { sku_id, quantity, notes: notes ?? '' }),

  // Users
  getUsers: () => get<User[]>('/users'),
  createUser: (body: { email: string; full_name: string; password: string; role: string; department?: string }) =>
    post<User>('/users', body),
  updateUser: (id: number, body: Partial<{ full_name: string; role: string; department: string; is_active: boolean }>) =>
    patch<User>(`/users/${id}`, body),

  // Notification preferences
  getNotificationPrefs: () => get<NotificationPref[]>('/users/me/notification-preferences'),
  updateNotificationPref: (id: number, body: Partial<NotificationPref>) =>
    patch<NotificationPref>(`/users/me/notification-preferences/${id}`, body),
};
