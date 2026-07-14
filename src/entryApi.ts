import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '@clarion-app/frontend-base';
import { backend } from './config';
import { EntryType } from './types';

export type EntryPayload = Partial<Omit<EntryType, 'contacts'>> & { contacts?: string[] };

export const entryApi = createApi({
    reducerPath: 'clarion-app-life-log-entryApi',
    baseQuery: createBaseQuery({ routePrefix: '/api/clarion-app/life-log', backendConfig: backend }),
    tagTypes: ['Entry'],
    endpoints: (build) => ({
        getEntries: build.query<EntryType[], void>({
            query: () => 'entry',
            providesTags: ['Entry'],
        }),
        getEntry: build.query<EntryType, string>({
            query: (id) => `entry/${id}`,
            providesTags: ['Entry'],
        }),
        addEntry: build.mutation<EntryType, EntryPayload>({
            query: (body) => ({
                url: `entry`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Entry'],
        }),
        updateEntry: build.mutation<EntryType, EntryPayload>({
            query: (body) => ({
                url: `entry/${body.id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['Entry'],
        }),
        deleteEntry: build.mutation<void, string>({
            query: (id) => ({
                url: `entry/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Entry'],
        }),
    }),
});

export const { useGetEntriesQuery, useGetEntryQuery, useAddEntryMutation, useUpdateEntryMutation, useDeleteEntryMutation } = entryApi;