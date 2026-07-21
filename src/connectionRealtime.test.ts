import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import type { ConnectionType } from './types';

// A real RTK Query store, not a mocked `util` — a handler that builds the
// right thunk but never dispatches it passes against mocks and does nothing
// in the browser.

vi.mock('./config', () => ({
  backend: {
    url: 'http://localhost:8000',
    token: 'test-token',
    user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
  },
  updateFrontend: () => {},
}));

vi.mock('./callbackUrl', () => ({
  CONNECTION_CALLBACK_PATH: '/clarion-app/life-log/connected-services/callback',
  callbackUrlFor: (service: string) =>
    `https://example.com/clarion-app/life-log/connected-services/callback/${service}`,
}));

const registered: { event: string; handler: (event: any, dispatch: any) => void }[] = [];
let fetchCount = 0;

vi.mock('@clarion-app/frontend-base', () => ({
  createBackendConfig: () => ({
    backend: { url: 'http://localhost:8000', user: { id: '', name: '', email: '' } },
    updateFrontend: () => {},
  }),
  createBaseQuery: () => async (args: any) => {
    const url = typeof args === 'string' ? args : args?.url;
    if (url === '/connected-accounts') {
      fetchCount += 1;
      return { data: { connections: seeded } };
    }
    return { data: {} };
  },
  registerUserChannelHandler: (h: any) => registered.push(h),
}));

const makeConnection = (overrides: Partial<ConnectionType> = {}): ConnectionType => ({
  id: 'conn-1',
  external_service: 'google-health',
  status: 'healthy',
  last_successful_sync_at: '2026-07-21T06:00:00.000000Z',
  connected_at: '2026-07-14T11:20:03.000000Z',
  needs_attention_reason: null,
  granted_scopes: ['activity_and_fitness'],
  granted_types: ['steps', 'heart_rate'],
  missing_types: ['weight'],
  ...overrides,
});

let seeded: ConnectionType[] = [];

const { connectedAccountApi } = await import('./connectedAccountApi');
// Import triggers the side-effect registration.
await import('./connectionRealtime');

function createTestStore() {
  return configureStore({
    reducer: {
      [connectedAccountApi.reducerPath]: connectedAccountApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(connectedAccountApi.middleware),
  });
}

function cachedIds(store: ReturnType<typeof createTestStore>) {
  return connectedAccountApi.endpoints.getConnections
    .select(undefined)(store.getState() as any)
    .data?.connections.map((c) => c.id);
}

function cached(store: ReturnType<typeof createTestStore>) {
  return connectedAccountApi.endpoints.getConnections.select(undefined)(
    store.getState() as any,
  ).data?.connections;
}

describe('connectionRealtime — ConnectedAccountStatusChanged handler', () => {
  beforeEach(() => {
    seeded = [makeConnection()];
    fetchCount = 0;
  });

  it('registers a handler for the fully-qualified event name', () => {
    expect(registered).toHaveLength(1);
    expect(registered[0].event).toBe(
      '.ClarionApp\\LifeLogBackend\\Events\\ConnectedAccountStatusChanged',
    );
  });

  it('replaces the cached entry in place when the id is known', async () => {
    const store = createTestStore();
    await store.dispatch(connectedAccountApi.endpoints.getConnections.initiate());

    expect(cached(store)?.[0].status).toBe('healthy');

    const pushed = makeConnection({
      status: 'needs_attention',
      needs_attention_reason: 'authorization_unrenewable',
      last_successful_sync_at: '2026-07-21T09:00:00.000000Z',
    });
    registered[0].handler(pushed, store.dispatch);

    expect(cached(store)).toHaveLength(1);
    expect(cached(store)?.[0]).toEqual(pushed);
  });

  it('leaves sibling entries untouched', async () => {
    seeded = [makeConnection(), makeConnection({ id: 'conn-2', external_service: 'fitbit' })];
    const store = createTestStore();
    await store.dispatch(connectedAccountApi.endpoints.getConnections.initiate());

    registered[0].handler(makeConnection({ status: 'needs_attention' }), store.dispatch);

    const after = cached(store);
    expect(after).toHaveLength(2);
    expect(after?.[0].status).toBe('needs_attention');
    expect(after?.[1].id).toBe('conn-2');
    expect(after?.[1].status).toBe('healthy');
  });

  it('an unknown id does not corrupt the cache and falls through to invalidation', async () => {
    const store = createTestStore();
    const subscription = store.dispatch(
      connectedAccountApi.endpoints.getConnections.initiate(),
    );
    await subscription;
    expect(fetchCount).toBe(1);

    // A connection made in another tab — not in this cache.
    seeded = [makeConnection(), makeConnection({ id: 'conn-elsewhere' })];
    registered[0].handler(makeConnection({ id: 'conn-elsewhere' }), store.dispatch);

    // The failed in-place update left the cache exactly as it was…
    expect(cachedIds(store)).toEqual(['conn-1']);

    // …and the invalidation refetches for the live subscription.
    await vi.waitFor(() => expect(fetchCount).toBe(2));
    await vi.waitFor(() =>
      expect(cachedIds(store)).toEqual(['conn-1', 'conn-elsewhere']),
    );
    subscription.unsubscribe();
  });

  it('invalidates when there is no cache entry at all', async () => {
    const store = createTestStore();

    expect(() =>
      registered[0].handler(makeConnection(), store.dispatch),
    ).not.toThrow();
    expect(cached(store)).toBeUndefined();
  });

  it('ignores a payload without an id rather than throwing', async () => {
    const store = createTestStore();
    await store.dispatch(connectedAccountApi.endpoints.getConnections.initiate());

    expect(() => registered[0].handler({}, store.dispatch)).not.toThrow();
    expect(() => registered[0].handler(null, store.dispatch)).not.toThrow();
    expect(cached(store)?.[0].status).toBe('healthy');
  });

  it('a duplicate delivery is harmless — the payload is a full snapshot', async () => {
    const store = createTestStore();
    await store.dispatch(connectedAccountApi.endpoints.getConnections.initiate());

    const pushed = makeConnection({
      status: 'needs_attention',
      needs_attention_reason: 'sync_failures',
    });
    registered[0].handler(pushed, store.dispatch);
    registered[0].handler(pushed, store.dispatch);

    expect(cached(store)).toHaveLength(1);
    expect(cached(store)?.[0]).toEqual(pushed);
  });
});
