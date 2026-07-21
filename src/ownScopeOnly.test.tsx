import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// FR-044: No area introduced by this feature offers a user-id entry field,
// a user selector, or any affordance that would act on another user's connections.
// The interface operates on the current user's own scope only.

const USER_SCOPE_PATTERNS = [
  // User ID input fields
  /user[_\s-]?id/i,
  /user[_\s-]?identifier/i,
  // User selectors
  /select\s+user/i,
  /choose\s+user/i,
  /pick\s+user/i,
  /user\s+selector/i,
  // Acting on other users
  /other\s+user/i,
  /another\s+user/i,
  /on\s+behalf/i,
  /act\s+for\s+user/i,
];

function hasUserScopeLeak(text: string): { found: boolean; pattern: string } {
  for (const pattern of USER_SCOPE_PATTERNS) {
    if (pattern.test(text)) {
      return { found: true, pattern: pattern.toString() };
    }
  }
  return { found: false, pattern: '' };
}

describe('ownScopeOnly — no user-id selectors or cross-user affordances', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
      configurable: true,
    });
  });

  describe('WearableServices', () => {
    it('has no user-id entry field', async () => {
      const unconfigured: UnconfiguredServiceType = {
        external_service: 'google-health',
        configured: false,
      };

      const mockUseQuery = vi.fn(() => ({
        data: { services: [unconfigured] },
        isLoading: false,
        error: undefined,
      }));

      vi.doMock('./serviceCredentialApi', () => ({
        serviceCredentialApi: {},
        useGetServiceCredentialsQuery: mockUseQuery,
        useCreateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useUpdateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useDeleteServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useVerifyServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      }));

      const { WearableServices } = await import('./WearableServices');
      const { container } = render(<WearableServices />);

      const text = container.textContent || '';
      const result = hasUserScopeLeak(text);
      expect(result.found, `Found user scope leak: ${result.pattern}`).toBe(false);

      // No input elements labelled as user-id
      const inputs = container.querySelectorAll('input');
      for (const input of Array.from(inputs)) {
        const label = input.getAttribute('aria-label') || '';
        const name = input.getAttribute('name') || '';
        const id = input.getAttribute('id') || '';
        const combined = `${label} ${name} ${id}`;
        const result = hasUserScopeLeak(combined);
        expect(result.found, `Input has user scope leak: ${result.pattern}`).toBe(false);
      }
    });

    it('configured service view has no user selector', async () => {
      const configured: ConfiguredServiceType = {
        external_service: 'google-health',
        configured: true,
        client_id: 'test-client-id',
        redirect_uri: 'https://example.com/callback/google-health',
        has_secret: true,
        secret_updated_at: '2026-07-20T18:04:11.000000Z',
        last_verified_at: null,
        last_verification_outcome: null,
        version: 1,
      };

      const mockUseQuery = vi.fn(() => ({
        data: { services: [configured] },
        isLoading: false,
        error: undefined,
      }));

      vi.doMock('./serviceCredentialApi', () => ({
        serviceCredentialApi: {},
        useGetServiceCredentialsQuery: mockUseQuery,
        useCreateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useUpdateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useDeleteServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useVerifyServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      }));

      const { WearableServices } = await import('./WearableServices');
      const { container } = render(<WearableServices />);

      const text = container.textContent || '';
      const result = hasUserScopeLeak(text);
      expect(result.found, `Found user scope leak: ${result.pattern}`).toBe(false);
    });
  });

  describe('ConnectedServices', () => {
    it('has no user-id entry field or selector', async () => {
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

      const text = container.textContent || '';
      const result = hasUserScopeLeak(text);
      expect(result.found, `Found user scope leak: ${result.pattern}`).toBe(false);

      // No select elements for users
      const selects = container.querySelectorAll('select');
      for (const select of Array.from(selects)) {
        const label = select.getAttribute('aria-label') || '';
        const id = select.getAttribute('id') || '';
        // Source filter select is fine, just check it's not for users
        const combined = `${label} ${id}`;
        expect(combined.toLowerCase()).not.toMatch(/user/i);
      }
    });
  });

  describe('HealthMetrics', () => {
    it('has no user-id entry field or selector', async () => {
      const mockUseQuery = vi.fn(() => ({
        data: {
          data: [],
          meta: {
            current_page: 1,
            last_page: 1,
            per_page: 25,
            total: 0,
            available_sources: ['manual'],
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

      const text = container.textContent || '';
      const result = hasUserScopeLeak(text);
      expect(result.found, `Found user scope leak: ${result.pattern}`).toBe(false);
    });
  });
});
