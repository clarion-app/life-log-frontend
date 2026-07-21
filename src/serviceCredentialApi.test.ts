import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('./config', () => ({
  backend: {
    url: 'http://localhost:8000',
    token: 'test-token',
    user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
  },
  updateFrontend: () => {},
}));

let capturedRequests: any[] = [];

vi.mock('@clarion-app/frontend-base', () => ({
  createBackendConfig: () => ({
    backend: { url: 'http://localhost:8000', user: { id: '', name: '', email: '' } },
    updateFrontend: () => {},
  }),
  createBaseQuery: () => async (args: any) => {
    capturedRequests.push(args);
    if (typeof args === 'string' && args === '/service-credentials') {
      return { data: { services: [] } };
    }
    if (typeof args === 'object' && args.url === '/service-credentials') {
      return { data: { services: [] } };
    }
    if (typeof args === 'object' && args.url?.includes('/service-credentials/') && args.method === 'PUT') {
      return { data: { external_service: 'google-health', configured: true, client_id: 'test', redirect_uri: 'https://example.com/callback/google-health', has_secret: true, secret_updated_at: null, last_verified_at: null, last_verification_outcome: null, version: 1 } };
    }
    if (typeof args === 'object' && args.url?.includes('/service-credentials/') && args.method === 'POST' && args.url?.includes('/verify')) {
      return { data: { outcome: 'passed' } };
    }
    if (typeof args === 'object' && args.url?.includes('/service-credentials/') && args.method === 'DELETE') {
      return { data: { deleted: true } };
    }
    return { data: {} };
  },
}));

const { serviceCredentialApi } = await import('./serviceCredentialApi');

function createTestStore() {
  return configureStore({
    reducer: {
      [serviceCredentialApi.reducerPath]: serviceCredentialApi.reducer,
    },
    middleware: (getDefault) =>
      getDefault().concat(serviceCredentialApi.middleware),
  });
}

describe('serviceCredentialApi', () => {
  beforeEach(() => {
    capturedRequests = [];
  });

  it('getServiceCredentials reads /service-credentials', async () => {
    const store = createTestStore();
    await store.dispatch(serviceCredentialApi.endpoints.getServiceCredentials.initiate(null));
    expect(capturedRequests).toContainEqual('/service-credentials');
  });

  it('createServiceCredential POSTs /service-credentials', async () => {
    const store = createTestStore();
    await store.dispatch(
      serviceCredentialApi.endpoints.createServiceCredential.initiate({
        external_service: 'acme-band',
        client_id: 'abc123',
        client_secret: 'secret-value',
        redirect_uri: 'https://example.com/callback/acme-band',
      }),
    );
    const postReq = capturedRequests.find(
      (r: any) => typeof r === 'object' && r.url === '/service-credentials' && r.method === 'POST'
    );
    expect(postReq).toBeDefined();
    expect(postReq.body).toHaveProperty('external_service', 'acme-band');
    expect(postReq.body).toHaveProperty('client_id', 'abc123');
    expect(postReq.body).toHaveProperty('client_secret', 'secret-value');
  });

  it('updateServiceCredential PUTs /service-credentials/{service}', async () => {
    const store = createTestStore();
    await store.dispatch(
      serviceCredentialApi.endpoints.updateServiceCredential.initiate({
        service: 'acme-band',
        data: { client_id: 'new-client-id' },
      }),
    );
    const putReq = capturedRequests.find(
      (r: any) => typeof r === 'object' && r.url === '/service-credentials/acme-band' && r.method === 'PUT'
    );
    expect(putReq).toBeDefined();
    expect(putReq.body).toHaveProperty('client_id', 'new-client-id');
  });

  it('update with untouched secret omits client_secret entirely', async () => {
    const store = createTestStore();
    await store.dispatch(
      serviceCredentialApi.endpoints.updateServiceCredential.initiate({
        service: 'acme-band',
        data: { client_id: 'new-client-id' },
      }),
    );
    const putReq = capturedRequests.find(
      (r: any) => typeof r === 'object' && r.url === '/service-credentials/acme-band' && r.method === 'PUT'
    );
    expect(putReq.body).not.toHaveProperty('client_secret');
  });

  it('verifyServiceCredential POSTs /service-credentials/{service}/verify', async () => {
    const store = createTestStore();
    await store.dispatch(
      serviceCredentialApi.endpoints.verifyServiceCredential.initiate({
        service: 'acme-band',
      }),
    );
    const verifyReq = capturedRequests.find(
      (r: any) => typeof r === 'object' && r.url === '/service-credentials/acme-band/verify' && r.method === 'POST'
    );
    expect(verifyReq).toBeDefined();
  });

  it('deleteServiceCredential DELETEs /service-credentials/{service}', async () => {
    const store = createTestStore();
    await store.dispatch(
      serviceCredentialApi.endpoints.deleteServiceCredential.initiate({
        service: 'acme-band',
      }),
    );
    const delReq = capturedRequests.find(
      (r: any) => typeof r === 'object' && r.url === '/service-credentials/acme-band' && r.method === 'DELETE'
    );
    expect(delReq).toBeDefined();
  });

  it('mutations reset originalArgs on settle so secrets dont linger', async () => {
    const store = createTestStore();
    await store.dispatch(
      serviceCredentialApi.endpoints.createServiceCredential.initiate({
        external_service: 'acme-band',
        client_id: 'abc123',
        client_secret: 'SENTINEL-SECRET-VALUE',
        redirect_uri: 'https://example.com/callback/acme-band',
      }),
    );
    const stateJson = JSON.stringify(store.getState());
    expect(stateJson).not.toContain('SENTINEL-SECRET-VALUE');
  });
});
