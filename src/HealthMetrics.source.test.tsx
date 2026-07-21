import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MeasurementPageType } from './types';

// Shared mutable state for API mocks
const apiState = {
    data: null as MeasurementPageType | undefined,
    isLoading: false,
    error: undefined,
    addResult: Promise.resolve({}),
    addCalls: [] as any[],
};

const mockAddFn = vi.fn((args) => {
    apiState.addCalls.push(args);
    return { unwrap: () => apiState.addResult };
});

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: vi.fn(() => vi.fn()),
    };
});

vi.mock('./healthMetricApi', () => ({
    healthMetricApi: {},
    useGetHealthMetricsQuery: (filters: any) => ({
        data: apiState.data,
        isLoading: apiState.isLoading,
        error: apiState.error,
    }),
    useAddHealthMetricMutation: () => [mockAddFn, { isLoading: false }],
}));

describe('HealthMetrics — source labels and filtering (US5)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        apiState.data = undefined;
        apiState.isLoading = false;
        apiState.error = undefined;
        apiState.addCalls = [];
        mockAddFn.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('every row names its source (FR-030)', () => {
        it('shows source label for manual reading', async () => {
            apiState.data = {
                data: [
                    {
                        id: '1',
                        user_id: 'user-1',
                        type: 'weight',
                        value: 70.5,
                        recorded_at: '2026-07-20T10:00:00Z',
                        source: 'manual',
                    },
                ],
                meta: {
                    current_page: 1,
                    last_page: 1,
                    per_page: 100,
                    total: 1,
                    available_sources: ['manual'],
                },
            };

            const { HealthMetrics } = await import('./HealthMetrics');
            render(
                <MemoryRouter>
                    <HealthMetrics />
                </MemoryRouter>
            );

            // Find the source tag in the list item (not in the filter dropdown)
            const listItems = screen.getAllByRole('listitem');
            expect(listItems.length).toBeGreaterThan(0);
            const tagElements = listItems[0].querySelectorAll('.tag');
            expect(tagElements.length).toBeGreaterThan(0);
            expect(tagElements[0].textContent).toBe('Entered manually');
        });

        it('shows source label for imported reading', async () => {
            apiState.data = {
                data: [
                    {
                        id: '2',
                        user_id: 'user-1',
                        type: 'steps',
                        value: 10000,
                        recorded_at: '2026-07-20T12:00:00Z',
                        source: 'google-health',
                    },
                ],
                meta: {
                    current_page: 1,
                    last_page: 1,
                    per_page: 100,
                    total: 1,
                    available_sources: ['google-health'],
                },
            };

            const { HealthMetrics } = await import('./HealthMetrics');
            render(
                <MemoryRouter>
                    <HealthMetrics />
                </MemoryRouter>
            );

            const listItems = screen.getAllByRole('listitem');
            expect(listItems.length).toBeGreaterThan(0);
            const tagElements = listItems[0].querySelectorAll('.tag');
            expect(tagElements.length).toBeGreaterThan(0);
            expect(tagElements[0].textContent).toBe('Google Health');
        });
    });

    describe('imported rows visually distinct from manual (FR-031)', () => {
        it('manual source has manual tag class', async () => {
            apiState.data = {
                data: [
                    {
                        id: '1',
                        user_id: 'user-1',
                        type: 'weight',
                        value: 70.5,
                        recorded_at: '2026-07-20T10:00:00Z',
                        source: 'manual',
                    },
                ],
                meta: {
                    current_page: 1,
                    last_page: 1,
                    per_page: 100,
                    total: 1,
                    available_sources: ['manual'],
                },
            };

            const { HealthMetrics } = await import('./HealthMetrics');
            render(
                <MemoryRouter>
                    <HealthMetrics />
                </MemoryRouter>
            );

            const listItems = screen.getAllByRole('listitem');
            const tagElement = listItems[0].querySelector('.tag.source-tag--manual');
            expect(tagElement).toBeInTheDocument();
        });

        it('imported source has imported tag class', async () => {
            apiState.data = {
                data: [
                    {
                        id: '2',
                        user_id: 'user-1',
                        type: 'steps',
                        value: 10000,
                        recorded_at: '2026-07-20T12:00:00Z',
                        source: 'google-health',
                    },
                ],
                meta: {
                    current_page: 1,
                    last_page: 1,
                    per_page: 100,
                    total: 1,
                    available_sources: ['google-health'],
                },
            };

            const { HealthMetrics } = await import('./HealthMetrics');
            render(
                <MemoryRouter>
                    <HealthMetrics />
                </MemoryRouter>
            );

            const listItems = screen.getAllByRole('listitem');
            const tagElement = listItems[0].querySelector('.tag.source-tag--imported');
            expect(tagElement).toBeInTheDocument();
        });
    });

    describe('empty states from meta (FR-035)', () => {
        it('meta.total === 0 with empty available_sources → "No health metrics found"', async () => {
            apiState.data = {
                data: [],
                meta: {
                    current_page: 1,
                    last_page: 1,
                    per_page: 100,
                    total: 0,
                    available_sources: [],
                },
            };

            const { HealthMetrics } = await import('./HealthMetrics');
            render(
                <MemoryRouter>
                    <HealthMetrics />
                </MemoryRouter>
            );

            expect(screen.getByText('No health metrics found')).toBeInTheDocument();
        });

        it('meta.total === 0 with non-empty available_sources → "No readings match this filter"', async () => {
            apiState.data = {
                data: [],
                meta: {
                    current_page: 1,
                    last_page: 1,
                    per_page: 100,
                    total: 0,
                    available_sources: ['manual', 'google-health'],
                },
            };

            const { HealthMetrics } = await import('./HealthMetrics');
            render(
                <MemoryRouter>
                    <HealthMetrics />
                </MemoryRouter>
            );

            expect(screen.getByText('No readings match this filter')).toBeInTheDocument();
        });
    });

    describe('prev/next controls from current_page/last_page', () => {
        it('shows next button when not on last page', async () => {
            apiState.data = {
                data: [
                    {
                        id: '1',
                        user_id: 'user-1',
                        type: 'weight',
                        value: 70.5,
                        recorded_at: '2026-07-20T10:00:00Z',
                        source: 'manual',
                    },
                ],
                meta: {
                    current_page: 1,
                    last_page: 3,
                    per_page: 100,
                    total: 300,
                    available_sources: ['manual'],
                },
            };

            const { HealthMetrics } = await import('./HealthMetrics');
            render(
                <MemoryRouter>
                    <HealthMetrics />
                </MemoryRouter>
            );

            expect(screen.getByText('Next')).toBeInTheDocument();
        });

        it('shows prev button when not on first page', async () => {
            apiState.data = {
                data: [
                    {
                        id: '2',
                        user_id: 'user-1',
                        type: 'weight',
                        value: 71.0,
                        recorded_at: '2026-07-20T11:00:00Z',
                        source: 'manual',
                    },
                ],
                meta: {
                    current_page: 2,
                    last_page: 3,
                    per_page: 100,
                    total: 300,
                    available_sources: ['manual'],
                },
            };

            const { HealthMetrics } = await import('./HealthMetrics');
            render(
                <MemoryRouter>
                    <HealthMetrics />
                </MemoryRouter>
            );

            expect(screen.getByText('Previous')).toBeInTheDocument();
        });

        it('hides prev button on first page', async () => {
            apiState.data = {
                data: [
                    {
                        id: '1',
                        user_id: 'user-1',
                        type: 'weight',
                        value: 70.5,
                        recorded_at: '2026-07-20T10:00:00Z',
                        source: 'manual',
                    },
                ],
                meta: {
                    current_page: 1,
                    last_page: 3,
                    per_page: 100,
                    total: 300,
                    available_sources: ['manual'],
                },
            };

            const { HealthMetrics } = await import('./HealthMetrics');
            render(
                <MemoryRouter>
                    <HealthMetrics />
                </MemoryRouter>
            );

            expect(screen.queryByText('Previous')).not.toBeInTheDocument();
        });

        it('hides next button on last page', async () => {
            apiState.data = {
                data: [
                    {
                        id: '3',
                        user_id: 'user-1',
                        type: 'weight',
                        value: 72.0,
                        recorded_at: '2026-07-20T12:00:00Z',
                        source: 'manual',
                    },
                ],
                meta: {
                    current_page: 3,
                    last_page: 3,
                    per_page: 100,
                    total: 300,
                    available_sources: ['manual'],
                },
            };

            const { HealthMetrics } = await import('./HealthMetrics');
            render(
                <MemoryRouter>
                    <HealthMetrics />
                </MemoryRouter>
            );

            expect(screen.queryByText('Next')).not.toBeInTheDocument();
        });
    });

    describe('disconnected service still names original source (FR-036)', () => {
        it('reading from disconnected service shows original source label', async () => {
            // The source label comes from the row's source field, not from the
            // connections list — so even if the service disconnected, the label
            // remains "Google Health" for a reading that came from google-health.
            apiState.data = {
                data: [
                    {
                        id: '5',
                        user_id: 'user-1',
                        type: 'steps',
                        value: 8500,
                        recorded_at: '2026-07-19T08:00:00Z',
                        source: 'google-health',
                    },
                ],
                meta: {
                    current_page: 1,
                    last_page: 1,
                    per_page: 100,
                    total: 1,
                    available_sources: ['google-health'],
                },
            };

            const { HealthMetrics } = await import('./HealthMetrics');
            render(
                <MemoryRouter>
                    <HealthMetrics />
                </MemoryRouter>
            );

            const listItems = screen.getAllByRole('listitem');
            const tagElement = listItems[0].querySelector('.tag');
            expect(tagElement?.textContent).toBe('Google Health');
        });
    });

    describe('existing add-metric form still works', () => {
        it('submitting the form calls addHealthMetric', async () => {
            apiState.data = {
                data: [],
                meta: {
                    current_page: 1,
                    last_page: 1,
                    per_page: 100,
                    total: 0,
                    available_sources: [],
                },
            };

            const { HealthMetrics } = await import('./HealthMetrics');
            render(
                <MemoryRouter>
                    <HealthMetrics />
                </MemoryRouter>
            );

            const typeInput = screen.getByPlaceholderText(/e\.g\./i);
            const valueInput = screen.getByPlaceholderText('Value');
            const submitBtn = screen.getByText('Add Health Metric');

            fireEvent.change(typeInput, { target: { value: 'weight' } });
            fireEvent.change(valueInput, { target: { value: '75' } });
            fireEvent.click(submitBtn);

            expect(mockAddFn).toHaveBeenCalled();
        });
    });
});
