import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock RTK Query hooks
const mockUseSyncNowMutation = vi.fn();
vi.mock('./connectedAccountApi', () => ({
  useGetConnectionsQuery: () => ({ data: { connections: [] }, isLoading: false }),
  useBeginConnectionMutation: () => [vi.fn(), { isLoading: false }],
  useSyncNowMutation: () => mockUseSyncNowMutation(),
  useDisconnectMutation: () => [vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ disconnected: true }) }), { isLoading: false }],
}));

// Default mock: returns [mutationFn, { isLoading: false }]
const defaultMockMutation = vi.fn().mockReturnValue({
  unwrap: () => Promise.resolve({ status: 'queued' }),
});

vi.mock('./useRealtimeStatus', () => ({
  useRealtimeStatus: () => 'live',
}));

// Import after mocks
import { ConnectionCard } from './ConnectionCard';
import type { ConnectionType } from './types';

const makeConnection = (overrides: Partial<ConnectionType> = {}): ConnectionType => ({
  id: 'conn-1',
  external_service: 'google_health',
  status: 'healthy',
  last_successful_sync_at: '2025-01-15T10:30:00Z',
  connected_at: '2024-12-01T00:00:00Z',
  needs_attention_reason: null,
  granted_scopes: ['activity_and_fitness'],
  granted_types: ['steps', 'heart_rate', 'calories_burned', 'workout'],
  missing_types: ['weight', 'sleep'],
  ...overrides,
});

