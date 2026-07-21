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
    handler: (payload, dispatch) => {
        const connection = payload as ConnectionType;

        if (!connection || typeof connection.id !== 'string') return;

        // The recipe runs synchronously inside the dispatch below, and only
        // when a cache entry for the query exists — so this flag is settled
        // by the time it is read.
        let replaced = false;

        dispatch(
            connectedAccountApi.util.updateQueryData(
                'getConnections',
                undefined,
                (draft) => {
                    const idx = draft?.connections?.findIndex((c) => c.id === connection.id) ?? -1;
                    if (idx === -1) return;

                    draft.connections[idx] = connection;
                    replaced = true;
                },
            ),
        );

        // No cache entry, or an id that is not in it (a connection made in
        // another tab) — fall back to tag invalidation so the next read fetches it.
        if (!replaced) {
            dispatch(connectedAccountApi.util.invalidateTags([{ type: 'Connection' }]));
        }
    },
});
