import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '@clarion-app/frontend-base';
import { backend } from './config';
import { HealthMetricType, MeasurementPageType } from './types';

export interface HealthMetricsFilters {
    source?: string;
    page?: number;
    per_page?: number;
}

export const healthMetricApi = createApi({
    reducerPath: 'clarion-app-life-log-healthMetricApi',
    baseQuery: createBaseQuery({ routePrefix: '/api/clarion-app/life-log', backendConfig: backend }),
    tagTypes: ['HealthMetric'],
    endpoints: (build) => ({
        getHealthMetrics: build.query<MeasurementPageType, HealthMetricsFilters>({
            query: (filters = {}) => ({
                url: 'health-metric',
                params: {
                    page: filters.page ?? 1,
                    ...(filters.source !== undefined && { source: filters.source }),
                    ...(filters.per_page !== undefined && { per_page: filters.per_page }),
                },
            }),
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

export const { useGetHealthMetricsQuery, useGetHealthMetricQuery, useAddHealthMetricMutation, useUpdateHealthMetricMutation, useDeleteHealthMetricMutation } = healthMetricApi;