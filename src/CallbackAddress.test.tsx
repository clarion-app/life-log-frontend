import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CallbackAddress } from './CallbackAddress';

describe('CallbackAddress', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
      configurable: true,
    });
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders the callback address as read-only text', async () => {
    const { CallbackAddress: Component } = await import('./CallbackAddress');
    render(<Component service="google-health" storedRedirectUri={null} />);

    const addressEl = screen.getByText(
      /example\.com\/clarion-app\/life-log\/connected-services\/callback\/google-health/
    );
    expect(addressEl).toBeInTheDocument();

    // No editable input for the address
    const inputs = document.querySelectorAll('input, textarea');
    let addressInput = false;
    inputs.forEach((input) => {
      if (input.getAttribute('placeholder')?.includes('callback') || input.value.includes('callback')) {
        addressInput = true;
      }
    });
    expect(addressInput).toBe(false);
  });

  it('provides a single copy action', async () => {
    const { CallbackAddress: Component } = await import('./CallbackAddress');
    render(<Component service="google-health" storedRedirectUri={null} />);

    const copyBtn = screen.getByRole('button', { name: /copy/i });
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://example.com/clarion-app/life-log/connected-services/callback/google-health'
    );
  });

  it('shows the address before any save control', async () => {
    const { CallbackAddress: Component } = await import('./CallbackAddress');
    render(<Component service="google-health" storedRedirectUri={null} />);

    const addressEl = screen.getByText(
      /example\.com\/clarion-app\/life-log\/connected-services\/callback\/google-health/
    );
    expect(addressEl).toBeInTheDocument();
  });

  it('shows a mismatch notice when stored redirect_uri differs', async () => {
    const { CallbackAddress: Component } = await import('./CallbackAddress');
    render(
      <Component
        service="google-health"
        storedRedirectUri="https://example.com/api/life-log/connected-accounts/callback"
      />
    );

    const mismatchNotice = screen.getByText(/mismatch/i);
    expect(mismatchNotice).toBeInTheDocument();
  });

  it('does not show mismatch notice when stored value matches', async () => {
    const { CallbackAddress: Component } = await import('./CallbackAddress');
    const matchingUri = 'https://example.com/clarion-app/life-log/connected-services/callback/google-health';
    render(<Component service="google-health" storedRedirectUri={matchingUri} />);

    const mismatchNotice = screen.queryByText(/mismatch/i);
    expect(mismatchNotice).not.toBeInTheDocument();
  });

  it('does not show mismatch notice when stored value is null', async () => {
    const { CallbackAddress: Component } = await import('./CallbackAddress');
    render(<Component service="google-health" storedRedirectUri={null} />);

    const mismatchNotice = screen.queryByText(/mismatch/i);
    expect(mismatchNotice).not.toBeInTheDocument();
  });
});
