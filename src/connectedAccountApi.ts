import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '@clarion-app/frontend-base';
import { backend } from './config';
import { callbackUrlFor } from './callbackUrl';
import type { ConnectionType } from './types';

const baseQuery = createBaseQuery({
  routePrefix: '/api/clarion-app/life-log',
  backendConfig: backend,
});

export const connectedAccountApi = createApi({
  reducerPath: 'clarion-app-life-log-connectedAccountApi',
  baseQuery,
  tagTypes: ['Connection'],
  endpoints: (build) => ({
    getConnections: build.query<
      { connections: ConnectionType[] },
      void
    >({
      query: () => '/connected-accounts',
      providesTags: (result) =>
        result
          ? [
              ...result.connections.map(({ id }: { id: string }) =>
                ({ type: 'Connection' as const, id })
              ),
            ]
          : [{ type: 'Connection' as const }],
    }),

    beginConnection: build.mutation<
      { authorization_url: string },
      { external_service: string }
    >({
      query: ({ external_service }) => ({
        url: '/connected-accounts',
        method: 'POST',
        body: { external_service },
      }),
      invalidatesTags: ['Connection'],
    }),

    completeConnection: build.mutation<
      { connected: boolean },
      { external_service: string; state: string; code: string }
    >({
      query: ({ external_service, state, code }) => ({
        url: '/connected-accounts/callback',
        method: 'POST',
        body: {
          external_service,
          state,
          code,
          redirect_uri: callbackUrlFor(external_service),
        },
      }),
      invalidatesTags: ['Connection'],
    }),

    syncNow: build.mutation<
      { status: string },
      { connectionId: string }
    >({
      query: ({ connectionId }) => ({
        url: `/connected-accounts/${connectionId}/sync`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { connectionId }) => [
        { type: 'Connection' as const, id: connectionId },
      ],
    }),

    disconnect: build.mutation<
      { disconnected: boolean },
      { connectionId: string }
    >({
      query: ({ connectionId }) => ({
        url: `/connected-accounts/${connectionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { connectionId }) => [
        { type: 'Connection' as const, id: connectionId },
        { type: 'Connection' as const },
      ],
    }),
  }),
});

export const {
  useGetConnectionsQuery,
  useBeginConnectionMutation,
  useCompleteConnectionMutation,
  useSyncNowMutation,
  useDisconnectMutation,
} = connectedAccountApi;
