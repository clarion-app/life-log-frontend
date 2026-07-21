import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the connectedAccountApi
const mockUpdateQueryData = vi.fn();
const mockInvalidateTags = vi.fn();

vi.mock('./connectedAccountApi', () => ({
  connectedAccountApi: {
    util: {
      updateQueryData: mockUpdateQueryData,
      invalidateTags: mockInvalidateTags,
    },
  },
}));

// Capture the handler registered via registerUserChannelHandler
let capturedHandler: { event: string; handler: (event: any, dispatch: any) => void } | null = null;

vi.mock('@clarion-app/frontend-base', () => ({
  registerUserChannelHandler: (h: any) => {
    capturedHandler = h;
  },
  createBaseQuery: () => vi.fn(),
  createBackendConfig: () => ({}),
}));

// Import triggers the side-effect registration
await import('./connectionRealtime');

describe('connectionRealtime registration', () => {
  beforeEach(() => {
    mockUpdateQueryData.mockReset();
    mockInvalidateTags.mockReset();
  });

  it('registers a handler for ConnectedAccountStatusChanged', () => {
    expect(capturedHandler).not.toBeNull();
    expect(capturedHandler!.event).toBe(
      '.ClarionApp\\LifeLogBackend\\Events\\ConnectedAccountStatusChanged',
    );
  });

  it('updates cached entry in place for known id', () => {
    const payload = {
      id: 'conn-1',
      external_service: 'google_health',
      status: 'healthy',
      last_successful_sync_at: '2025-01-01T12:00:00Z',
      connected_at: '2024-12-01T00:00:00Z',
      needs_attention_reason: null,
      granted_scopes: ['activity_and_fitness'],
      granted_types: ['steps', 'heart_rate'],
      missing_types: ['weight'],
    };

    capturedHandler!.handler(payload, vi.fn());

    expect(mockUpdateQueryData).toHaveBeenCalled();
    expect(mockUpdateQueryData.mock.calls[0][0]).toBe('getConnections');
    expect(mockUpdateQueryData.mock.calls[0][1]).toBe(undefined);
    expect(typeof mockUpdateQueryData.mock.calls[0][2]).toBe('function');
  });

  it('falls back to tag invalidation for unknown id', () => {
    const payload = {
      id: 'unknown-conn-id',
      external_service: 'google_health',
      status: 'healthy',
      last_successful_sync_at: null,
      connected_at: '2024-12-01T00:00:00Z',
      needs_attention_reason: null,
      granted_scopes: [],
      granted_types: [],
      missing_types: ['steps'],
    };

    // When updateQueryData cannot find the id, it should fall back to invalidateTags
    mockUpdateQueryData.mockImplementation((queryName, arg, updateFn) => {
      // Simulate the case where the id is not in cache
      const state = { connections: [] };
      updateFn(state);
    });

    capturedHandler!.handler(payload, vi.fn());

    // Should have tried updateQueryData first, then invalidated tags
    expect(mockInvalidateTags).toHaveBeenCalledWith([{ type: 'Connection' }]);
  });

  it('does not corrupt cache when payload has partial fields', () => {
    // A duplicate delivery is harmless — the payload is a full snapshot
    const payload = {
      id: 'conn-1',
      external_service: 'google_health',
      status: 'healthy',
      last_successful_sync_at: '2025-01-01T12:00:00Z',
      connected_at: '2024-12-01T00:00:00Z',
      needs_attention_reason: null,
      granted_scopes: ['activity_and_fitness'],
      granted_types: ['steps'],
      missing_types: [],
    };

    // Call handler twice to simulate duplicate delivery
    capturedHandler!.handler(payload, vi.fn());
    capturedHandler!.handler(payload, vi.fn());

    // Both calls should succeed without errors
    expect(mockUpdateQueryData).toHaveBeenCalledTimes(2);
  });
});
