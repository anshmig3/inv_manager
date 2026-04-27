/**
 * Tests for the AuditLogView component.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AuditLogView from '../components/Intelligence/AuditLogView';

vi.mock('../api/client', () => ({
  api: { getAuditLog: vi.fn() },
}));

import { api } from '../api/client';
const mockApi = api as { getAuditLog: ReturnType<typeof vi.fn> };

const SAMPLE_ENTRIES = [
  {
    id: 1,
    timestamp: '2026-04-27T10:00:00',
    user_email: 'manager@test.com',
    user_name: 'Jane Manager',
    action_type: 'STOCK_ADJUSTMENT',
    entity_type: 'SKU',
    entity_id: 5,
    entity_name: 'Full Cream Milk',
    before_value: '50',
    after_value: '35',
    detail: 'Cycle count correction',
    source: 'USER',
  },
  {
    id: 2,
    timestamp: '2026-04-27T09:00:00',
    user_email: 'admin@test.com',
    user_name: 'Admin User',
    action_type: 'DISPOSAL',
    entity_type: 'SKU',
    entity_id: 3,
    entity_name: 'Yoghurt',
    before_value: null,
    after_value: null,
    detail: 'EXPIRED disposal: 5 units, £6.25',
    source: 'USER',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuditLogView', () => {
  it('shows entry count and table headers', async () => {
    mockApi.getAuditLog.mockResolvedValue(SAMPLE_ENTRIES);
    render(<AuditLogView />);
    await waitFor(() => {
      expect(screen.getByText('2 of 2 entries')).toBeInTheDocument();
    });
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Entity')).toBeInTheDocument();
  });

  it('renders rows for each audit entry', async () => {
    mockApi.getAuditLog.mockResolvedValue(SAMPLE_ENTRIES);
    render(<AuditLogView />);
    await waitFor(() => {
      expect(screen.getByText('Jane Manager')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Full Cream Milk')).toBeInTheDocument();
      expect(screen.getByText('Yoghurt')).toBeInTheDocument();
    });
  });

  it('shows "No entries found" on empty result', async () => {
    mockApi.getAuditLog.mockResolvedValue([]);
    render(<AuditLogView />);
    await waitFor(() => {
      expect(screen.getByText('No entries found')).toBeInTheDocument();
    });
  });

  it('filters entries by search term', async () => {
    mockApi.getAuditLog.mockResolvedValue(SAMPLE_ENTRIES);
    render(<AuditLogView />);
    await waitFor(() => screen.getByText('Jane Manager'));

    fireEvent.change(screen.getByPlaceholderText(/Search by user/i), {
      target: { value: 'Jane' },
    });

    expect(screen.getByText('1 of 2 entries')).toBeInTheDocument();
    expect(screen.getByText('Jane Manager')).toBeInTheDocument();
    expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
  });

  it('refreshes when Refresh button is clicked', async () => {
    mockApi.getAuditLog.mockResolvedValue(SAMPLE_ENTRIES);
    render(<AuditLogView />);
    await waitFor(() => screen.getByText('Jane Manager'));

    mockApi.getAuditLog.mockResolvedValue([SAMPLE_ENTRIES[0]]);
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => {
      expect(mockApi.getAuditLog).toHaveBeenCalledTimes(2);
    });
  });
});
