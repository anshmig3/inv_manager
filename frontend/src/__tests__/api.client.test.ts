/**
 * Tests for the API client module.
 * Uses fetch mocking — no real network calls.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Provide a token so authHeaders() is populated
beforeEach(() => {
  localStorage.setItem('giq_token', 'test-token');
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function mockFetch(body: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

describe('api client', () => {
  it('attaches Authorization header on every request', async () => {
    mockFetch([]);
    const { api } = await import('../api/client');
    await api.getSKUs();
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].headers['Authorization']).toBe('Bearer test-token');
  });

  it('getSKUs builds correct URL without params', async () => {
    mockFetch([]);
    const { api } = await import('../api/client');
    await api.getSKUs();
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('/api/skus');
  });

  it('getSKUs appends query string when params supplied', async () => {
    mockFetch([]);
    const { api } = await import('../api/client');
    await api.getSKUs({ category: 'Dairy', search: 'milk' });
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('category=Dairy');
    expect(url).toContain('search=milk');
  });

  it('getAlerts appends status filter', async () => {
    mockFetch([]);
    const { api } = await import('../api/client');
    await api.getAlerts('OPEN');
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toBe('/api/alerts?status=OPEN');
  });

  it('getAlerts has no query string when status omitted', async () => {
    mockFetch([]);
    const { api } = await import('../api/client');
    await api.getAlerts();
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toBe('/api/alerts');
  });

  it('chat sends POST with message and history', async () => {
    mockFetch({ reply: 'Hello', suggested_actions: [] });
    const { api } = await import('../api/client');
    await api.chat('hello', []);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('/api/chat');
    expect(call[1].method).toBe('POST');
    const body = JSON.parse(call[1].body as string);
    expect(body.message).toBe('hello');
    expect(body.history).toEqual([]);
  });

  it('createPO sends sku_id, quantity and notes', async () => {
    mockFetch({ id: 1, status: 'DRAFT' });
    const { api } = await import('../api/client');
    await api.createPO(5, 100, 'urgent');
    const body = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    );
    expect(body.sku_id).toBe(5);
    expect(body.quantity).toBe(100);
    expect(body.notes).toBe('urgent');
  });

  it('createPO defaults notes to empty string', async () => {
    mockFetch({ id: 2, status: 'DRAFT' });
    const { api } = await import('../api/client');
    await api.createPO(1, 10);
    const body = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    );
    expect(body.notes).toBe('');
  });

  it('triggerAlertScan calls POST /api/alerts/scan', async () => {
    mockFetch({ message: 'done' });
    const { api } = await import('../api/client');
    await api.triggerAlertScan();
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('/api/alerts/scan');
    expect(call[1].method).toBe('POST');
  });

  it('scanAnomalies calls POST /api/anomaly/scan', async () => {
    mockFetch({ scanned_at: '2026-01-01', anomalies_found: 0, anomalies: [] });
    const { api } = await import('../api/client');
    await api.scanAnomalies();
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('/api/anomaly/scan');
    expect(call[1].method).toBe('POST');
  });

  it('getDeliveryCalendar builds correct query string', async () => {
    mockFetch({ calendar: {}, total_deliveries: 0 });
    const { api } = await import('../api/client');
    await api.getDeliveryCalendar({ date_from: '2026-04-01', date_to: '2026-04-14' });
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('date_from=2026-04-01');
    expect(url).toContain('date_to=2026-04-14');
  });

  it('throws on non-ok GET response', async () => {
    mockFetch({ detail: 'Not found' }, 404);
    const { api } = await import('../api/client');
    await expect(api.getSKUDetail(999)).rejects.toThrow();
  });
});
