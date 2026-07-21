import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('callbackUrlFor', () => {
  let callbackUrlFor: (service: string) => string;
  let CONNECTION_CALLBACK_PATH: string;

  beforeEach(async () => {
    // Reset module cache to pick up location changes
    vi.resetModules();
    const mod = await import('./callbackUrl');
    callbackUrlFor = mod.callbackUrlFor;
    CONNECTION_CALLBACK_PATH = mod.CONNECTION_CALLBACK_PATH;
  });

  it('uses window.location.origin and the constant path', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://my-node.local' },
      writable: true,
      configurable: true,
    });

    const url = callbackUrlFor('google-health');
    expect(url).toBe('https://my-node.local/clarion-app/life-log/connected-services/callback/google-health');
  });

  it('works with different origins', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
      configurable: true,
    });

    const url = callbackUrlFor('acme-band');
    expect(url).toBe('http://localhost:3000/clarion-app/life-log/connected-services/callback/acme-band');
  });

  it('works with production origins', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://clarion.example.com' },
      writable: true,
      configurable: true,
    });

    const url = callbackUrlFor('fitbit-charge');
    expect(url).toBe('https://clarion.example.com/clarion-app/life-log/connected-services/callback/fitbit-charge');
  });

  it('produces no query string', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
      configurable: true,
    });

    const url = callbackUrlFor('google-health');
    expect(url).not.toContain('?');
  });

  it('produces no fragment', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
      configurable: true,
    });

    const url = callbackUrlFor('google-health');
    expect(url).not.toContain('#');
  });

  it('CONNECTION_CALLBACK_PATH matches the route pattern in package.json', async () => {
    // Read the package.json from the same package
    const pkg = await import('../package.json', { with: { type: 'json' } });
    const routes = pkg.default.customFields?.clarion?.routes ?? [];
    const callbackRoute = routes.find(
      (r: any) => typeof r.path === 'string' && r.path.includes(':service') && r.path.includes('callback')
    );
    if (callbackRoute) {
      // The route path is /clarion-app/life-log/connected-services/callback/:service
      // CONNECTION_CALLBACK_PATH should be the base without /:service
      const expectedBase = callbackRoute.path.replace(/\/:service$/, '');
      expect(CONNECTION_CALLBACK_PATH).toBe(expectedBase);
    }
  });

  it('callbackUrlFor(service) matches the callback route with :service substituted', async () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
      configurable: true,
    });

    const pkg = await import('../package.json', { with: { type: 'json' } });
    const routes = pkg.default.customFields?.clarion?.routes ?? [];
    const callbackRoute = routes.find(
      (r: any) => typeof r.path === 'string' && r.path.includes(':service') && r.path.includes('callback')
    );
    if (callbackRoute) {
      const servicePath = callbackRoute.path.replace(':service', 'google-health');
      const url = callbackUrlFor('google-health');
      expect(url).toBe('https://example.com' + servicePath);
    }
  });
});
