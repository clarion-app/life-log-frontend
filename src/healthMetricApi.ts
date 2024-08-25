import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';
import { HealthMetricType } from './types';

export const healthMetricApi = createApi({
    reducerPath: 'clarion-app-life-log-healthMetricApi',
    baseQuery: baseQuery(),
    tagTypes: ['HealthMetric'],
    endpoints: (build) => ({
        getHealthMetrics: build.query<HealthMetricType[], void>({
            query: () => 'health-metric',
            providesTags: ['HealthMetric'],
        }),
        getHealthMetric: build.query<HealthMetricType, string>({
            query: (id) => `health-metric/${id}`,
            providesTags: ['HealthMetric'],
        }),
        addHealthMetric: build.mutation<HealthMetricType, Partial<HealthMetricType>>({
            query: (body) => ({
                url: `health-metric`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['HealthMetric'],
        }),
        updateHealthMetric: build.mutation<HealthMetricType, Partial<HealthMetricType>>({
            query: (body) => ({
                url: `health-metric/${body.id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['HealthMetric'],
        }),
        deleteHealthMetric: build.mutation<void, string>({
            query: (id) => ({
                url: `health-metric/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['HealthMetric'],
        }),
    }),
});