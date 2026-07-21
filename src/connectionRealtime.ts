/**
 * Side-effect module: registers a handler for ConnectedAccountStatusChanged
 * broadcast events. Importing this module wires up the realtime listener.
 *
 * When a broadcast arrives for a cached connection id, the entry is replaced
 * in place via updateQueryData. For an unknown id, the Connection tag is
 * invalidated so the next fetch picks up the new data.
 *
 * A duplicate delivery is harmless — the payload is a full snapshot, not a delta.
 */

import { registerUserChannelHandler } from '@clarion-app/frontend-base';
import { connectedAccountApi } from './connectedAccountApi';
import type { ConnectionType } from './types';

registerUserChannelHandler({
    event: '.ClarionApp\\LifeLogBackend\\Events\\ConnectedAccountStatusChanged',
    handler: (payload, _dispatch) => {
        const connection = payload as ConnectionType;

        // Try to update the cached entry in place
        const updateResult = connectedAccountApi.util.updateQueryData(
            'getConnections',
            undefined,
            (state) => {
                if (!state?.connections) return state;

                const idx = state.connections.findIndex((c) => c.id === connection.id);
                if (idx === -1) {
                    // Unknown id — signal fallback to tag invalidation
                    // by returning state unchanged and letting the caller handle it
                    return state;
                }

                // Replace the entry in place with the full snapshot
                return {
                    ...state,
                    connections: [
                        ...state.connections.slice(0, idx),
                        connection,
                        ...state.connections.slice(idx + 1),
                    ],
                };
            },
        );

        // If updateQueryData returned undefined or the state was unchanged
        // (unknown id), fall back to tag invalidation
        if (updateResult === undefined) {
            connectedAccountApi.util.invalidateTags([{ type: 'Connection' }]);
        }
    },
});
