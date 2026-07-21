import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock RTK Query hooks
const mockUseSyncNowMutation = vi.fn();
const mockUseBeginConnectionMutation = vi.fn();
const mockUseDisconnectMutation = vi.fn();

vi.mock('./connectedAccountApi', () => ({
  useGetConnectionsQuery: () => ({ data: { connections: [] }, isLoading: false }),
  useBeginConnectionMutation: () => mockUseBeginConnectionMutation(),
  useSyncNowMutation: () => mockUseSyncNowMutation(),
  useDisconnectMutation: () => mockUseDisconnectMutation(),
}));

vi.mock('./useRealtimeStatus', () => ({
  useRealtimeStatus: () => 'live',
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as any),
        Link: ({ to, className, children }: any) => (
            <a href={to} className={className} data-testid="link">
                {children}
            </a>
        ),
        useNavigate: () => vi.fn(),
    };
});

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
  granted_types: ['steps', 'heart_rate'],
  missing_types: [],
  ...overrides,
});

const wrap = (ui: React.ReactElement) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ConnectionCard problems (US4)', () => {
    beforeEach(() => {
        mockUseSyncNowMutation.mockImplementation(() => [
            vi.fn().mockReturnValue({
                unwrap: () => Promise.resolve({ status: 'queued' }),
            }),
            { isLoading: false },
        ]);
        mockUseBeginConnectionMutation.mockImplementation(() => [
            vi.fn().mockReturnValue({
                unwrap: () => Promise.resolve({ authorization_url: 'https://auth.example.com' }),
            }),
            { isLoading: false },
        ]);
        mockUseDisconnectMutation.mockImplementation(() => [
            vi.fn().mockReturnValue({
                unwrap: () => Promise.resolve({ disconnected: true }),
            }),
            { isLoading: false },
        ]);
    });

    describe('needs-attention connection marked inline (FR-024)', () => {
        it('shows needs-attention status inline without expander or tooltip', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'access_revoked',
            })} />);

            // The status should be visible without clicking or hovering
            expect(screen.getByText(/Access to Google Health was withdrawn/i)).toBeInTheDocument();
            // Should have danger styling
            const statusEl = screen.getByText(/Access to Google Health was withdrawn/i);
            expect(statusEl.classList.contains('has-text-danger')).toBe(true);
        });

        it('does not hide the reason behind an expander', () => {
            const { container } = wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'sync_failures',
            })} />);

            // No details/summary elements (common expander pattern)
            const details = container.querySelectorAll('details');
            expect(details.length).toBe(0);
        });

        it('does not require a tooltip to see the reason', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'access_expired',
            })} />);

            // Reason text is directly in the DOM, not in a title attribute
            expect(screen.getByText(/Access to Google Health expired/i)).toBeInTheDocument();
        });
    });

    describe('reconnect offered for every needs-attention connection', () => {
        const reconnectableReasons = [
            'authorization_unrenewable',
            'sync_failures',
            'access_revoked',
            'access_expired',
            'invalid_request',
            'unknown',
        ];

        for (const reason of reconnectableReasons) {
            it(`${reason} offers a Reconnect button`, () => {
                wrap(<ConnectionCard connection={makeConnection({
                    status: 'needs_attention',
                    needs_attention_reason: reason,
                })} />);

                expect(screen.getByRole('button', { name: /reconnect/i })).toBeInTheDocument();
            });
        }
    });

    describe('reconnect disabled with reason for credential_removed', () => {
        it('shows Reconnect button disabled', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'credential_removed',
            })} />);

            const reconnectBtn = screen.getByRole('button', { name: /reconnect/i });
            expect(reconnectBtn).toBeDisabled();
        });

        it('explains why reconnect is disabled', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'credential_removed',
            })} />);

            // Should mention that the service needs to be configured first
            expect(screen.getByText(/configured/i)).toBeInTheDocument();
        });

        it('provides a link to Wearable Services', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'credential_removed',
            })} />);

            const link = screen.getByTestId('link');
            expect(link.getAttribute('href')).toContain('wearable-services');
        });
    });

    describe('credential_rotated: settings link primary, Reconnect secondary', () => {
        it('shows a link to Wearable Services', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'credential_rotated',
            })} />);

            const link = screen.getByTestId('link');
            expect(link.getAttribute('href')).toContain('wearable-services');
        });

        it('shows Reconnect as a secondary button', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'credential_rotated',
            })} />);

            const reconnectBtn = screen.getByRole('button', { name: /reconnect/i });
            expect(reconnectBtn).toBeInTheDocument();
            // Secondary styling via is-outlined or is-light class
            expect(reconnectBtn.classList.contains('is-outlined') ||
                    reconnectBtn.classList.contains('is-light')).toBe(true);
        });
    });

    describe('rate_limited / service_unavailable: "usually clears on its own"', () => {
        it('rate_limited shows "usually clears on its own" copy', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'rate_limited',
            })} />);

            expect(screen.getByText(/clears on its own|usually clears|temporary/i)).toBeInTheDocument();
        });

        it('service_unavailable shows "usually clears on its own" copy', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'service_unavailable',
            })} />);

            expect(screen.getByText(/clears on its own|usually clears|temporary/i)).toBeInTheDocument();
        });

        it('rate_limited offers reconnect as secondary action', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'rate_limited',
            })} />);

            const reconnectBtn = screen.getByRole('button', { name: /reconnect/i });
            expect(reconnectBtn).toBeInTheDocument();
            expect(reconnectBtn.classList.contains('is-outlined') ||
                    reconnectBtn.classList.contains('is-light')).toBe(true);
        });
    });

    describe('healthy connection with renewed token reports nothing', () => {
        it('shows Healthy status with no reason text', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'healthy',
                needs_attention_reason: null,
            })} />);

            expect(screen.getByText('Healthy')).toBeInTheDocument();
            expect(screen.queryByText(/revoked/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/expired/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
        });

        it('does not show reconnect button for healthy connections', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'healthy',
                needs_attention_reason: null,
            })} />);

            expect(screen.queryByRole('button', { name: /reconnect/i })).not.toBeInTheDocument();
        });
    });

    describe('reconnect runs same hand-off as first connection', () => {
        it('clicking Reconnect calls beginConnection with external_service', async () => {
            const beginMock = vi.fn().mockReturnValue({
                unwrap: () => Promise.resolve({ authorization_url: 'https://auth.example.com' }),
            });
            mockUseBeginConnectionMutation.mockImplementation(() => [
                beginMock,
                { isLoading: false },
            ]);

            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'access_revoked',
            })} />);

            const reconnectBtn = screen.getByRole('button', { name: /reconnect/i });
            fireEvent.click(reconnectBtn);

            await waitFor(() => {
                expect(beginMock).toHaveBeenCalledWith({
                    external_service: 'google_health',
                });
            });
        });
    });

    describe('credentials_rejected routes to Wearable Services', () => {
        it('shows link to Wearable Services', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'credentials_rejected',
            })} />);

            const link = screen.getByTestId('link');
            expect(link.getAttribute('href')).toContain('wearable-services');
        });
    });

    describe('unrecognised reason shows unknown copy', () => {
        it('renders unknown copy for a reason not in the closed set', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'some_future_reason',
            })} />);

            // Should show the unknown fallback message
            expect(screen.getByText(/stopped working|wasn't recorded|reconnecting usually/i)).toBeInTheDocument();
        });

        it('does not echo the raw reason value', () => {
            wrap(<ConnectionCard connection={makeConnection({
                status: 'needs_attention',
                needs_attention_reason: 'some_future_reason',
            })} />);

            expect(screen.queryByText('some_future_reason')).not.toBeInTheDocument();
        });
    });
});
