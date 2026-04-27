/**
 * Tests for the AnomalyPanel component.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnomalyPanel from '../components/Intelligence/AnomalyPanel';

// Mock the api module
vi.mock('../api/client', () => ({
  api: {
    scanAnomalies: vi.fn(),
  },
}));

import { api } from '../api/client';
const mockApi = api as { scanAnomalies: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AnomalyPanel', () => {
  it('renders scan button and description initially', () => {
    render(<AnomalyPanel />);
    expect(screen.getByText('Run Scan')).toBeInTheDocument();
    expect(screen.getByText('Anomaly Detection')).toBeInTheDocument();
    expect(screen.getByText(/Click "Run Scan"/i)).toBeInTheDocument();
  });

  it('shows "Scanning…" while loading', async () => {
    mockApi.scanAnomalies.mockReturnValue(new Promise(() => {})); // never resolves
    render(<AnomalyPanel />);
    fireEvent.click(screen.getByText('Run Scan'));
    await waitFor(() => {
      expect(screen.getByText('Scanning…')).toBeInTheDocument();
    });
  });

  it('shows no-anomalies message on clean scan', async () => {
    mockApi.scanAnomalies.mockResolvedValue({
      scanned_at: '2026-04-27T10:00:00',
      anomalies_found: 0,
      anomalies: [],
    });
    render(<AnomalyPanel />);
    fireEvent.click(screen.getByText('Run Scan'));
    await waitFor(() => {
      expect(screen.getByText('No anomalies detected')).toBeInTheDocument();
    });
  });

  it('renders anomaly cards when anomalies are returned', async () => {
    mockApi.scanAnomalies.mockResolvedValue({
      scanned_at: '2026-04-27T10:00:00',
      anomalies_found: 1,
      anomalies: [
        {
          sku_id: 1,
          sku_name: 'Full Cream Milk',
          anomaly_type: 'CONSUMPTION_SPIKE',
          severity: 'HIGH',
          detail: "Yesterday's consumption is 3.2× the 30-day average.",
          current_value: 45.0,
          threshold: 14.0,
          unit: 'litre',
        },
      ],
    });
    render(<AnomalyPanel />);
    fireEvent.click(screen.getByText('Run Scan'));
    await waitFor(() => {
      expect(screen.getByText('Full Cream Milk')).toBeInTheDocument();
      expect(screen.getByText('Consumption Spike')).toBeInTheDocument();
      expect(screen.getByText('1 anomaly detected')).toBeInTheDocument();
    });
  });

  it('shows error message on fetch failure', async () => {
    mockApi.scanAnomalies.mockRejectedValue(new Error('Network error'));
    render(<AnomalyPanel />);
    fireEvent.click(screen.getByText('Run Scan'));
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows last-scan timestamp after scan', async () => {
    mockApi.scanAnomalies.mockResolvedValue({
      scanned_at: '2026-04-27T14:30:00',
      anomalies_found: 0,
      anomalies: [],
    });
    render(<AnomalyPanel />);
    fireEvent.click(screen.getByText('Run Scan'));
    await waitFor(() => {
      expect(screen.getByText(/Last scan/i)).toBeInTheDocument();
    });
  });
});
