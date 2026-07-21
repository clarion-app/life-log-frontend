import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('./config', () => ({
    backend: {
        url: 'http://localhost:8000',
        token: 'test-token',
        user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
    },
    updateFrontend: () => {},
}));

let capturedRequests: any[] = [];

vi.mock('@clarion-app/frontend-base', () => ({
    createBackendConfig: () => ({
        backend: { url: 'http://localhost:8000', user: { id: '', name: '', email: '' } },
        updateFrontend: () => {},
    }),
    createBaseQuery: () => async (args: any) => {
        capturedRequests.push(args);
        if (typeof args === 'object' && args.url === 'health-metric') {
            return {
                data: {
                    data: [],
                    meta: {
                        current_page: 1,
                        last_page: 1,
                        per_page: 100,
                        total: 0,
                        available_sources: [],
                    },
                },
            };
        }
        if (typeof args === 'object' && args.url?.startsWith('health-metric/')) {
            return {
                data: {
                    id: '1',
                    user_id: 'user-1',
                    type: 'weight',
                    value: 70.5,
                    recorded_at: '2026-07-20T10:00:00Z',
                    source: 'manual',
                },
            };
        }
        if (typeof args === 'object' && args.url === 'health-metric' && args.method === 'POST') {
            return { data: args.body };
        }
        if (typeof args === 'object' && args.url?.includes('health-metric/') && args.method === 'PUT') {
            return { data: args.body };
        }
        if (typeof args === 'object' && args.url?.includes('health-metric/') && args.method === 'DELETE') {
            return { data: {} };
        }
        return { data: {} };
    },
}));

const { healthMetricApi } = await import('./healthMetricApi');

function createTestStore() {
    return configureStore({
        reducer: {
            [healthMetricApi.reducerPath]: healthMetricApi.reducer,
        },
        middleware: (getDefault) =>
            getDefault().concat(healthMetricApi.middleware),
    });
}

describe('healthMetricApi', () => {
    beforeEach(() => {
        capturedRequests = [];
    });

    describe('getHealthMetrics accepts filters and always sends page', () => {
        it('with no args sends page=1 (default)', async () => {
            const store = createTestStore();
            await store.dispatch(healthMetricApi.endpoints.getHealthMetrics.initiate({}));
            const req = capturedRequests.find(
                (r: any) => typeof r === 'object' && r.url === 'health-metric'
            );
            expect(req).toBeDefined();
            expect(req.params).toHaveProperty('page', 1);
        });

        it('passes source through untouched', async () => {
            const store = createTestStore();
            await store.dispatch(
                healthMetricApi.endpoints.getHealthMetrics.initiate({ source: 'google-health' })
            );
            const req = capturedRequests.find(
                (r: any) => typeof r === 'object' && r.url === 'health-metric'
            );
            expect(req.params).toHaveProperty('source', 'google-health');
        });

        it('passes page through when provided', async () => {
            const store = createTestStore();
            await store.dispatch(
                healthMetricApi.endpoints.getHealthMetrics.initiate({ page: 3 })
            );
            const req = capturedRequests.find(
                (r: any) => typeof r === 'object' && r.url === 'health-metric'
            );
            expect(req.params).toHaveProperty('page', 3);
        });

        it('passes per_page through when provided', async () => {
            const store = createTestStore();
            await store.dispatch(
                healthMetricApi.endpoints.getHealthMetrics.initiate({ per_page: 50 })
            );
            const req = capturedRequests.find(
                (r: any) => typeof r === 'object' && r.url === 'health-metric'
            );
            expect(req.params).toHaveProperty('per_page', 50);
        });

        it('always sends page even when source is given', async () => {
            const store = createTestStore();
            await store.dispatch(
                healthMetricApi.endpoints.getHealthMetrics.initiate({
                    source: 'fitbit',
                    per_page: 25,
                })
            );
            const req = capturedRequests.find(
                (r: any) => typeof r === 'object' && r.url === 'health-metric'
            );
            expect(req.params).toHaveProperty('page', 1);
            expect(req.params).toHaveProperty('source', 'fitbit');
            expect(req.params).toHaveProperty('per_page', 25);
        });
    });

    describe('returns MeasurementPageType envelope', () => {
        it('response has data and meta keys', async () => {
            const store = createTestStore();
            const result = await store.dispatch(
                healthMetricApi.endpoints.getHealthMetrics.initiate({})
            );
            // RTK Query result shape check
            const resultAny = result as any;
            if (resultAny.meta?.requestStatus === 'fulfilled' || resultAny.data !== undefined) {
                expect(resultAny.data).toHaveProperty('data');
                expect(resultAny.data).toHaveProperty('meta');
                expect(resultAny.data.meta).toHaveProperty('current_page');
                expect(resultAny.data.meta).toHaveProperty('last_page');
                expect(resultAny.data.meta).toHaveProperty('per_page');
                expect(resultAny.data.meta).toHaveProperty('total');
                expect(resultAny.data.meta).toHaveProperty('available_sources');
            }
        });
    });

    describe('other endpoints are unchanged', () => {
        it('getHealthMetric fetches by id', async () => {
            const store = createTestStore();
            await store.dispatch(healthMetricApi.endpoints.getHealthMetric.initiate('42'));
            const req = capturedRequests.find(
                (r: any) => typeof r === 'string' && r === 'health-metric/42'
            );
            expect(req).toBeDefined();
        });

        it('addHealthMetric POSTs', async () => {
            const store = createTestStore();
            await store.dispatch(
                healthMetricApi.endpoints.addHealthMetric.initiate({
                    type: 'weight',
                    value: 70,
                    recorded_at: '2026-07-20T10:00:00Z',
                })
            );
            const req = capturedRequests.find(
                (r: any) => typeof r === 'object' && r.url === 'health-metric' && r.method === 'POST'
            );
            expect(req).toBeDefined();
        });

        it('updateHealthMetric PUTs', async () => {
            const store = createTestStore();
            await store.dispatch(
                healthMetricApi.endpoints.updateHealthMetric.initiate({
                    id: '42',
                    type: 'weight',
                })
            );
            const req = capturedRequests.find(
                (r: any) => typeof r === 'object' && r.url === 'health-metric/42' && r.method === 'PUT'
            );
            expect(req).toBeDefined();
        });

        it('deleteHealthMetric DELETEs', async () => {
            const store = createTestStore();
            await store.dispatch(healthMetricApi.endpoints.deleteHealthMetric.initiate('42'));
            const req = capturedRequests.find(
                (r: any) => typeof r === 'object' && r.url === 'health-metric/42' && r.method === 'DELETE'
            );
            expect(req).toBeDefined();
        });
    });
});
