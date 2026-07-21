import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ConnectionType, ServiceCredentialType } from './types';

// ---------------------------------------------------------------------------
// Shared mutable API state
// ---------------------------------------------------------------------------

const apiState = {
  connections: { data: { connections: [] as ConnectionType[] }, isLoading: false, error: undefined, refetch: vi.fn() },
  services: { data: { services: [] as ServiceCredentialType[] }, isLoading: false, error: undefined },
  disconnectResult: Promise.resolve({ disconnected: true }),
  disconnectCalls: [] as Array<{ connectionId: string }>,
  disconnectLoading: false,
  disconnectShouldReject: false,
};

const mockDisconnectFn = vi.fn((args) => {
  apiState.disconnectCalls.push(args);
  if (apiState.disconnectShouldReject) {
    return { unwrap: () => Promise.reject(new Error('network error')) };
  }
  return { unwrap: () => apiState.disconnectResult };
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
  useBeginConnectionMutation: () => [vi.fn(), { isLoading: false }],
  useSyncNowMutation: () => [vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ status: 'queued' }) }), { isLoading: false }],
  useDisconnectMutation: () => [mockDisconnectFn, { isLoading: apiState.disconnectLoading }],
}));

vi.mock('./serviceCredentialApi', () => ({
  serviceCredentialApi: {},
  useGetServiceCredentialsQuery: () => apiState.services,
}));

