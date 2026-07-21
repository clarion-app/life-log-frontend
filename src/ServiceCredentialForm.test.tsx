import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { serviceCredentialApi } from './serviceCredentialApi';
import type { ConfiguredServiceType, UnconfiguredServiceType } from './types';

// Module-level spies for stable references
const mockCreateFn = vi.fn().mockResolvedValue({ data: {} });
const mockUpdateFn = vi.fn().mockResolvedValue({ data: {} });

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

vi.mock('./serviceCredentialApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./serviceCredentialApi')>();
  return {
    ...actual,
    useCreateServiceCredentialMutation: vi.fn(() => [
      mockCreateFn,
      { isLoading: false, error: undefined },
    ]),
    useUpdateServiceCredentialMutation: vi.fn(() => [
      mockUpdateFn,
      { isLoading: false, error: undefined },
    ]),
  };
});

describe('ServiceCredentialForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
      configurable: true,
    });
  });

  it('renders client id and secret fields for unconfigured service', async () => {
    const { ServiceCredentialForm } = await import('./ServiceCredentialForm');
    const unconfigured: UnconfiguredServiceType = {
      external_service: 'google-health',
      configured: false,
    };
    render(<ServiceCredentialForm service={unconfigured} />);

    expect(screen.getByLabelText(/client.*id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/secret/i)).toBeInTheDocument();
  });

  it('renders client id and new secret fields for configured service', async () => {
    const { ServiceCredentialForm } = await import('./ServiceCredentialForm');
    const configured: ConfiguredServiceType = {
      external_service: 'google-health',
      configured: true,
      client_id: '1234.apps.googleusercontent.com',
      redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
      has_secret: true,
      secret_updated_at: '2026-07-20T18:04:11.000000Z',
      last_verified_at: null,
      last_verification_outcome: null,
      version: 1,
    };
    render(<ServiceCredentialForm service={configured} />);

    expect(screen.getByLabelText(/client.*id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/secret/i)).toBeInTheDocument();
  });

  it('never renders a pre-filled secret value', async () => {
    const { ServiceCredentialForm } = await import('./ServiceCredentialForm');
    const configured: ConfiguredServiceType = {
      external_service: 'google-health',
      configured: true,
      client_id: '1234.apps.googleusercontent.com',
      redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
      has_secret: true,
      secret_updated_at: '2026-07-20T18:04:11.000000Z',
      last_verified_at: null,
      last_verification_outcome: null,
      version: 1,
    };
    render(<ServiceCredentialForm service={configured} />);

    // Secret field should be empty
    const secretInput = screen.getByLabelText(/secret/i) as HTMLInputElement;
    expect(secretInput.value).toBe('');
  });

  it('shows secret stored status for configured service', async () => {
    const { ServiceCredentialForm } = await import('./ServiceCredentialForm');
    const configured: ConfiguredServiceType = {
      external_service: 'google-health',
      configured: true,
      client_id: '1234.apps.googleusercontent.com',
      redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
      has_secret: true,
      secret_updated_at: '2026-07-20T18:04:11.000000Z',
      last_verified_at: null,
      last_verification_outcome: null,
      version: 1,
    };
    render(<ServiceCredentialForm service={configured} />);

    expect(screen.getByText(/secret.*stored/i)).toBeInTheDocument();
  });

  it('shows secret_updated_at as date when present', async () => {
    const { ServiceCredentialForm } = await import('./ServiceCredentialForm');
    const configured: ConfiguredServiceType = {
      external_service: 'google-health',
      configured: true,
      client_id: '1234.apps.googleusercontent.com',
      redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
      has_secret: true,
      secret_updated_at: '2026-07-20T18:04:11.000000Z',
      last_verified_at: null,
      last_verification_outcome: null,
      version: 1,
    };
    render(<ServiceCredentialForm service={configured} />);

    expect(screen.getByText(/2026.*07.*20/i)).toBeInTheDocument();
  });

  it('shows secret_updated_at as never when null', async () => {
    const { ServiceCredentialForm } = await import('./ServiceCredentialForm');
    const configured: ConfiguredServiceType = {
      external_service: 'google-health',
      configured: true,
      client_id: '1234.apps.googleusercontent.com',
      redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
      has_secret: false,
      secret_updated_at: null,
      last_verified_at: null,
      last_verification_outcome: null,
      version: 1,
    };
    render(<ServiceCredentialForm service={configured} />);

    expect(screen.getByText(/never/i)).toBeInTheDocument();
  });

  it('shows field-level error for empty client id on submit', async () => {
    const { ServiceCredentialForm } = await import('./ServiceCredentialForm');
    const unconfigured: UnconfiguredServiceType = {
      external_service: 'google-health',
      configured: false,
    };
    render(<ServiceCredentialForm service={unconfigured} />);

    const clientIdInput = screen.getByLabelText(/client.*id/i) as HTMLInputElement;
    clientIdInput.value = '';

    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);

    // Field-level error for client id
    await waitFor(() => {
      expect(screen.getByText(/client.*id.*required/i)).toBeInTheDocument();
    });
  });

  it('sends redirect_uri derived from callbackUrlFor on create', async () => {
    mockCreateFn.mockResolvedValue({ data: {} });

    const { ServiceCredentialForm } = await import('./ServiceCredentialForm');
    const unconfigured: UnconfiguredServiceType = {
      external_service: 'google-health',
      configured: false,
    };
    render(<ServiceCredentialForm service={unconfigured} />);

    const clientIdInput = screen.getByLabelText(/client.*id/i) as HTMLInputElement;
    clientIdInput.value = 'test-client-id';
    const secretInput = screen.getByLabelText(/secret/i) as HTMLInputElement;
    secretInput.value = 'test-secret';

    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
        })
      );
    });
  });

  it('omits client_secret from update payload when secret field is empty', async () => {
    mockUpdateFn.mockResolvedValue({ data: {} });

    const { ServiceCredentialForm } = await import('./ServiceCredentialForm');
    const configured: ConfiguredServiceType = {
      external_service: 'google-health',
      configured: true,
      client_id: '1234.apps.googleusercontent.com',
      redirect_uri: 'https://example.com/clarion-app/life-log/connected-services/callback/google-health',
      has_secret: true,
      secret_updated_at: '2026-07-20T18:04:11.000000Z',
      last_verified_at: null,
      last_verification_outcome: null,
      version: 1,
    };
    render(<ServiceCredentialForm service={configured} />);

    // Don't change the secret - just click save
    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const callArgs = mockUpdateFn.mock.calls[0][0];
      expect(callArgs).toHaveProperty('service', 'google-health');
      expect(callArgs.data).not.toHaveProperty('client_secret');
    });
  });
});
