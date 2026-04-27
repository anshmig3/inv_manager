/**
 * Tests for the SupplierManagement component.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SupplierManagement from '../components/Operations/SupplierManagement';

// Mock auth and api
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}));

vi.mock('../api/client', () => ({
  api: {
    getSuppliers: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
  },
}));

import { api } from '../api/client';
const mockApi = api as {
  getSuppliers: ReturnType<typeof vi.fn>;
  createSupplier: ReturnType<typeof vi.fn>;
  updateSupplier: ReturnType<typeof vi.fn>;
};

const SAMPLE_SUPPLIERS = [
  {
    id: 1,
    name: 'FreshFarm Ltd',
    contact_name: 'Jane Smith',
    email: 'orders@freshfarm.com',
    phone: '+44 7700 900001',
    is_active: true,
    notes: null,
    created_at: '2026-01-01T00:00:00',
    fill_rate: 98.5,
    on_time_rate: 95.0,
  },
  {
    id: 2,
    name: 'City Bakeries',
    contact_name: null,
    email: 'supply@citybake.com',
    phone: null,
    is_active: false,
    notes: null,
    created_at: '2026-01-15T00:00:00',
    fill_rate: null,
    on_time_rate: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupplierManagement', () => {
  it('renders supplier count and active count', async () => {
    mockApi.getSuppliers.mockResolvedValue(SAMPLE_SUPPLIERS);
    render(<SupplierManagement />);
    await waitFor(() => {
      expect(screen.getByText('2 suppliers · 1 active')).toBeInTheDocument();
    });
  });

  it('renders supplier cards', async () => {
    mockApi.getSuppliers.mockResolvedValue(SAMPLE_SUPPLIERS);
    render(<SupplierManagement />);
    await waitFor(() => {
      expect(screen.getByText('FreshFarm Ltd')).toBeInTheDocument();
      expect(screen.getByText('City Bakeries')).toBeInTheDocument();
    });
  });

  it('shows score bars with values when data available', async () => {
    mockApi.getSuppliers.mockResolvedValue(SAMPLE_SUPPLIERS);
    render(<SupplierManagement />);
    await waitFor(() => {
      expect(screen.getByText('98.5%')).toBeInTheDocument();
      expect(screen.getByText('95.0%')).toBeInTheDocument();
    });
  });

  it('shows "No data" when scorecard values are null', async () => {
    mockApi.getSuppliers.mockResolvedValue(SAMPLE_SUPPLIERS);
    render(<SupplierManagement />);
    await waitFor(() => {
      // City Bakeries has null rates
      expect(screen.getAllByText('No data').length).toBeGreaterThan(0);
    });
  });

  it('shows Add Supplier button for admin', async () => {
    mockApi.getSuppliers.mockResolvedValue([]);
    render(<SupplierManagement />);
    await waitFor(() => {
      expect(screen.getByText('Add Supplier')).toBeInTheDocument();
    });
  });

  it('opens create modal on Add Supplier click', async () => {
    mockApi.getSuppliers.mockResolvedValue([]);
    render(<SupplierManagement />);
    await waitFor(() => screen.getByText('Add Supplier'));
    fireEvent.click(screen.getByText('Add Supplier'));
    expect(screen.getByPlaceholderText('DairyFresh Co.')).toBeInTheDocument();
  });
});
