import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useRealtimeStatus', () => {
    let mockEcho: any;

    beforeEach(() => {
        mockEcho = {
            connector: {
                pusher: {
                    connection: {
                        state: 'connected',
                    },
                },
            },
        };
        (window as any).Echo = mockEcho;
    });

    afterEach(() => {
        delete (window as any).Echo;
    });

    it('returns "live" when Echo connection state is connected', async () => {
        const { useRealtimeStatus } = await import('./useRealtimeStatus');
        // The hook reads window.Echo at call time
        mockEcho.connector.pusher.connection.state = 'connected';
        expect(useRealtimeStatus()).toBe('live');
    });

    it('returns "not-live" for connecting state', async () => {
        const { useRealtimeStatus } = await import('./useRealtimeStatus');
        mockEcho.connector.pusher.connection.state = 'connecting';
        expect(useRealtimeStatus()).toBe('not-live');
    });

    it('returns "not-live" for unavailable state', async () => {
        const { useRealtimeStatus } = await import('./useRealtimeStatus');
        mockEcho.connector.pusher.connection.state = 'unavailable';
        expect(useRealtimeStatus()).toBe('not-live');
    });

    it('returns "not-live" for failed state', async () => {
        const { useRealtimeStatus } = await import('./useRealtimeStatus');
        mockEcho.connector.pusher.connection.state = 'failed';
        expect(useRealtimeStatus()).toBe('not-live');
    });

    it('returns "not-live" for disconnected state', async () => {
        const { useRealtimeStatus } = await import('./useRealtimeStatus');
        mockEcho.connector.pusher.connection.state = 'disconnected';
        expect(useRealtimeStatus()).toBe('not-live');
    });

    it('returns "not-live" when Echo is missing', async () => {
        const { useRealtimeStatus } = await import('./useRealtimeStatus');
        delete (window as any).Echo;
        expect(useRealtimeStatus()).toBe('not-live');
    });

    it('returns "not-live" when Echo.connector is missing', async () => {
        const { useRealtimeStatus } = await import('./useRealtimeStatus');
        (window as any).Echo = {};
        expect(useRealtimeStatus()).toBe('not-live');
    });

    it('returns "not-live" when Echo.connector.pusher is missing', async () => {
        const { useRealtimeStatus } = await import('./useRealtimeStatus');
        (window as any).Echo = { connector: {} };
        expect(useRealtimeStatus()).toBe('not-live');
    });

    it('returns "not-live" when connection object is missing', async () => {
        const { useRealtimeStatus } = await import('./useRealtimeStatus');
        (window as any).Echo = { connector: { pusher: {} } };
        expect(useRealtimeStatus()).toBe('not-live');
    });

    it('does not crash on unreadable internal', async () => {
        const { useRealtimeStatus } = await import('./useRealtimeStatus');
        (window as any).Echo = {
            connector: {
                pusher: {
                    get connection() {
                        throw new Error('Access denied');
                    },
                },
            },
        };
        expect(() => useRealtimeStatus()).not.toThrow();
        expect(useRealtimeStatus()).toBe('not-live');
    });

    it('never claims liveness for unknown state strings', async () => {
        const { useRealtimeStatus } = await import('./useRealtimeStatus');
        mockEcho.connector.pusher.connection.state = 'some_future_state';
        expect(useRealtimeStatus()).toBe('not-live');
    });
});
