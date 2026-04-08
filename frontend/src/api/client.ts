import type { SKUCard, SKUDetail, DashboardOut, ChatMessage, ChatResponse } from '../types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  getSKUs: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return get<SKUCard[]>(`/skus${q}`);
  },
  getSKUDetail: (id: number) => get<SKUDetail>(`/skus/${id}`),
  getCategories: () => get<string[]>('/skus/categories'),
  getDashboard: () => get<DashboardOut>('/dashboard'),
  triggerAlertScan: () => post<{ message: string }>('/alerts/scan', {}),
  chat: (message: string, history: ChatMessage[]) =>
    post<ChatResponse>('/chat', { message, history }),
  createPO: (sku_id: number, quantity: number, notes?: string) =>
    post('/purchase-orders', { sku_id, quantity, notes: notes ?? '' }),
};
