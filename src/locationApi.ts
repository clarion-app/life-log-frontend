import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';
import { LocationType } from './types';

export const locationApi = createApi({
    reducerPath: 'clarion-app-life-log-locationApi',
    baseQuery: baseQuery(),
    tagTypes: ['Location'],
    endpoints: (build) => ({
        getLocations: build.query<LocationType[], void>({
            query: () => 'location',
            providesTags: ['Location'],
        }),
        getLocation: build.query<LocationType, string>({
            query: (id) => `location/${id}`,
            providesTags: ['Location'],
        }),
        addLocation: build.mutation<LocationType, Partial<LocationType>>({
            query: (body) => ({
                url: `location`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Location'],
        }),
        updateLocation: build.mutation<LocationType, Partial<LocationType>>({
            query: (body) => ({
                url: `location/${body.id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['Location'],
        }),
        deleteLocation: build.mutation<void, string>({
            query: (id) => ({
                url: `location/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Location'],
        }),
    }),
});