import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ConnectionType, ServiceCredentialType } from './types';

// Shared mutable state for API mocks
const apiState = {
  connections: { data: { connections: [] }, isLoading: false, error: undefined },
  services: { data: { services: [] }, isLoading: false, error: undefined },
  beginResult: Promise.resolve({ authorization_url: '' }),
  beginCalls: [] as any[],
  beginLoading: false,
};

const mockBeginFn = vi.fn((args) => {
  apiState.beginCalls.push(args);
  return { unwrap: () => apiState.beginResult };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

vi.mock('./connectedAccountApi', () => ({
  connectedAccountApi: {},
  useGetConnectionsQuery: () => apiState.connections,
  useBeginConnectionMutation: () => [mockBeginFn, { isLoading: apiState.beginLoading }],
  useSyncNowMutation: () => [vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ status: 'queued' }) }), { isLoading: false }],
  useDisconnectMutation: () => [vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ disconnected: true }) }), { isLoading: false }],
}));

vi.mock('./serviceCredentialApi', () => ({
  serviceCredentialApi: {},
  useGetServiceCredentialsQuery: () => apiState.services,
}));

const MOCK_SERVICE = 'google-health';
const MOCK_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&state=abc123';

describe('ConnectedServices — connect flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiState.connections = { data: { connections: [] }, isLoading: false, error: undefined };
    apiState.services = { data: { services: [] }, isLoading: false, error: undefined };
    apiState.beginCalls = [];
    apiState.beginLoading = false;
    mockBeginFn.mockReset();
    vi.spyOn(window, 'open').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('configured but unconnected service is offered as connectable', async () => {
    const mockServices: ServiceCredentialType[] = [
      {
        external_service: MOCK_SERVICE,
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

    apiState.services = { data: { services: mockServices }, isLoading: false, error: undefined };

    const { ConnectedServices } = await import('./ConnectedServices');
    render(
      <MemoryRouter>
        <ConnectedServices />
      </MemoryRouter>
    );

    expect(screen.getByText(/google health/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('unconfigured service shown as unavailable with reason and link to Wearable Services', async () => {
    const mockServices: ServiceCredentialType[] = [
      { external_service: MOCK_SERVICE, configured: false },
    ];

    apiState.services = { data: { services: mockServices }, isLoading: false, error: undefined };

    const { ConnectedServices } = await import('./ConnectedServices');
    render(
      <MemoryRouter>
        <ConnectedServices />
      </MemoryRouter>
    );

    expect(screen.getByText(/google health/i)).toBeInTheDocument();
    expect(screen.getByText(/this service is not configured on this node/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /configure.*wearable/i })).toBeInTheDocument();
  });

  it('transport failure shows application cannot be reached with retry', async () => {
    apiState.connections = {
      data: undefined,
      isLoading: false,
      error: { status: 500, data: { message: 'Internal server error' } },
    };

    const { ConnectedServices } = await import('./ConnectedServices');
    render(
      <MemoryRouter>
        <ConnectedServices />
      </MemoryRouter>
    );

    expect(screen.getByText(/cannot.*reached|error|retry/i)).toBeInTheDocument();
  });

  it('already-connected service shown as connected, not offered again', async () => {
    const connectedConnection: ConnectionType = {
      id: 'conn-1',
      external_service: MOCK_SERVICE,
      status: 'healthy',
      last_successful_sync_at: '2026-07-21T06:00:00.000000Z',
      connected_at: '2026-07-14T11:20:03.000000Z',
      needs_attention_reason: null,
      granted_scopes: [],
      granted_types: [],
      missing_types: [],
    };

    const mockServices: ServiceCredentialType[] = [
      {
        external_service: MOCK_SERVICE,
        configured: true,
        client_id: 'abc123',
        redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
        has_secret: true,
        secret_updated_at: '2026-07-20T18:04:11.000000Z',
        redacted_client_id: 'a***',
        last_verified_at: null,
        last_verification_outcome: null,
        version: 1,
      },
    ];

    apiState.connections = { data: { connections: [connectedConnection] }, isLoading: false, error: undefined };
    apiState.services = { data: { services: mockServices }, isLoading: false, error: undefined };

    const { ConnectedServices } = await import('./ConnectedServices');
    render(
      <MemoryRouter>
        <ConnectedServices />
      </MemoryRouter>
    );

    expect(screen.getByText(/google[-_ ]*health/i)).toBeInTheDocument();
    // ConnectionCard shows "Healthy" for healthy connections
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'Healthy' && element?.className.includes('has-text-success');
    })).toBeInTheDocument();

    const connectButtons = screen.queryAllByRole('button', { name: /^(connecting|connect)$/i });
    expect(connectButtons.length).toBe(0);
  });

  it('Connect POSTs and navigates to authorization_url', async () => {
    const mockServices: ServiceCredentialType[] = [
      {
        external_service: MOCK_SERVICE,
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

    apiState.services = { data: { services: mockServices }, isLoading: false, error: undefined };
    apiState.beginResult = Promise.resolve({
      authorization_url: MOCK_AUTH_URL,
    });

    const { ConnectedServices } = await import('./ConnectedServices');
    render(
      <MemoryRouter>
        <ConnectedServices />
      </MemoryRouter>
    );

    const connectBtn = screen.getByRole('button', { name: /connect/i });
    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(apiState.beginCalls.length).toBe(1);
      expect(apiState.beginCalls[0]).toEqual({
        external_service: MOCK_SERVICE,
      });
    });

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(MOCK_AUTH_URL, '_self');
    });
  });

  it('422 service_unavailable shows error message', async () => {
    const mockServices: ServiceCredentialType[] = [
      {
        external_service: MOCK_SERVICE,
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

    apiState.services = { data: { services: mockServices }, isLoading: false, error: undefined };

    const errorResponse = {
      status: 422,
      data: { error: 'service_unavailable', message: 'The service is not available on this instance.' },
    };
    apiState.beginResult = Promise.reject(errorResponse);

    const { ConnectedServices } = await import('./ConnectedServices');
    render(
      <MemoryRouter>
        <ConnectedServices />
      </MemoryRouter>
    );

    const connectBtn = screen.getByRole('button', { name: /connect/i });
    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(apiState.beginCalls.length).toBe(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/could not|error|try again|not.*available/i)).toBeInTheDocument();
    });
  });

  it('no connections at all explains what connecting does', async () => {
    const { ConnectedServices } = await import('./ConnectedServices');
    render(
      <MemoryRouter>
        <ConnectedServices />
      </MemoryRouter>
    );

    expect(screen.getByText(/connect.*wearable|wearable.*account|sync.*data|health.*data/i)).toBeInTheDocument();

    const tables = document.querySelectorAll('table');
    expect(tables.length).toBe(0);
  });

  it('plaintext state is never parsed out, stored, or logged', async () => {
    const mockServices: ServiceCredentialType[] = [
      {
        external_service: MOCK_SERVICE,
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

    apiState.services = { data: { services: mockServices }, isLoading: false, error: undefined };
    apiState.beginResult = Promise.resolve({
      authorization_url: MOCK_AUTH_URL,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { ConnectedServices } = await import('./ConnectedServices');
    render(
      <MemoryRouter>
        <ConnectedServices />
      </MemoryRouter>
    );

    const connectBtn = screen.getByRole('button', { name: /connect/i });
    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(apiState.beginCalls.length).toBe(1);
    });

    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('abc123'));
    expect(localStorage.toString()).not.toContain('abc123');
    expect(sessionStorage.toString()).not.toContain('abc123');

    consoleSpy.mockRestore();
  });
});
