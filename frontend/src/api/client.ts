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
  getPOs: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return get<unknown[]>(`/purchase-orders${q}`);
  },
  approvePO: (id: number) => post<unknown>(`/purchase-orders/${id}/approve`, {}),
  sendPO: (id: number, email?: string) => post<unknown>(`/purchase-orders/${id}/send`, email ? { email } : {}),
  receivePO: (id: number, body: { received_quantity: number; discrepancy_notes?: string }) =>
    post<unknown>(`/purchase-orders/${id}/receive`, body),

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

  // Stock adjustments
  createStockAdjustment: (body: { sku_id: number; new_quantity: number; reason: string }) =>
    post<unknown>('/stock-adjustments', body),
  getStockAdjustments: (sku_id: number) => get<unknown[]>(`/stock-adjustments/sku/${sku_id}`),

  // Disposals
  createDisposal: (body: { sku_id: number; quantity: number; reason: string; method: string; notes?: string }) =>
    post<unknown>('/disposals', body),
  approveDisposal: (id: number) => post<unknown>(`/disposals/${id}/approve`, {}),
  getDisposals: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return get<unknown[]>(`/disposals${q}`);
  },
  getDisposalSummary: () => get<unknown>('/disposals/summary'),

  // Transfers
  createTransfer: (body: { sku_id: number; from_department: string; to_department: string; quantity: number; reason?: string }) =>
    post<unknown>('/transfers', body),
  getTransfers: () => get<unknown[]>('/transfers'),
  approveTransfer: (id: number) => post<unknown>(`/transfers/${id}/approve`, {}),
  completeTransfer: (id: number) => post<unknown>(`/transfers/${id}/complete`, {}),

  // Suppliers
  createSupplier: (body: { name: string; email: string; contact_name?: string; phone?: string; notes?: string }) =>
    post<unknown>('/suppliers', body),
  getSuppliers: () => get<unknown[]>('/suppliers'),
  updateSupplier: (id: number, body: Partial<{ is_active: boolean; contact_name: string; phone: string; notes: string }>) =>
    patch<unknown>(`/suppliers/${id}`, body),

  // Delivery calendar
  getDeliveryCalendar: (params: { date_from: string; date_to: string; supplier_id?: number }) => {
    const p: Record<string, string> = { date_from: params.date_from, date_to: params.date_to };
    if (params.supplier_id) p.supplier_id = String(params.supplier_id);
    return get<unknown>(`/deliveries/calendar?${new URLSearchParams(p).toString()}`);
  },

  // Demand forecast
  getForecast: (sku_id: number) => get<unknown>(`/forecast/${sku_id}`),

  // Cost management
  updateCost: (sku_id: number, body: { unit_cost: number; reason?: string }) =>
    post<unknown>(`/skus/${sku_id}/cost`, body),
  getCostHistory: (sku_id: number) => get<unknown[]>(`/skus/${sku_id}/cost-history`),

  // Audit log
  getAuditLog: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return get<unknown[]>(`/audit-log${q}`);
  },

  // Intelligence
  getWeeklyReport: () => get<unknown>('/reports/weekly-performance'),
  scanAnomalies: () => post<unknown>('/anomaly/scan', {}),
};
