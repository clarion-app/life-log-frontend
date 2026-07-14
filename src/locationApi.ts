import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '@clarion-app/frontend-base';
import { backend } from './config';
import { LocationType } from './types';

export type LocationPayload = Partial<Omit<LocationType, 'contacts'>> & { contacts?: string[] };

export const locationApi = createApi({
    reducerPath: 'clarion-app-life-log-locationApi',
    baseQuery: createBaseQuery({ routePrefix: '/api/clarion-app/life-log', backendConfig: backend }),
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
        addLocation: build.mutation<LocationType, LocationPayload>({
            query: (body) => ({
                url: `location`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Location'],
        }),
        updateLocation: build.mutation<LocationType, LocationPayload>({
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

export const { useGetLocationsQuery, useGetLocationQuery, useAddLocationMutation, useUpdateLocationMutation, useDeleteLocationMutation } = locationApi;