import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ConfiguredServiceType, ServiceCredentialType } from './types';

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

const ROLE_PATTERNS = [
  /administrator/i,
  /owner/i,
  /admin/i,
  /elevated/i,
  /permission\s+required/i,
];

function hasRoleWording(text: string): { found: boolean; pattern: string } {
  for (const pattern of ROLE_PATTERNS) {
    if (pattern.test(text)) {
      return { found: true, pattern: pattern.toString() };
    }
  }
  return { found: false, pattern: '' };
}

describe('noRoleWording — WearableServices has no role-gating language', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
      configurable: true,
    });
  });

  it('loading state has no role wording', async () => {
    const mockUseQuery = vi.fn(() => ({
      data: undefined,
      isLoading: true,
      error: undefined,
    }));

    vi.doMock('./serviceCredentialApi', () => ({
      serviceCredentialApi: {},
      useGetServiceCredentialsQuery: mockUseQuery,
      useDeleteServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      useVerifyServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
    }));

    const { WearableServices } = await import('./WearableServices');
    const { container } = render(<WearableServices />);
    const text = container.textContent || '';
    const result = hasRoleWording(text);
    expect(result.found).toBe(false);
  });

  it('error state has no role wording', async () => {
    const mockUseQuery = vi.fn(() => ({
      data: undefined,
      isLoading: false,
      error: { status: 500, data: { message: 'Internal server error' } },
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
    const result = hasRoleWording(text);
    expect(result.found).toBe(false);
  });

  it('unconfigured state has no role wording', async () => {
    const mockServices: ServiceCredentialType[] = [
      { external_service: 'google-health', configured: false },
    ];

    const mockUseQuery = vi.fn(() => ({
      data: { services: mockServices },
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
    const result = hasRoleWording(text);
    expect(result.found).toBe(false);
  });

  it('configured state has no role wording', async () => {
    const mockServices: ServiceCredentialType[] = [
      {
        external_service: 'google-health',
        configured: true,
        client_id: 'abc123',
        redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
        has_secret: true,
        secret_updated_at: '2026-07-20T18:04:11.000000Z',
        last_verified_at: null,
        last_verification_outcome: null,
        version: 1,
      },
    ];

    const mockUseQuery = vi.fn(() => ({
      data: { services: mockServices },
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
    const result = hasRoleWording(text);
    expect(result.found).toBe(false);
  });

  it('verify-failed state has no role wording', async () => {
    const mockServices: ServiceCredentialType[] = [
      {
        external_service: 'google-health',
        configured: true,
        client_id: 'abc123',
        redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
        has_secret: true,
        secret_updated_at: '2026-07-20T18:04:11.000000Z',
        last_verified_at: '2026-07-20T19:00:00.000000Z',
        last_verification_outcome: 'failed',
        version: 1,
      },
    ];

    const mockUseQuery = vi.fn(() => ({
      data: { services: mockServices },
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
    const result = hasRoleWording(text);
    expect(result.found).toBe(false);
  });

  it('no control is disabled for a role reason', async () => {
    const mockServices: ServiceCredentialType[] = [
      {
        external_service: 'google-health',
        configured: true,
        client_id: 'abc123',
        redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
        has_secret: true,
        secret_updated_at: '2026-07-20T18:04:11.000000Z',
        last_verified_at: null,
        last_verification_outcome: null,
        version: 1,
      },
    ];

    const mockUseQuery = vi.fn(() => ({
      data: { services: mockServices },
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

    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      if (btn.disabled) {
        const title = (btn.getAttribute('title') || '').toLowerCase();
        const text = (btn.textContent || '').toLowerCase();
        expect(title).not.toMatch(/admin|owner|permission/i);
        expect(text).not.toMatch(/admin|owner|permission/i);
      }
    });
  });
});

describe('noRoleWording — ConnectedServices has no role-gating language', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
      configurable: true,
    });
  });

  it('loading state has no role wording', async () => {
    const mockGetConnections = vi.fn(() => ({
      data: undefined,
      isLoading: true,
      error: undefined,
    }));
    const mockGetServices = vi.fn(() => ({
      data: { services: [] },
      isLoading: true,
      error: undefined,
    }));
    const mockBeginMutation = vi.fn(() => [vi.fn(), { isLoading: false }]);

    vi.doMock('./connectedAccountApi', () => ({
      connectedAccountApi: {},
      useGetConnectionsQuery: mockGetConnections,
      useBeginConnectionMutation: mockBeginMutation,
    }));

    vi.doMock('./serviceCredentialApi', () => ({
      serviceCredentialApi: {},
      useGetServiceCredentialsQuery: mockGetServices,
    }));

    const { ConnectedServices } = await import('./ConnectedServices');
    const { container } = render(
      <MemoryRouter>
        <ConnectedServices />
    </MemoryRouter>
  );
    const text = container.textContent || '';
    const result = hasRoleWording(text);
    expect(result.found).toBe(false);
  });

  it('error state has no role wording', async () => {
    const mockGetConnections = vi.fn(() => ({
      data: undefined,
      isLoading: false,
      error: { status: 500, data: { message: 'Internal server error' } },
    }));
    const mockGetServices = vi.fn(() => ({
      data: { services: [] },
      isLoading: false,
      error: undefined,
    }));
    const mockBeginMutation = vi.fn(() => [vi.fn(), { isLoading: false }]);

    vi.doMock('./connectedAccountApi', () => ({
      connectedAccountApi: {},
      useGetConnectionsQuery: mockGetConnections,
      useBeginConnectionMutation: mockBeginMutation,
    }));

    vi.doMock('./serviceCredentialApi', () => ({
      serviceCredentialApi: {},
      useGetServiceCredentialsQuery: mockGetServices,
    }));

    const { ConnectedServices } = await import('./ConnectedServices');
    const { container } = render(
      <MemoryRouter>
        <ConnectedServices />
    </MemoryRouter>
  );
    const text = container.textContent || '';
    const result = hasRoleWording(text);
    expect(result.found).toBe(false);
  });

  it('empty state has no role wording', async () => {
    const mockGetConnections = vi.fn(() => ({
      data: { connections: [] },
      isLoading: false,
      error: undefined,
    }));
    const mockGetServices = vi.fn(() => ({
      data: { services: [] },
      isLoading: false,
      error: undefined,
    }));
    const mockBeginMutation = vi.fn(() => [vi.fn(), { isLoading: false }]);

    vi.doMock('./connectedAccountApi', () => ({
      connectedAccountApi: {},
      useGetConnectionsQuery: mockGetConnections,
      useBeginConnectionMutation: mockBeginMutation,
    }));

    vi.doMock('./serviceCredentialApi', () => ({
      serviceCredentialApi: {},
      useGetServiceCredentialsQuery: mockGetServices,
    }));

    const { ConnectedServices } = await import('./ConnectedServices');
    const { container } = render(
      <MemoryRouter>
        <ConnectedServices />
    </MemoryRouter>
  );
    const text = container.textContent || '';
    const result = hasRoleWording(text);
    expect(result.found).toBe(false);
  });

  it('connected state has no role wording', async () => {
    const mockConnections = [
      {
        id: 'conn-1',
        external_service: 'google-health',
        status: 'healthy' as const,
        last_successful_sync_at: '2026-07-21T06:00:00.000000Z',
        connected_at: '2026-07-14T11:20:03.000000Z',
        needs_attention_reason: null,
        granted_scopes: [],
        granted_types: [],
        missing_types: [],
      },
    ];

    const mockServices: ServiceCredentialType[] = [
      {
        external_service: 'google-health',
        configured: true,
        client_id: 'abc123',
        redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
        has_secret: true,
        secret_updated_at: '2026-07-20T18:04:11.000000Z',
        last_verified_at: null,
        last_verification_outcome: null,
        version: 1,
      },
    ];

    const mockGetConnections = vi.fn(() => ({
      data: { connections: mockConnections },
      isLoading: false,
      error: undefined,
    }));
    const mockGetServices = vi.fn(() => ({
      data: { services: mockServices },
      isLoading: false,
      error: undefined,
    }));
    const mockBeginMutation = vi.fn(() => [vi.fn(), { isLoading: false }]);

    vi.doMock('./connectedAccountApi', () => ({
      connectedAccountApi: {},
      useGetConnectionsQuery: mockGetConnections,
      useBeginConnectionMutation: mockBeginMutation,
    }));

    vi.doMock('./serviceCredentialApi', () => ({
      serviceCredentialApi: {},
      useGetServiceCredentialsQuery: mockGetServices,
    }));

    const { ConnectedServices } = await import('./ConnectedServices');
    const { container } = render(
      <MemoryRouter>
        <ConnectedServices />
    </MemoryRouter>
  );
    const text = container.textContent || '';
    const result = hasRoleWording(text);
    expect(result.found).toBe(false);
  });

  it('unavailable service state has no role wording', async () => {
    const mockServices: ServiceCredentialType[] = [
      { external_service: 'google-health', configured: false },
    ];

    const mockGetConnections = vi.fn(() => ({
      data: { connections: [] },
      isLoading: false,
      error: undefined,
    }));
    const mockGetServices = vi.fn(() => ({
      data: { services: mockServices },
      isLoading: false,
      error: undefined,
    }));
    const mockBeginMutation = vi.fn(() => [vi.fn(), { isLoading: false }]);

    vi.doMock('./connectedAccountApi', () => ({
      connectedAccountApi: {},
      useGetConnectionsQuery: mockGetConnections,
      useBeginConnectionMutation: mockBeginMutation,
    }));

    vi.doMock('./serviceCredentialApi', () => ({
      serviceCredentialApi: {},
      useGetServiceCredentialsQuery: mockGetServices,
    }));

    const { ConnectedServices } = await import('./ConnectedServices');
    const { container } = render(
      <MemoryRouter>
        <ConnectedServices />
    </MemoryRouter>
  );
    const text = container.textContent || '';
    const result = hasRoleWording(text);
    expect(result.found).toBe(false);
  });
});