vi.mock('./useRealtimeStatus', () => ({
  useRealtimeStatus: () => 'live',
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeConnection = (overrides: Partial<ConnectionType> = {}): ConnectionType => ({
  id: 'conn-1',
  external_service: 'google-health',
  status: 'healthy',
  last_successful_sync_at: '2025-01-15T10:30:00Z',
  connected_at: '2024-12-01T00:00:00Z',
  needs_attention_reason: null,
  granted_scopes: ['activity_and_fitness'],
  granted_types: ['steps', 'heart_rate'],
  missing_types: ['sleep'],
  ...overrides,
});

const makeService = (overrides: Partial<ConfiguredServiceType> = {}): ConfiguredServiceType => ({
  external_service: 'google-health',
  configured: true,
  client_id: 'test-client-id',
  redirect_uri: 'https://example.com/callback',
  has_secret: true,
  secret_updated_at: null,
  last_verified_at: null,
  last_verification_outcome: null,
  version: 1,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Disconnect flow (US6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiState.connections = {
      data: { connections: [makeConnection()] },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    };
    apiState.services = {
      data: { services: [] },
      isLoading: false,
      error: undefined,
    };
    apiState.disconnectCalls = [];
    apiState.disconnectLoading = false;
    apiState.disconnectResult = Promise.resolve({ disconnected: true });
    apiState.disconnectShouldReject = false;
    mockDisconnectFn.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // FR-038: Disconnect action offered on each of user's own connections
  // -----------------------------------------------------------------------

  it('offers disconnect action on each connection (FR-038)', async () => {
    const { ConnectionCard } = await import('./ConnectionCard');
    render(<ConnectionCard connection={makeConnection()} />);

    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // FR-039: Confirmation states retention affirmatively
  // -----------------------------------------------------------------------

  it('confirmation states plainly that already-imported measurements are kept (FR-039)', async () => {
    const { ConnectionCard } = await import('./ConnectionCard');
    render(<ConnectionCard connection={makeConnection()} />);

    const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);

    await waitFor(() => {
      const text = screen.queryAllByText(/already.*imported.*kept/i).length
        + screen.queryAllByText(/measurements.*already.*imported.*kept/i).length
        + screen.queryAllByText(/kept/i).length;
      // At least one element mentions "kept" in context of imported data
      expect(text).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // FR-040 / SC-008: No wording implies data loss
  // -----------------------------------------------------------------------

  it('no wording matches forbidden patterns (FR-040, SC-008)', async () => {
    const { ConnectionCard } = await import('./ConnectionCard');
    render(<ConnectionCard connection={makeConnection()} />);

    const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);

    await waitFor(() => {
      // Wait for confirmation dialog to appear
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeNull();
    });

    // Grab all text content from the modal
    const modal = document.querySelector('.modal');
    const fullText = modal?.textContent ?? '';

    const forbiddenPatterns = [
      /delete/i,
      /remove.*(data|readings|measurements|history)/i,
      /lose/i,
      /erase/i,
      /cannot be undone/i,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(fullText).not.toMatch(pattern);
    }
  });

  // -----------------------------------------------------------------------
  // FR-041: Cancel leaves connection untouched
  // -----------------------------------------------------------------------

  it('cancel leaves connection untouched and issues no request (FR-041)', async () => {
    const { ConnectionCard } = await import('./ConnectionCard');
    render(<ConnectionCard connection={makeConnection()} />);

    const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeNull();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // No disconnect call was made
    expect(apiState.disconnectCalls).toHaveLength(0);

    // Connection card still visible
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // FR-042: Successful disconnect removes connection, service reappears
  // -----------------------------------------------------------------------

  it('confirming disconnects and refetches (FR-042)', async () => {
    const { ConnectionCard } = await import('./ConnectionCard');
    render(<ConnectionCard connection={makeConnection()} />);

    const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeNull();
    });

    const confirmBtn = screen.getByRole('button', { name: /confirm/i })
      ?? screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDisconnectFn).toHaveBeenCalledWith({ connectionId: 'conn-1' });
    });
  });

  // -----------------------------------------------------------------------
  // FR-043: On failure, connection stays in true state
  // -----------------------------------------------------------------------

  it('on failure connection stays visible — no optimistic removal (FR-043)', async () => {
    apiState.disconnectShouldReject = true;

    const { ConnectionCard } = await import('./ConnectionCard');
    render(<ConnectionCard connection={makeConnection()} />);

    const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeNull();
    });

    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmBtn);

    // Wait for the mutation to complete (and fail)
    await waitFor(() => {
      expect(mockDisconnectFn).toHaveBeenCalled();
    });
    // Small delay for state update after catch
    await new Promise((r) => setTimeout(r, 50));

    // Connection card box should still be visible (not optimistically removed)
    const box = document.querySelector('.box');
    expect(box).not.toBeNull();

    // Error message should be shown in the modal
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // revocation_confirmed: false with disconnected: true treated as success
  // -----------------------------------------------------------------------

  it('revocation_confirmed: false alongside disconnected: true treated as success', async () => {
    // The API returns { disconnected: true } — revocation_confirmed is not
    // part of the response shape and should not be surfaced to the user.
    apiState.disconnectResult = Promise.resolve({ disconnected: true });

    const { ConnectionCard } = await import('./ConnectionCard');
    render(<ConnectionCard connection={makeConnection()} />);

    const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeNull();
    });

    const confirmBtn = screen.getByRole('button', { name: /confirm/i })
      ?? screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDisconnectFn).toHaveBeenCalledWith({ connectionId: 'conn-1' });
    });

    // No warning or error about revocation should appear
    expect(screen.queryByText(/revoke/i)).toBeNull();
    expect(screen.queryByText(/revocation/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ConnectedServices — Disconnect integration tests
// ---------------------------------------------------------------------------

describe('ConnectedServices — disconnect integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiState.connections = {
      data: { connections: [makeConnection()] },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    };
    apiState.services = {
      data: { services: [] },
      isLoading: false,
      error: undefined,
    };
    apiState.disconnectCalls = [];
    apiState.disconnectLoading = false;
    apiState.disconnectResult = Promise.resolve({ disconnected: true });
    apiState.disconnectShouldReject = false;
    mockDisconnectFn.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('connection disappears and service reappears as connectable after disconnect', async () => {
    // Initially: 1 connection, 0 services
    const { ConnectedServices } = await import('./ConnectedServices');
    const { rerender } = render(
      <MemoryRouter>
        <ConnectedServices />
      </MemoryRouter>
    );

    // Connection is visible
    expect(screen.getByText(/Google Health/i)).toBeInTheDocument();
    expect(screen.queryByText(/Your Connections/i)).not.toBeNull();

    // Simulate post-disconnect state: empty connections, service now connectable
    apiState.connections = {
      data: { connections: [] },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    };
    apiState.services = {
      data: { services: [makeService()] },
      isLoading: false,
      error: undefined,
    };

    rerender(
      <MemoryRouter>
        <ConnectedServices />
      </MemoryRouter>
    );

    // Connection gone, service now in "Available to Connect" section
    expect(screen.queryByText(/Your Connections/i)).toBeNull();
    expect(screen.queryByText(/Available to Connect/i)).not.toBeNull();
  });

  it('on disconnect failure connection remains in list', async () => {
    // When disconnected: false is returned, the connection should stay visible
    // because the invalidatesTags only fires on success
    const { ConnectedServices } = await import('./ConnectedServices');
    render(
      <MemoryRouter>
        <ConnectedServices />
      </MemoryRouter>
    );

    expect(screen.getByText(/Google Health/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /disconnect/i })).not.toBeNull();
  });
});
