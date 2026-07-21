import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Shared mutable state for react-router-dom mocks
const routerState = {
  params: { service: 'google-health' },
  searchParams: new URLSearchParams('code=AUTH_CODE_123&state=abc123'),
  setSearchParams: vi.fn(),
  navigateFn: vi.fn(),
};

// Shared mutable state for API mocks - unwrap returns a promise
const apiState = {
  completeResult: Promise.resolve({ status: 'completed', connection: {} }),
  beginResult: Promise.resolve({ authorization_url: 'https://auth.url' }),
  completeCalls: [] as any[],
  beginCalls: [] as any[],
  completeLoading: false,
  beginLoading: false,
};

const mockCompleteFn = vi.fn((args) => {
  apiState.completeCalls.push(args);
  return { unwrap: () => apiState.completeResult };
});

const mockBeginFn = vi.fn((args) => {
  apiState.beginCalls.push(args);
  return { unwrap: () => apiState.beginResult };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => routerState.params,
    useSearchParams: () => [routerState.searchParams, routerState.setSearchParams],
    useNavigate: () => routerState.navigateFn,
  };
});

vi.mock('./connectedAccountApi', () => ({
  connectedAccountApi: {},
  useCompleteConnectionMutation: () => [mockCompleteFn, { isLoading: apiState.completeLoading, error: apiState.completeError }],
  useBeginConnectionMutation: () => [mockBeginFn, { isLoading: apiState.beginLoading }],
  useDisconnectMutation: () => [vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ disconnected: true }) }), { isLoading: false }],
}));

describe('ConnectionCallback — OAuth completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerState.params = { service: 'google-health' };
    routerState.searchParams = new URLSearchParams('code=AUTH_CODE_123&state=abc123');
    routerState.setSearchParams.mockReset();
    routerState.navigateFn.mockReset();
    apiState.completeCalls = [];
    apiState.beginCalls = [];
    apiState.completeLoading = false;
    apiState.beginLoading = false;
    apiState.completeResult = Promise.resolve({ status: 'completed', connection: {} });
    apiState.beginResult = Promise.resolve({ authorization_url: 'https://auth.url' });
    vi.spyOn(window, 'open').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls completeConnection with code and state from query string', async () => {
    const { ConnectionCallback } = await import('./ConnectionCallback');
    render(
      <MemoryRouter>
        <ConnectionCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(apiState.completeCalls.length).toBe(1);
      expect(apiState.completeCalls[0]).toEqual({
        external_service: 'google-health',
        state: 'abc123',
        code: 'AUTH_CODE_123',
      });
    });
  });

  it('renders success after completion', async () => {
    const { ConnectionCallback } = await import('./ConnectionCallback');
    render(
      <MemoryRouter>
        <ConnectionCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/your wearable account is now connected/i)).toBeInTheDocument();
    });
  });

  it('renders error on 422 connection_not_completed and shows retry button', async () => {
    apiState.completeResult = Promise.reject({ status: 422, data: { error: 'connection_not_completed' } });

    const { ConnectionCallback } = await import('./ConnectionCallback');
    render(
      <MemoryRouter>
        <ConnectionCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/the connection was not completed/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders error on other failures and shows retry button', async () => {
    apiState.completeResult = Promise.reject({ status: 400, data: { error: 'invalid_grant' } });

    const { ConnectionCallback } = await import('./ConnectionCallback');
    render(
      <MemoryRouter>
        <ConnectionCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/the connection was not completed/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders loading while processing', async () => {
    // Never resolve - keep in processing state
    apiState.completeResult = new Promise(() => {});

    const { ConnectionCallback } = await import('./ConnectionCallback');
    render(
      <MemoryRouter>
        <ConnectionCallback />
      </MemoryRouter>
    );

    expect(screen.getByText(/processing your connection/i)).toBeInTheDocument();
  });

  it('missing code parameter shows not completed', async () => {
    routerState.searchParams = new URLSearchParams('state=abc123');

    const { ConnectionCallback } = await import('./ConnectionCallback');
    render(
      <MemoryRouter>
        <ConnectionCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/the connection was not completed/i)).toBeInTheDocument();
    });
  });

  it('access_denied error shows not completed without retry and does NOT call endpoint', async () => {
    routerState.searchParams = new URLSearchParams('error=access_denied');

    const { ConnectionCallback } = await import('./ConnectionCallback');
    render(
      <MemoryRouter>
        <ConnectionCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/the connection was not completed/i)).toBeInTheDocument();
    });

    // access_denied must NOT call the endpoint (no code to exchange)
    expect(apiState.completeCalls.length).toBe(0);

    // access_denied is NOT retryable
    const retryButtons = screen.queryAllByRole('button', { name: /try again/i });
    expect(retryButtons.length).toBe(0);
  });

  it('plaintext state is never logged or stored', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { ConnectionCallback } = await import('./ConnectionCallback');
    render(
      <MemoryRouter>
        <ConnectionCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(apiState.completeCalls.length).toBe(1);
    });

    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('AUTH_CODE_123'));
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('abc123'));
    expect(localStorage.toString()).not.toContain('AUTH_CODE_123');
    expect(localStorage.toString()).not.toContain('abc123');
    expect(sessionStorage.toString()).not.toContain('AUTH_CODE_123');
    expect(sessionStorage.toString()).not.toContain('abc123');

    consoleSpy.mockRestore();
  });
});