describe('ConnectionCard', () => {
    beforeEach(() => {
        mockUseSyncNowMutation.mockReset();
        mockUseSyncNowMutation.mockImplementation(() => [
            defaultMockMutation,
            { isLoading: false },
        ]);
    });

    describe('FR-017: shows service, status, granted permissions, last update', () => {
        it('renders service name', () => {
            render(<ConnectionCard connection={makeConnection()} />);
            expect(screen.getByText(/Google Health/i)).toBeInTheDocument();
        });

        it('renders status as healthy', () => {
            render(<ConnectionCard connection={makeConnection()} />);
            expect(screen.getByText(/Healthy/i)).toBeInTheDocument();
        });

        it('renders granted permissions as data phrases', () => {
            render(<ConnectionCard connection={makeConnection()} />);
            expect(screen.getByText('Steps')).toBeInTheDocument();
            expect(screen.getByText('Heart Rate')).toBeInTheDocument();
        });

        it('renders last successful update time', () => {
            render(<ConnectionCard connection={makeConnection()} />);
            // The date should be rendered in some form
            expect(screen.queryByText(/Last successful update/i)).not.toBeNull();
        });
    });

    describe('FR-018: never updated successfully', () => {
        it('renders "Never updated successfully" for null last_successful_sync_at', () => {
            render(<ConnectionCard connection={makeConnection({ last_successful_sync_at: null })} />);
            expect(screen.getByText(/Never updated successfully/i)).toBeInTheDocument();
        });

        it('does not use connected_at as a stand-in', () => {
            render(<ConnectionCard connection={makeConnection({ last_successful_sync_at: null })} />);
            // connected_at should not appear in the "last update" area
            expect(screen.getByText(/Never updated successfully/i)).toBeInTheDocument();
            expect(screen.queryByText(/12\/01\/2024/i)).not.toBeInTheDocument();
        });
    });

    describe('FR-022: grant matrix rendering', () => {
        it('shows "what will arrive" for granted types', () => {
            render(<ConnectionCard connection={makeConnection()} />);
            expect(screen.getByText('Steps')).toBeInTheDocument();
        });

        it('shows "what will not arrive" for missing types', () => {
            render(<ConnectionCard connection={makeConnection()} />);
            expect(screen.getByText('Weight')).toBeInTheDocument();
        });

        it('full grant renders no "will not arrive" section', () => {
            render(<ConnectionCard connection={makeConnection({
                granted_types: ['steps', 'heart_rate', 'calories_burned', 'workout', 'weight', 'sleep'],
                missing_types: [],
            })} />);
            expect(screen.queryByText(/will not arrive/i)).not.toBeInTheDocument();
        });

        it('empty granted_scopes shows "Permissions not recorded"', () => {
            render(<ConnectionCard connection={makeConnection({
                granted_scopes: [],
                granted_types: [],
                missing_types: ['steps', 'heart_rate'],
            })} />);
            expect(screen.getByText(/Permissions not recorded/i)).toBeInTheDocument();
        });
    });

    describe('FR-019: Update now — queued acknowledgement', () => {
        it('shows "Update requested" on 202 queued', async () => {
            mockUseSyncNowMutation.mockImplementation(() => [
                vi.fn().mockReturnValue({
                    unwrap: () => Promise.resolve({ status: 'queued' }),
                }),
                { isLoading: false },
            ]);

            render(<ConnectionCard connection={makeConnection()} />);
            const button = screen.getByRole('button', { name: /update/i });
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/Update requested/i)).toBeInTheDocument();
            });
        });
    });

    describe('FR-020: Update now — already running', () => {
        it('shows "An update is already running" on 202 already_running', async () => {
            mockUseSyncNowMutation.mockImplementation(() => [
                vi.fn().mockReturnValue({
                    unwrap: () => Promise.resolve({ status: 'already_running' }),
                }),
                { isLoading: false },
            ]);

            render(<ConnectionCard connection={makeConnection()} />);
            const button = screen.getByRole('button', { name: /update/i });
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/An update is already running/i)).toBeInTheDocument();
            });
        });

        it('does not show an error for already_running', async () => {
            mockUseSyncNowMutation.mockImplementation(() => [
                vi.fn().mockReturnValue({
                    unwrap: () => Promise.resolve({ status: 'already_running' }),
                }),
                { isLoading: false },
            ]);

            render(<ConnectionCard connection={makeConnection()} />);
            const button = screen.getByRole('button', { name: /update/i });
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.queryByRole('alert')).not.toBeInTheDocument();
            });
        });
    });

    describe('Update now — 409 refusal renders the reason, not the wire value', () => {
        const refuse = (reason: string) =>
            mockUseSyncNowMutation.mockImplementation(() => [
                vi.fn().mockReturnValue({
                    unwrap: () =>
                        Promise.reject({
                            status: 409,
                            data: { error: 'needs_attention', reason },
                        }),
                }),
                { isLoading: false },
            ]);

        it('renders the closed-set copy for the refusal reason', async () => {
            refuse('credential_removed');

            render(
                <MemoryRouter>
                    <ConnectionCard connection={makeConnection({
                        status: 'needs_attention',
                        needs_attention_reason: 'credential_removed',
                    })} />
                </MemoryRouter>,
            );
            fireEvent.click(screen.getByRole('button', { name: /update now/i }));

            await waitFor(() => {
                expect(
                    screen.getAllByText(/no longer configured on this node/i).length,
                ).toBeGreaterThan(0);
            });
        });

        it('never echoes the raw wire values', async () => {
            refuse('credential_removed');

            render(
                <MemoryRouter>
                    <ConnectionCard connection={makeConnection({
                        status: 'needs_attention',
                        needs_attention_reason: 'credential_removed',
                    })} />
                </MemoryRouter>,
            );
            fireEvent.click(screen.getByRole('button', { name: /update now/i }));

            await waitFor(() => {
                expect(screen.queryByText(/needs_attention/)).not.toBeInTheDocument();
                expect(screen.queryByText(/credential_removed/)).not.toBeInTheDocument();
            });
        });
    });

    describe('the acknowledgement is transient, not a status', () => {
        it('keeps Update now reachable after a queued acknowledgement', async () => {
            render(<ConnectionCard connection={makeConnection()} />);
            fireEvent.click(screen.getByRole('button', { name: /update now/i }));

            await waitFor(() => {
                expect(screen.getByText(/Update requested/i)).toBeInTheDocument();
            });
            expect(screen.getByRole('button', { name: /update now/i })).toBeEnabled();
        });

        it('clears once the connection itself moves', async () => {
            const { rerender } = render(<ConnectionCard connection={makeConnection()} />);
            fireEvent.click(screen.getByRole('button', { name: /update now/i }));

            await waitFor(() => {
                expect(screen.getByText(/Update requested/i)).toBeInTheDocument();
            });

            // What a broadcast or a refetch delivers: a newer successful update.
            rerender(<ConnectionCard connection={makeConnection({
                last_successful_sync_at: '2025-01-16T10:30:00Z',
            })} />);

            await waitFor(() => {
                expect(screen.queryByText(/Update requested/i)).not.toBeInTheDocument();
            });
        });
    });

    describe('Update now is not the primary action on an unhealthy card', () => {
        it('is primary when healthy', () => {
            render(<ConnectionCard connection={makeConnection()} />);
            expect(
                screen.getByRole('button', { name: /update now/i }).className,
            ).toContain('is-info');
        });

        it('is demoted when the connection needs attention', () => {
            render(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'access_revoked',
            })} />);
            expect(
                screen.getByRole('button', { name: /update now/i }).className,
            ).not.toContain('is-info');
        });
    });

    describe('no "syncing" status badge', () => {
        it('never renders "syncing" as a status', () => {
            render(<ConnectionCard connection={makeConnection()} />);
            expect(screen.queryByText(/syncing/i)).not.toBeInTheDocument();
        });
    });

    describe('needs_attention rendering', () => {
        it('renders needs_attention reason copy', () => {
            render(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'access_revoked',
            })} />);
            expect(screen.getByText(/Access to Google Health was withdrawn/i)).toBeInTheDocument();
        });
    });
});
