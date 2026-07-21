import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Link: ({ to, className, children }: any) =>
    React.createElement('a', { href: to, className }, children),
  useNavigate: () => vi.fn(),
}));

// Mock RTK Query hooks
const mockUseGetConnectionsQuery = vi.fn();
const mockUseGetServiceCredentialsQuery = vi.fn();
const mockUseBeginConnectionMutation = vi.fn();
vi.mock('./connectedAccountApi', () => ({
  useGetConnectionsQuery: () => mockUseGetConnectionsQuery(),
  useBeginConnectionMutation: () => mockUseBeginConnectionMutation(),
  useSyncNowMutation: () => [vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ status: 'queued' }) }), { isLoading: false }],
  useDisconnectMutation: () => [vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ disconnected: true }) }), { isLoading: false }],
}));

vi.mock('./serviceCredentialApi', () => ({
  useGetServiceCredentialsQuery: () => mockUseGetServiceCredentialsQuery(),
}));

// Mock useRealtimeStatus
const mockUseRealtimeStatus = vi.fn();
vi.mock('./useRealtimeStatus', () => ({
  useRealtimeStatus: () => mockUseRealtimeStatus(),
}));

// Mock ConnectionCard
vi.mock('./ConnectionCard', () => ({
  ConnectionCard: ({ connection }: { connection: any }) =>
    React.createElement('div', { 'data-testid': 'connection-card', 'data-service': connection.external_service },
      React.createElement('span', null, connection.external_service),
    ),
}));

// Mock connectionRealtime side effect
vi.mock('./connectionRealtime', () => ({
  __esModule: true,
  default: {},
}));

// Import after mocks
import { ConnectedServices } from './ConnectedServices';

const mockConnections = [
  {
    id: 'conn-1',
    external_service: 'google_health',
    status: 'healthy',
    last_successful_sync_at: '2025-01-15T10:30:00Z',
    connected_at: '2024-12-01T00:00:00Z',
    needs_attention_reason: null,
    granted_scopes: ['activity_and_fitness'],
    granted_types: ['steps', 'heart_rate'],
    missing_types: ['weight'],
  },
];

const mockServices = [
  { external_service: 'google_health', configured: true },
  { external_service: 'apple_health', configured: false },
];

describe('ConnectedServices — realtime features', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseGetConnectionsQuery.mockReturnValue({
            data: { connections: mockConnections },
            isLoading: false,
            refetch: vi.fn(),
        });
        mockUseGetServiceCredentialsQuery.mockReturnValue({
            data: { services: mockServices },
            isLoading: false,
        });
        mockUseBeginConnectionMutation.mockReturnValue([
            vi.fn().mockResolvedValue({ data: {} }),
            { isLoading: false },
        ]);
        mockUseRealtimeStatus.mockReturnValue('live');
    });

    it('does not show not-live notice when live', () => {
        render(<ConnectedServices />);
        expect(screen.queryByText(/live updating is off/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
    });

    it('shows "Live updating is off" notice when not live', () => {
        mockUseRealtimeStatus.mockReturnValue('not-live');
        render(<ConnectedServices />);
        expect(screen.getByText(/live updating is off/i)).toBeInTheDocument();
    });

    it('shows Refresh button when not live', () => {
        mockUseRealtimeStatus.mockReturnValue('not-live');
        render(<ConnectedServices />);
        const refreshBtn = screen.getByRole('button', { name: /refresh/i });
        expect(refreshBtn).toBeInTheDocument();
    });

    it('calls refetch on Refresh button click', async () => {
        const mockRefetch = vi.fn().mockResolvedValue({ data: { connections: mockConnections } });
        mockUseGetConnectionsQuery.mockReturnValue({
            data: { connections: mockConnections },
            isLoading: false,
            refetch: mockRefetch,
        });
        mockUseRealtimeStatus.mockReturnValue('not-live');

        render(<ConnectedServices />);
        const refreshBtn = screen.getByRole('button', { name: /refresh/i });

        const { fireEvent } = await import('@testing-library/react');
        fireEvent.click(refreshBtn);

        await waitFor(() => {
            expect(mockRefetch).toHaveBeenCalled();
        });
    });

    it('renders ConnectionCard for each connection', () => {
        render(<ConnectedServices />);
        expect(screen.getByTestId('connection-card')).toBeInTheDocument();
    });

    it('shows ConnectionCard with correct service', () => {
        render(<ConnectedServices />);
        const card = screen.getByTestId('connection-card');
        expect(card.getAttribute('data-service')).toBe('google_health');
    });
});
