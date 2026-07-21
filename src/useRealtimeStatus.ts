/**
 * Read the Echo/Pusher connection state and return a simple status string.
 *
 * Returns 'live' only when the connection state is exactly 'connected'.
 * Any other state, a missing Echo instance, or an unreadable property
 * yields 'not-live' — never a crash, never a false claim of liveness.
 *
 * Kept in this package (not promoted to frontend-base) because it is
 * specific to the wearable connection interface.
 */

import { WindowWS } from '@clarion-app/types';

export function useRealtimeStatus(): 'live' | 'not-live' {
    try {
        const win = window as unknown as WindowWS;
        const state = win.Echo?.connector?.pusher?.connection?.state;

        return state === 'connected' ? 'live' : 'not-live';
    } catch {
        // Unreadable internal — treat as not-live rather than crashing
        return 'not-live';
    }
}
