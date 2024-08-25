import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';
import { EntryType } from './types';

export const entryApi = createApi({
    reducerPath: 'clarion-app-life-log-entryApi',
    baseQuery: baseQuery(),
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
        addEntry: build.mutation<EntryType, Partial<EntryType>>({
            query: (body) => ({
                url: `entry`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Entry'],
        }),
        updateEntry: build.mutation<EntryType, Partial<EntryType>>({
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