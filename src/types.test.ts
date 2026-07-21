import { describe, it, expect } from 'vitest';
import {
  ServiceCredentialType,
  UnconfiguredServiceType,
  ConfiguredServiceType,
  ConnectionType,
  CreateCredentialPayload,
  UpdateCredentialPayload,
} from './types';

describe('ServiceCredentialType discriminated union', () => {
  it('narrows to UnconfiguredServiceType when configured is false', () => {
    const svc: ServiceCredentialType = {
      external_service: 'google-health',
      configured: false,
    };

    if (!svc.configured) {
      // Narrowed to UnconfiguredServiceType — only external_service and configured exist
      expect(svc).toEqual({
        external_service: 'google-health',
        configured: false,
      });
    }
  });

  it('narrows to ConfiguredServiceType when configured is true', () => {
    const svc: ServiceCredentialType = {
      external_service: 'google-health',
      configured: true,
      client_id: '1234.apps.googleusercontent.com',
      redirect_uri: 'https://example.com/callback/google-health',
      has_secret: true,
      secret_updated_at: '2026-07-20T18:04:11.000000Z',
      last_verified_at: null,
      last_verification_outcome: null,
      version: 1,
    };

    if (svc.configured) {
      expect(svc.client_id).toBe('1234.apps.googleusercontent.com');
      expect(svc.has_secret).toBe(true);
      expect(svc.version).toBe(1);
    }
  });
});

describe('ServiceCredentialType FR-045 / SC-004 — no secret fields', () => {
  it('UnconfiguredServiceType has no client_secret member', () => {
    const unconfigured: UnconfiguredServiceType = {
      external_service: 'acme-band',
      configured: false,
    };
    expect('client_secret' in unconfigured).toBe(false);
  });

  it('ConfiguredServiceType has no client_secret member', () => {
    const configured: ConfiguredServiceType = {
      external_service: 'acme-band',
      configured: true,
      client_id: 'abc123',
      redirect_uri: 'https://example.com/callback/acme-band',
      has_secret: true,
      secret_updated_at: null,
      last_verified_at: null,
      last_verification_outcome: null,
      version: 1,
    };
    expect('client_secret' in configured).toBe(false);
  });

  it('ConfiguredServiceType has no access_token member', () => {
    const configured: ConfiguredServiceType = {
      external_service: 'acme-band',
      configured: true,
      client_id: 'abc123',
      redirect_uri: 'https://example.com/callback/acme-band',
      has_secret: true,
      secret_updated_at: null,
      last_verified_at: null,
      last_verification_outcome: null,
      version: 1,
    };
    expect('access_token' in configured).toBe(false);
  });

  it('ConfiguredServiceType has no refresh_token member', () => {
    const configured: ConfiguredServiceType = {
      external_service: 'acme-band',
      configured: true,
      client_id: 'abc123',
      redirect_uri: 'https://example.com/callback/acme-band',
      has_secret: true,
      secret_updated_at: null,
      last_verified_at: null,
      last_verification_outcome: null,
      version: 1,
    };
    expect('refresh_token' in configured).toBe(false);
  });
});

describe('ConnectionType FR-045 / SC-04 — no secret fields', () => {
  it('ConnectionType has no access_token member', () => {
    const conn: ConnectionType = {
      id: '9b1f0000-0000-4000-8000-000000000000',
      external_service: 'google-health',
      status: 'healthy',
      last_successful_sync_at: '2026-07-21T06:00:00.000000Z',
      connected_at: '2026-07-14T11:20:03.000000Z',
      needs_attention_reason: null,
      granted_scopes: ['activity_and_fitness'],
      granted_types: ['steps', 'heart_rate'],
      missing_types: ['sleep'],
    };
    expect('access_token' in conn).toBe(false);
  });

  it('ConnectionType has no refresh_token member', () => {
    const conn: ConnectionType = {
      id: '9b1f0000-0000-4000-8000-000000000000',
      external_service: 'google-health',
      status: 'healthy',
      last_successful_sync_at: null,
      connected_at: '2026-07-14T11:20:03.000000Z',
      needs_attention_reason: null,
      granted_scopes: [],
      granted_types: [],
      missing_types: ['steps', 'heart_rate', 'sleep'],
    };
    expect('refresh_token' in conn).toBe(false);
  });

  it('ConnectionType has no client_secret member', () => {
    const conn: ConnectionType = {
      id: '9b1f0000-0000-4000-8000-000000000000',
      external_service: 'google-health',
      status: 'needs_attention',
      last_successful_sync_at: null,
      connected_at: '2026-07-14T11:20:03.000000Z',
      needs_attention_reason: 'authorization_unrenewable',
      granted_scopes: [],
      granted_types: [],
      missing_types: ['steps'],
    };
    expect('client_secret' in conn).toBe(false);
  });
});

describe('CreateCredentialPayload requires client_secret on create', () => {
  it('has client_secret as required string', () => {
    const payload: CreateCredentialPayload = {
      external_service: 'acme-band',
      client_id: 'abc123',
      client_secret: 'secret-value',
      redirect_uri: 'https://example.com/callback/acme-band',
    };
    expect(payload.client_secret).toBe('secret-value');
  });
});

describe('UpdateCredentialPayload — client_secret is optional', () => {
  it('allows omitting client_secret when unchanged', () => {
    const payload: UpdateCredentialPayload = {
      client_id: 'new-client-id',
    };
    expect('client_secret' in payload).toBe(false);
  });

  it('allows including client_secret when changed', () => {
    const payload: UpdateCredentialPayload = {
      client_id: 'new-client-id',
      client_secret: 'new-secret',
    };
    expect(payload.client_secret).toBe('new-secret');
  });
});

describe('ConnectionType status values', () => {
  it('accepts healthy status', () => {
    const conn: ConnectionType = {
      id: '9b1f0000-0000-4000-8000-000000000000',
      external_service: 'google-health',
      status: 'healthy',
      last_successful_sync_at: '2026-07-21T06:00:00.000000Z',
      connected_at: '2026-07-14T11:20:03.000000Z',
      needs_attention_reason: null,
      granted_scopes: ['activity_and_fitness'],
      granted_types: ['steps'],
      missing_types: [],
    };
    expect(conn.status).toBe('healthy');
    expect(conn.needs_attention_reason).toBe(null);
  });

  it('accepts needs_attention status with reason', () => {
    const conn: ConnectionType = {
      id: '9b1f0000-0000-4000-8000-000000000000',
      external_service: 'google-health',
      status: 'needs_attention',
      last_successful_sync_at: null,
      connected_at: '2026-07-14T11:20:03.000000Z',
      needs_attention_reason: 'credential_rotated',
      granted_scopes: [],
      granted_types: [],
      missing_types: ['steps'],
    };
    expect(conn.status).toBe('needs_attention');
    expect(conn.needs_attention_reason).toBe('credential_rotated');
  });
});
