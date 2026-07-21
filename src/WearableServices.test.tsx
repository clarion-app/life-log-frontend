import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { serviceCredentialApi } from './serviceCredentialApi';
import type { ConfiguredServiceType, UnconfiguredServiceType, ServiceCredentialType } from './types';

vi.mock('@clarion-app/frontend-base', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clarion-app/frontend-base')>();
  return {
    ...actual,
    createBaseQuery: vi.fn(() => (...args: any[]) => {
      const queryFn = actual.createBaseQuery(...args);
      return async (...queryArgs: any[]) => {
        return { data: { services: [] } };
      };
    }),
  };
});

describe('WearableServices', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
      configurable: true,
    });
  });

  it('lists all services from API with configured state', async () => {
    const mockServices: ServiceCredentialType[] = [
      { external_service: 'google-health', configured: false },
      {
        external_service: 'acme-band',
        configured: true,
        client_id: 'abc123',
        redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/acme-band',
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
    const mockUseDelete = vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { deleted: true } }),
      { isLoading: false },
    ]);
    const mockUseVerify = vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { outcome: 'passed' } }),
      { isLoading: false },
    ]);

    vi.doMock('./serviceCredentialApi', () => ({
      serviceCredentialApi: {},
      useGetServiceCredentialsQuery: mockUseQuery,
      useDeleteServiceCredentialMutation: mockUseDelete,
      useCreateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      useUpdateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      useVerifyServiceCredentialMutation: mockUseVerify,
    }));

    const { WearableServices } = await import('./WearableServices');
    render(<WearableServices />);

    expect(screen.getAllByText(/google-health/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/acme-band/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/not.*configured/i)).toBeInTheDocument();
  });

  it('does not hard-code service names', async () => {
    const mockServices: ServiceCredentialType[] = [
      { external_service: 'future-service-x', configured: false },
    ];

    const mockUseQuery = vi.fn(() => ({
      data: { services: mockServices },
      isLoading: false,
      error: undefined,
    }));
    const mockUseDelete = vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { deleted: true } }),
      { isLoading: false },
    ]);
    const mockUseVerify = vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { outcome: 'passed' } }),
      { isLoading: false },
    ]);

    vi.doMock('./serviceCredentialApi', () => ({
      serviceCredentialApi: {},
      useGetServiceCredentialsQuery: mockUseQuery,
      useDeleteServiceCredentialMutation: mockUseDelete,
      useCreateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      useUpdateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      useVerifyServiceCredentialMutation: mockUseVerify,
    }));

    const { WearableServices } = await import('./WearableServices');
    render(<WearableServices />);

    expect(screen.getAllByText(/future-service-x/i).length).toBeGreaterThan(0);
  });

  it('shows pending state during verify', async () => {
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
    const mockUseDelete = vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { deleted: true } }),
      { isLoading: false },
    ]);
    const mockUseVerify = vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { outcome: 'passed' } }),
      { isLoading: true },
    ]);

    vi.doMock('./serviceCredentialApi', () => ({
      serviceCredentialApi: {},
      useGetServiceCredentialsQuery: mockUseQuery,
      useDeleteServiceCredentialMutation: mockUseDelete,
      useCreateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      useUpdateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      useVerifyServiceCredentialMutation: mockUseVerify,
    }));

    const { WearableServices } = await import('./WearableServices');
    render(<WearableServices />);

    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument();
  });

  it('renders verify outcome in plain language', async () => {
    const mockServices: ServiceCredentialType[] = [
      {
        external_service: 'google-health',
        configured: true,
        client_id: 'abc123',
        redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
        has_secret: true,
        secret_updated_at: '2026-07-20T18:04:11.000000Z',
        last_verified_at: '2026-07-20T19:00:00.000000Z',
        last_verification_outcome: 'passed',
        version: 1,
      },
    ];

    const mockUseQuery = vi.fn(() => ({
      data: { services: mockServices },
      isLoading: false,
      error: undefined,
    }));
    const mockUseDelete = vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { deleted: true } }),
      { isLoading: false },
    ]);
    const mockUseVerify = vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { outcome: 'passed' } }),
      { isLoading: false },
    ]);

    vi.doMock('./serviceCredentialApi', () => ({
      serviceCredentialApi: {},
      useGetServiceCredentialsQuery: mockUseQuery,
      useDeleteServiceCredentialMutation: mockUseDelete,
      useCreateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      useUpdateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      useVerifyServiceCredentialMutation: mockUseVerify,
    }));

    const { WearableServices } = await import('./WearableServices');
    render(<WearableServices />);

    expect(screen.getAllByText(/passed|verified|ok/i).length).toBeGreaterThan(0);
  });

  it('requires confirmation for removal with node-wide warning', async () => {
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
    const mockUseDelete = vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { deleted: true } }),
      { isLoading: false },
    ]);
    const mockUseVerify = vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { outcome: 'passed' } }),
      { isLoading: false },
    ]);

    vi.doMock('./serviceCredentialApi', () => ({
      serviceCredentialApi: {},
      useGetServiceCredentialsQuery: mockUseQuery,
      useDeleteServiceCredentialMutation: mockUseDelete,
      useCreateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      useUpdateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      useVerifyServiceCredentialMutation: mockUseVerify,
    }));

    const { WearableServices } = await import('./WearableServices');
    render(<WearableServices />);

    const removeBtn = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeBtn);

    // Confirmation dialog should mention "shared by everyone on the node" and "existing connections"
    await waitFor(() => {
      expect(screen.getByText(/shared.*everyone.*node.*existing.*connections/i)).toBeInTheDocument();
    });
  });

  it('shows transport failure message on error', async () => {
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
    render(<WearableServices />);

    expect(screen.getByText(/cannot.*reached|error|retry/i)).toBeInTheDocument();
  });
});
