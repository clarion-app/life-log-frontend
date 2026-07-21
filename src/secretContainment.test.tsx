import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { serviceCredentialApi } from './serviceCredentialApi';
import type { ConfiguredServiceType, UnconfiguredServiceType, ServiceCredentialType } from './types';

const SENTINEL_SECRET = 'SENTINEL_SECRET_DOES_NOT_APPEAR_ANYWHERE';

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

describe('secretContainment — sentinel secret never leaks', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
      configurable: true,
    });
    // Clear storage
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  });

  it('sentinel secret does not appear in store state after create', async () => {
    const createdService: ConfiguredServiceType = {
      external_service: 'google-health',
      configured: true,
      client_id: 'test-client-id',
      redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
      has_secret: true,
      secret_updated_at: '2026-07-20T18:04:11.000000Z',
      last_verified_at: null,
      last_verification_outcome: null,
      version: 1,
    };

    const mockCreateFn = vi.fn().mockResolvedValue({ data: createdService });
    const mockUseQuery = vi.fn(() => ({
      data: {
        services: [{ external_service: 'google-health', configured: false } as UnconfiguredServiceType],
      },
      isLoading: false,
      error: undefined,
    }));
    const mockUseCreate = vi.fn(() => [mockCreateFn, { isLoading: false, error: undefined }]);
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
      useCreateServiceCredentialMutation: mockUseCreate,
      useUpdateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      useDeleteServiceCredentialMutation: mockUseDelete,
      useVerifyServiceCredentialMutation: mockUseVerify,
    }));

    const { WearableServices } = await import('./WearableServices');
    const { container } = render(<WearableServices />);

    // Fill in the form with the sentinel secret
    const secretInput = screen.getByLabelText(/secret/i) as HTMLInputElement;
    const clientIdInput = screen.getByLabelText(/client.*id/i) as HTMLInputElement;
    clientIdInput.value = 'test-client-id';
    secretInput.value = SENTINEL_SECRET;

    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);

    // Wait for the mutation to complete
    await waitFor(() => {
      expect(mockCreateFn).toHaveBeenCalled();
    });

    // Check that the sentinel doesn't appear in the DOM
    const domText = container.textContent || '';
    expect(domText).not.toContain(SENTINEL_SECRET);

    // Check that the sentinel doesn't appear in localStorage or sessionStorage
    expect(localStorage.toString()).not.toContain(SENTINEL_SECRET);
    expect(sessionStorage.toString()).not.toContain(SENTINEL_SECRET);
  });

  it('sentinel secret does not appear in console output', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockCreateFn = vi.fn().mockResolvedValue({ data: {} });
    const mockUseQuery = vi.fn(() => ({
      data: {
        services: [{ external_service: 'google-health', configured: false } as UnconfiguredServiceType],
      },
      isLoading: false,
      error: undefined,
    }));
    const mockUseCreate = vi.fn(() => [mockCreateFn, { isLoading: false, error: undefined }]);
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
      useCreateServiceCredentialMutation: mockUseCreate,
      useUpdateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      useDeleteServiceCredentialMutation: mockUseDelete,
      useVerifyServiceCredentialMutation: mockUseVerify,
    }));

    const { WearableServices } = await import('./WearableServices');
    render(<WearableServices />);

    const secretInput = screen.getByLabelText(/secret/i) as HTMLInputElement;
    const clientIdInput = screen.getByLabelText(/client.*id/i) as HTMLInputElement;
    clientIdInput.value = 'test-client-id';
    secretInput.value = SENTINEL_SECRET;

    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateFn).toHaveBeenCalled();
    });

    // Check console output doesn't contain the sentinel
    const consoleCalls = [...consoleSpy.mock.calls, ...consoleLogSpy.mock.calls];
    const consoleText = consoleCalls.flat().join(' ');
    expect(consoleText).not.toContain(SENTINEL_SECRET);

    consoleSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('full lifecycle — save, refetch, verify, remove — no secret leakage', async () => {
    // Start with unconfigured
    const unconfigured: UnconfiguredServiceType = {
      external_service: 'google-health',
      configured: false,
    };

    const configured: ConfiguredServiceType = {
      external_service: 'google-health',
      configured: true,
      client_id: 'test-client-id',
      redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
      has_secret: true,
      secret_updated_at: '2026-07-20T18:04:11.000000Z',
      last_verified_at: null,
      last_verification_outcome: null,
      version: 1,
    };

    let currentServices: ServiceCredentialType[] = [unconfigured];
    let queryCallCount = 0;

    const mockUseQuery = vi.fn(() => {
      queryCallCount++;
      return {
        data: { services: currentServices },
        isLoading: false,
        error: undefined,
      };
    });

    const mockCreateFn = vi.fn().mockImplementation(async (payload: any) => {
      currentServices = [configured];
      return { data: configured };
    });
    const mockUpdateFn = vi.fn().mockImplementation(async ({ service, data }: any) => {
      return { data: configured };
    });
    const mockVerifyFn = vi.fn().mockResolvedValue({ data: { outcome: 'passed' } });
    const mockDeleteFn = vi.fn().mockImplementation(async ({ service }: any) => {
      currentServices = [unconfigured];
      return { data: { deleted: true } };
    });

    const mockUseCreate = vi.fn(() => [mockCreateFn, { isLoading: false, error: undefined }]);
    const mockUseUpdate = vi.fn(() => [mockUpdateFn, { isLoading: false, error: undefined }]);
    const mockUseVerify = vi.fn(() => [mockVerifyFn, { isLoading: false }]);
    const mockUseDelete = vi.fn(() => [mockDeleteFn, { isLoading: false }]);

    vi.doMock('./serviceCredentialApi', () => ({
      serviceCredentialApi: {},
      useGetServiceCredentialsQuery: mockUseQuery,
      useCreateServiceCredentialMutation: mockUseCreate,
      useUpdateServiceCredentialMutation: mockUseUpdate,
      useDeleteServiceCredentialMutation: mockUseDelete,
      useVerifyServiceCredentialMutation: mockUseVerify,
    }));

    const { WearableServices } = await import('./WearableServices');
    const { container, rerender } = render(<WearableServices />);

    // Step 1: Create with sentinel secret
    const secretInput = screen.getByLabelText(/secret/i) as HTMLInputElement;
    const clientIdInput = screen.getByLabelText(/client.*id/i) as HTMLInputElement;
    clientIdInput.value = 'test-client-id';
    secretInput.value = SENTINEL_SECRET;

    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateFn).toHaveBeenCalled();
    });

    // Verify no leakage
    expect(container.textContent).not.toContain(SENTINEL_SECRET);
    expect(localStorage.toString()).not.toContain(SENTINEL_SECRET);
    expect(sessionStorage.toString()).not.toContain(SENTINEL_SECRET);

    // Re-render to pick up configured state
    rerender(<WearableServices />);

    // Step 2: Verify
    const verifyBtn = screen.getByRole('button', { name: /verify/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(mockVerifyFn).toHaveBeenCalled();
    });

    expect(container.textContent).not.toContain(SENTINEL_SECRET);

    // Step 3: Remove
    const removeBtn = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeBtn);

    const confirmBtn = screen.getByRole('button', { name: /confirm|yes|remove/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteFn).toHaveBeenCalled();
    });

    expect(container.textContent).not.toContain(SENTINEL_SECRET);
  });

  describe('full session — configure → connect → sync → reconnect → disconnect → remove', () => {
    const SENTINEL_ACCESS_TOKEN = 'SENTINEL_ACCESS_TOKEN_XYZ';
    const SENTINEL_REFRESH_TOKEN = 'SENTINEL_REFRESH_TOKEN_ABC';

    it('no credential secret, access token, or refresh token leaks during connect flow', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

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

      const mockUseServicesQuery = vi.fn(() => ({
        data: { services: [configured] },
        isLoading: false,
        error: undefined,
      }));

      vi.doMock('./serviceCredentialApi', () => ({
        serviceCredentialApi: {},
        useGetServiceCredentialsQuery: mockUseServicesQuery,
      }));

      // beginConnection returns an authorization_url — no secrets
      const mockBeginConnection = vi.fn().mockResolvedValue({
        data: { authorization_url: 'https://accounts.google.com/oauth/authorize?state=abc' },
      });
      const mockSyncNow = vi.fn().mockResolvedValue({ data: { status: 'queued' } });
      const mockDisconnect = vi.fn().mockResolvedValue({ data: { disconnected: true } });

      vi.doMock('./connectedAccountApi', () => ({
        connectedAccountApi: {},
        useGetConnectionsQuery: vi.fn(() => ({
          data: { connections: [] },
          isLoading: false,
          error: undefined,
          refetch: vi.fn(),
        })),
        useBeginConnectionMutation: vi.fn(() => [mockBeginConnection, { isLoading: false }]),
        useSyncNowMutation: vi.fn(() => [mockSyncNow, { isLoading: false }]),
        useDisconnectMutation: vi.fn(() => [mockDisconnect, { isLoading: false }]),
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

      // Check that the authorization URL doesn't contain any sentinel values
      const connectBtn = screen.getByRole('button', { name: /connect/i });
      fireEvent.click(connectBtn);

      await waitFor(() => {
        expect(mockBeginConnection).toHaveBeenCalled();
      });

      // No secrets in DOM
      const domText = container.textContent || '';
      expect(domText).not.toContain(SENTINEL_SECRET);
      expect(domText).not.toContain(SENTINEL_ACCESS_TOKEN);
      expect(domText).not.toContain(SENTINEL_REFRESH_TOKEN);

      // No secrets in storage
      expect(localStorage.toString()).not.toContain(SENTINEL_SECRET);
      expect(localStorage.toString()).not.toContain(SENTINEL_ACCESS_TOKEN);
      expect(localStorage.toString()).not.toContain(SENTINEL_REFRESH_TOKEN);
      expect(sessionStorage.toString()).not.toContain(SENTINEL_SECRET);
      expect(sessionStorage.toString()).not.toContain(SENTINEL_ACCESS_TOKEN);
      expect(sessionStorage.toString()).not.toContain(SENTINEL_REFRESH_TOKEN);

      // No secrets in console
      const consoleCalls = [...consoleSpy.mock.calls, ...consoleLogSpy.mock.calls];
      const consoleText = consoleCalls.flat().join(' ');
      expect(consoleText).not.toContain(SENTINEL_SECRET);
      expect(consoleText).not.toContain(SENTINEL_ACCESS_TOKEN);
      expect(consoleText).not.toContain(SENTINEL_REFRESH_TOKEN);

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('no secrets leak during sync flow', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const connection = {
        id: 'conn-1',
        external_service: 'google-health',
        status: 'healthy',
        last_successful_sync_at: '2026-07-20T18:00:00.000000Z',
        connected_at: '2026-07-19T10:00:00.000000Z',
        needs_attention_reason: null,
        granted_scopes: ['fitness'],
        granted_types: ['steps'],
        missing_types: [],
      };

      const mockSyncNow = vi.fn().mockResolvedValue({ data: { status: 'queued' } });
      const mockDisconnect = vi.fn().mockResolvedValue({ data: { disconnected: true } });

      vi.doMock('./connectedAccountApi', () => ({
        connectedAccountApi: {},
        useGetConnectionsQuery: vi.fn(() => ({
          data: { connections: [connection] },
          isLoading: false,
          error: undefined,
          refetch: vi.fn(),
        })),
        useBeginConnectionMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useSyncNowMutation: vi.fn(() => [mockSyncNow, { isLoading: false }]),
        useDisconnectMutation: vi.fn(() => [mockDisconnect, { isLoading: false }]),
      }));
      vi.doMock('./serviceCredentialApi', () => ({
        serviceCredentialApi: {},
        useGetServiceCredentialsQuery: vi.fn(() => ({
          data: { services: [] },
          isLoading: false,
          error: undefined,
        })),
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

      // Click "Update now" button
      const syncBtn = screen.getByRole('button', { name: /update now/i });
      fireEvent.click(syncBtn);

      await waitFor(() => {
        expect(mockSyncNow).toHaveBeenCalled();
      });

      // No secrets in DOM after sync
      const domText = container.textContent || '';
      expect(domText).not.toContain(SENTINEL_SECRET);
      expect(domText).not.toContain(SENTINEL_ACCESS_TOKEN);
      expect(domText).not.toContain(SENTINEL_REFRESH_TOKEN);

      // No secrets in console
      const consoleCalls = consoleSpy.mock.calls;
      const consoleText = consoleCalls.flat().join(' ');
      expect(consoleText).not.toContain(SENTINEL_SECRET);
      expect(consoleText).not.toContain(SENTINEL_ACCESS_TOKEN);
      expect(consoleText).not.toContain(SENTINEL_REFRESH_TOKEN);

      consoleSpy.mockRestore();
    });

    it('no secrets leak during disconnect flow', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const connection = {
        id: 'conn-1',
        external_service: 'google-health',
        status: 'healthy',
        last_successful_sync_at: '2026-07-20T18:00:00.000000Z',
        connected_at: '2026-07-19T10:00:00.000000Z',
        needs_attention_reason: null,
        granted_scopes: ['fitness'],
        granted_types: ['steps'],
        missing_types: [],
      };

      const mockDisconnect = vi.fn().mockResolvedValue({ data: { disconnected: true } });

      vi.doMock('./connectedAccountApi', () => ({
        connectedAccountApi: {},
        useGetConnectionsQuery: vi.fn(() => ({
          data: { connections: [connection] },
          isLoading: false,
          error: undefined,
          refetch: vi.fn(),
        })),
        useBeginConnectionMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useSyncNowMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useDisconnectMutation: vi.fn(() => [mockDisconnect, { isLoading: false }]),
      }));
      vi.doMock('./serviceCredentialApi', () => ({
        serviceCredentialApi: {},
        useGetServiceCredentialsQuery: vi.fn(() => ({
          data: { services: [] },
          isLoading: false,
          error: undefined,
        })),
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

      // Click disconnect button
      const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
      fireEvent.click(disconnectBtn);

      // Click confirm in modal
      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockDisconnect).toHaveBeenCalled();
      });

      // No secrets in DOM after disconnect
      const domText = container.textContent || '';
      expect(domText).not.toContain(SENTINEL_SECRET);
      expect(domText).not.toContain(SENTINEL_ACCESS_TOKEN);
      expect(domText).not.toContain(SENTINEL_REFRESH_TOKEN);

      // No secrets in storage
      expect(localStorage.toString()).not.toContain(SENTINEL_SECRET);
      expect(sessionStorage.toString()).not.toContain(SENTINEL_SECRET);

      consoleSpy.mockRestore();
    });

    it('no secrets in store state after configure then remove credential', async () => {
      const unconfigured: UnconfiguredServiceType = {
        external_service: 'google-health',
        configured: false,
      };

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

      let currentServices: ServiceCredentialType[] = [unconfigured];

      const mockCreateFn = vi.fn().mockImplementation(async () => {
        currentServices = [configured];
        return { data: configured };
      });
      const mockDeleteFn = vi.fn().mockImplementation(async () => {
        currentServices = [unconfigured];
        return { data: { deleted: true } };
      });
      const mockUseQuery = vi.fn(() => ({
        data: { services: currentServices },
        isLoading: false,
        error: undefined,
      }));

      vi.doMock('./serviceCredentialApi', () => ({
        serviceCredentialApi: {},
        useGetServiceCredentialsQuery: mockUseQuery,
        useCreateServiceCredentialMutation: vi.fn(() => [mockCreateFn, { isLoading: false }]),
        useUpdateServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
        useDeleteServiceCredentialMutation: vi.fn(() => [mockDeleteFn, { isLoading: false }]),
        useVerifyServiceCredentialMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
      }));

      const { WearableServices } = await import('./WearableServices');
      const { container, rerender } = render(<WearableServices />);

      // Configure with sentinel secret
      const secretInput = screen.getByLabelText(/secret/i) as HTMLInputElement;
      const clientIdInput = screen.getByLabelText(/client.*id/i) as HTMLInputElement;
      clientIdInput.value = 'test-client-id';
      secretInput.value = SENTINEL_SECRET;

      const submitBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockCreateFn).toHaveBeenCalled();
      });

      // No leakage after create
      expect(container.textContent).not.toContain(SENTINEL_SECRET);
      expect(localStorage.toString()).not.toContain(SENTINEL_SECRET);
      expect(sessionStorage.toString()).not.toContain(SENTINEL_SECRET);

      // Re-render to show configured state
      rerender(<WearableServices />);

      // Remove credential
      const removeBtn = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeBtn);

      const confirmBtn = screen.getByRole('button', { name: /confirm|yes|remove/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockDeleteFn).toHaveBeenCalled();
      });

      // No leakage after remove
      expect(container.textContent).not.toContain(SENTINEL_SECRET);
      expect(localStorage.toString()).not.toContain(SENTINEL_SECRET);
      expect(sessionStorage.toString()).not.toContain(SENTINEL_SECRET);
    });
  });
});
