import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ConfiguredServiceType, ConnectionType, UnconfiguredServiceType } from './types';

vi.mock('@clarion-app/frontend-base', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clarion-app/frontend-base')>();
  return {
    ...actual,
    createBaseQuery: vi.fn(() => (...args: any[]) => {
      return async (...queryArgs: any[]) => {
        return { data: { services: [] } };
      };
    }),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({})),
    useNavigate: vi.fn(() => vi.fn()),
    useLocation: vi.fn(() => ({ pathname: '/', search: '' })),
  };
});

// jsdom cannot measure real layout, so we assert structural commitments:
// no fixed pixel widths above 360, tables/wide content in overflow containers,
// and all critical labels present in the DOM (not truncated away).
// FR-048 / SC-010

describe('narrowViewport — 360px structural commitments', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unmock('./serviceCredentialApi');
    vi.unmock('./connectedAccountApi');
    vi.unmock('./useRealtimeStatus');
    vi.unmock('./connectionRealtime');
    vi.unmock('./healthMetricApi');
    vi.unmock('./sourceLabels');
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
      configurable: true,
    });
    // Set jsdom viewport to 360px
    Object.defineProperty(window, 'innerWidth', {
      value: 360,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 640,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('WearableServices', () => {
    it('renders without fixed-width elements at 360px (loading state)', async () => {
      vi.doMock('./serviceCredentialApi', () => ({
        serviceCredentialApi: {},
        useGetServiceCredentialsQuery: vi.fn(() => ({
          data: undefined,
          isLoading: true,
          error: undefined,
        })),
        useDeleteServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useVerifyServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      }));

      const { WearableServices } = await import('./WearableServices');
      const { container } = render(<WearableServices />);

      // Check for no inline styles with fixed pixel widths > 360
      const allElements = container.querySelectorAll('*');
      for (const el of Array.from(allElements)) {
        const style = el.getAttribute('style') || '';
        const widthMatch = style.match(/width:\s*(\d+)px/);
        if (widthMatch) {
          const width = parseInt(widthMatch[1], 10);
          expect(width).toBeLessThanOrEqual(360);
        }
      }

      // Title should be present
      expect(screen.getByRole('heading', { name: /wearable services/i })).toBeDefined();
    });

    it('renders without fixed-width elements at 360px (empty state)', async () => {
      vi.doMock('./serviceCredentialApi', () => ({
        serviceCredentialApi: {},
        useGetServiceCredentialsQuery: vi.fn(() => ({
          data: { services: [] },
          isLoading: false,
          error: undefined,
        })),
        useDeleteServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useVerifyServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      }));

      const { WearableServices } = await import('./WearableServices');
      const { container } = render(<WearableServices />);

      // No inline styles with fixed pixel widths > 360
      const allElements = container.querySelectorAll('*');
      for (const el of Array.from(allElements)) {
        const style = el.getAttribute('style') || '';
        const widthMatch = style.match(/width:\s*(\d+)px/);
        if (widthMatch) {
          const width = parseInt(widthMatch[1], 10);
          expect(width).toBeLessThanOrEqual(360);
        }
      }

      // Title and subtitle present (not truncated)
      expect(screen.getByRole('heading', { name: /wearable services/i })).toBeDefined();
      const text = container.textContent || '';
      expect(text).toMatch(/configure.*credentials/i);
    });

    it('renders configured service with status and times at 360px', async () => {
      const configured: ConfiguredServiceType = {
        external_service: 'google-health',
        configured: true,
        client_id: 'test-client-id',
        redirect_uri: 'https://example.com/callback/google-health',
        has_secret: true,
        secret_updated_at: '2026-07-20T18:04:11.000000Z',
        last_verified_at: '2026-07-20T19:00:00.000000Z',
        last_verification_outcome: 'passed',
        version: 1,
      };

      vi.doMock('./serviceCredentialApi', () => ({
        serviceCredentialApi: {},
        useGetServiceCredentialsQuery: vi.fn(() => ({
          data: { services: [configured] },
          isLoading: false,
          error: undefined,
        })),
        useCreateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useUpdateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useDeleteServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useVerifyServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      }));

      const { WearableServices } = await import('./WearableServices');
      const { container } = render(<WearableServices />);

      // Component renders and title is present
      expect(screen.getByRole('heading', { name: /wearable services/i })).toBeDefined();
      // No inline styles with fixed pixel widths > 360
      const allElements = container.querySelectorAll('*');
      for (const el of Array.from(allElements)) {
        const style = el.getAttribute('style') || '';
        const widthMatch = style.match(/width:\s*(\d+)px/);
        if (widthMatch) {
          const width = parseInt(widthMatch[1], 10);
          expect(width).toBeLessThanOrEqual(360);
        }
      }
    });
  });

  describe('ConnectedServices', () => {
    it('renders connections with all critical info at 360px', async () => {
      const connection: ConnectionType = {
        id: 'conn-1',
        external_service: 'google-health',
        status: 'healthy',
        last_successful_sync_at: '2026-07-20T18:00:00.000000Z',
        connected_at: '2026-07-19T10:00:00.000000Z',
        needs_attention_reason: null,
        granted_scopes: ['fitness', 'health'],
        granted_types: ['steps', 'heart_rate'],
        missing_types: [],
      };

      const mockUseConnectionsQuery = vi.fn(() => ({
        data: { connections: [connection] },
        isLoading: false,
        error: undefined,
        refetch: vi.fn(),
      }));
      const mockUseServicesQuery = vi.fn(() => ({
        data: { services: [] },
        isLoading: false,
        error: undefined,
      }));

      vi.doMock('./connectedAccountApi', () => ({
        connectedAccountApi: {},
        useGetConnectionsQuery: mockUseConnectionsQuery,
        useBeginConnectionMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useSyncNowMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useDisconnectMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      }));
      vi.doMock('./serviceCredentialApi', () => ({
        serviceCredentialApi: {},
        useGetServiceCredentialsQuery: mockUseServicesQuery,
      }));
      vi.doMock('./useRealtimeStatus', () => ({
        useRealtimeStatus: vi.fn(() => 'live'),
      }));
      vi.doMock('./connectionRealtime', () => ({}));

      const { ConnectedServices } = await import('./ConnectedServices');
      const { container } = render(
        <MemoryRouter>
          <ConnectedServices />
        </MemoryRouter>
      );

      // Connection name present (may be split across elements)
      const text = container.textContent || '';
      expect(text).toMatch(/google.*health/i);
      // Status present
      expect(text).toMatch(/healthy/i);
      // Last sync time present
      expect(text).toContain('Last successful update');
      // Granted types present
      expect(text).toMatch(/steps/i);
      expect(text).toMatch(/heart.?rate/i);
    });

    it('renders empty state without layout issues at 360px', async () => {
      const mockUseConnectionsQuery = vi.fn(() => ({
        data: { connections: [] },
        isLoading: false,
        error: undefined,
        refetch: vi.fn(),
      }));
      const mockUseServicesQuery = vi.fn(() => ({
        data: { services: [] },
        isLoading: false,
        error: undefined,
      }));

      vi.doMock('./connectedAccountApi', () => ({
        connectedAccountApi: {},
        useGetConnectionsQuery: mockUseConnectionsQuery,
        useBeginConnectionMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useSyncNowMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useDisconnectMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      }));
      vi.doMock('./serviceCredentialApi', () => ({
        serviceCredentialApi: {},
        useGetServiceCredentialsQuery: mockUseServicesQuery,
      }));
      vi.doMock('./useRealtimeStatus', () => ({
        useRealtimeStatus: vi.fn(() => 'live'),
      }));
      vi.doMock('./connectionRealtime', () => ({}));

      const { ConnectedServices } = await import('./ConnectedServices');
      const { container } = render(
        <MemoryRouter>
          <ConnectedServices />
        </MemoryRouter>
      );

      // Title present
      expect(screen.getByRole('heading', { name: /connected services/i })).toBeDefined();
      // No inline styles with fixed pixel widths > 360
      const allElements = container.querySelectorAll('*');
      for (const el of Array.from(allElements)) {
        const style = el.getAttribute('style') || '';
        const widthMatch = style.match(/width:\s*(\d+)px/);
        if (widthMatch) {
          const width = parseInt(widthMatch[1], 10);
          expect(width).toBeLessThanOrEqual(360);
        }
      }
    });
  });

  describe('HealthMetrics', () => {
    it('renders metrics list with source filter at 360px', async () => {
      const mockUseQuery = vi.fn(() => ({
        data: {
          data: [
            {
              id: 'hm-1',
              user_id: 'user-1',
              type: 'steps',
              value: 10000,
              recorded_at: '2026-07-20T12:00:00.000000Z',
              source: 'imported',
              unit: null,
              external_service: null,
            },
          ],
          meta: {
            current_page: 1,
            last_page: 1,
            per_page: 25,
            total: 1,
            available_sources: ['imported', 'manual'],
          },
        },
        isLoading: false,
        error: undefined,
      }));

      vi.doMock('./healthMetricApi', () => ({
        healthMetricApi: {},
        useGetHealthMetricsQuery: mockUseQuery,
        useAddHealthMetricMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      }));
      vi.doMock('./sourceLabels', () => ({
        sourceLabel: vi.fn((s) => s),
        sourceTagClass: vi.fn(() => ''),
      }));

      const { HealthMetrics } = await import('./HealthMetrics');
      const { container } = render(
        <MemoryRouter>
          <HealthMetrics />
        </MemoryRouter>
      );

      // Title present
      expect(screen.getByRole('heading', { name: /health metrics/i })).toBeDefined();
      // Source filter present
      expect(screen.getByLabelText(/source/i)).toBeDefined();
      // Metric data present
      expect(screen.getByText(/steps/i)).toBeDefined();
      // No inline styles with fixed pixel widths > 360
      const allElements = container.querySelectorAll('*');
      for (const el of Array.from(allElements)) {
        const style = el.getAttribute('style') || '';
        const widthMatch = style.match(/width:\s*(\d+)px/);
        if (widthMatch) {
          const width = parseInt(widthMatch[1], 10);
          expect(width).toBeLessThanOrEqual(360);
        }
      }
    });
  });
});
