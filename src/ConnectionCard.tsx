import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSyncNowMutation, useBeginConnectionMutation, useDisconnectMutation } from './connectedAccountApi';
import { scopeLabel } from './scopeLabels';
import {
    attentionReasonCopy,
    attentionReasonRemedy,
    reasonRoutesToWearableServices,
} from './attentionReasons';
import type { ConnectionType, SyncRequestState } from './types';

interface ConnectionCardProps {
    connection: ConnectionType;
}

function humanizeService(slug: string): string {
    return slug
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSyncTime(iso: string | null): string {
    if (!iso) return 'Never updated successfully';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Never updated successfully';
    return d.toLocaleString();
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({ connection }) => {
    const [syncNow, { isLoading: syncing }] = useSyncNowMutation();
    const [beginConnection, { isLoading: connecting }] = useBeginConnectionMutation();
    const [disconnect, { isLoading: disconnecting }] = useDisconnectMutation();
    const [syncState, setSyncState] = useState<SyncRequestState>({ kind: 'idle' });
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
    const [disconnectError, setDisconnectError] = useState<string | null>(null);

    const handleSync = useCallback(async () => {
        setSyncState({ kind: 'requesting' });
        try {
            const result = await syncNow({ connectionId: connection.id }).unwrap();
            const status = result?.status ?? 'queued';

            if (status === 'already_running') {
                setSyncState({ kind: 'already_running', at: Date.now() });
            } else {
                setSyncState({ kind: 'queued', at: Date.now() });
            }
        } catch (err: any) {
            setSyncState({
                kind: 'refused',
                reason: err?.data?.error || err?.message || 'Sync request failed',
            });
        }
    }, [syncNow, connection.id]);

    const handleReconnect = useCallback(async () => {
        try {
            const result = await beginConnection({
                external_service: connection.external_service,
            }).unwrap();
            window.open(result.authorization_url, '_self');
        } catch {
            // Silently fail; the user will see no change and can retry.
        }
    }, [beginConnection, connection.external_service]);

    const handleDisconnectConfirm = useCallback(async () => {
        setDisconnectError(null);
        try {
            const result = await disconnect({ connectionId: connection.id }).unwrap();
            if (result?.disconnected) {
                setShowDisconnectConfirm(false);
            } else {
                setDisconnectError('Disconnect did not complete. Please try again.');
            }
        } catch (err: any) {
            setDisconnectError(err?.data?.error || err?.message || 'Disconnect failed. Please try again.');
        }
    }, [disconnect, connection.id]);

    const handleDisconnectCancel = useCallback(() => {
        setShowDisconnectConfirm(false);
        setDisconnectError(null);
    }, []);

    const isNeedsAttention = connection.status === 'needs_attention';
    const reason = connection.needs_attention_reason;
    const remedy = isNeedsAttention && reason
        ? attentionReasonRemedy(reason)
        : null;
    const routesToWearableServices = isNeedsAttention && reason
        ? reasonRoutesToWearableServices(reason)
        : false;
    const reconnectDisabled = remedy === 'wearable_services_disabled_reconnect';

    return (
        <>
        <div className="box">
            <div className="media">
                <div className="media-content">
                    <div className="level">
                        <div className="level-left">
                            <div>
                                <p className="is-size-5">
                                    {humanizeService(connection.external_service)}
                                </p>
                                <p className={isNeedsAttention ? 'has-text-danger' : 'has-text-success'}>
                                    {isNeedsAttention
                                        ? (reason ? attentionReasonCopy(reason, connection.external_service) : 'Needs Attention')
                                        : 'Healthy'}
                                </p>
                            </div>
                        </div>
                        <div className="level-right">
                            <div className="level-item">
                                <p className="is-size-7 has-text-grey">
                                    Last successful update: {formatSyncTime(connection.last_successful_sync_at)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Needs-attention remedy actions */}
                    {isNeedsAttention && reason && (
                        <div className="mt-3">
                            {/* Wearable Services link — primary for config-side reasons */}
                            {routesToWearableServices && (
                                <p className="mb-2">
                                    <Link
                                        to="/clarion-app/life-log/wearable-services"
                                        className={reconnectDisabled ? 'button is-small is-link' : 'button is-small is-link'}
                                    >
                                        Check Service Configuration
                                    </Link>
                                </p>
                            )}

                            {/* Reconnect button */}
                            <div className="buttons are-small">
                                <button
                                    className={`button is-small ${
                                        remedy === 'reconnect'
                                            ? 'is-info'
                                            : 'is-outlined'
                                    }`}
                                    disabled={reconnectDisabled || connecting}
                                    onClick={handleReconnect}
                                >
                                    {connecting
                                        ? 'Connecting…'
                                        : reconnectDisabled
                                            ? 'Reconnect (needs configuration first)'
                                            : 'Reconnect'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Granted Permissions */}
                    {connection.granted_scopes.length > 0 && connection.granted_types.length > 0 && (
                        <div className="mt-3">
                            <p className="is-size-7 has-text-grey">What will arrive:</p>
                            <div className="tags">
                                {connection.granted_types.map((type) => (
                                    <span key={type} className="tag is-light is-small">
                                        {scopeLabel(type)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Missing Types */}
                    {connection.granted_scopes.length > 0 && connection.missing_types.length > 0 && (
                        <div className="mt-2">
                            <p className="is-size-7 has-text-grey">What will not arrive:</p>
                            <div className="tags">
                                {connection.missing_types.map((type) => (
                                    <span key={type} className="tag is-light is-small is-disabled">
                                        {scopeLabel(type)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No Permissions Recorded */}
                    {connection.granted_scopes.length === 0 && (
                        <div className="mt-2">
                            <p className="is-size-7 has-text-grey">
                                Permissions not recorded for this connection.
                            </p>
                        </div>
                    )}

                    {/* Update Now Button */}
                    <div className="mt-3">
                        {syncState.kind === 'idle' && (
                            <button
                                className="button is-small is-info"
                                disabled={syncing}
                                onClick={handleSync}
                            >
                                {syncing ? 'Requesting…' : 'Update now'}
                            </button>
                        )}
                        {syncState.kind === 'requesting' && (
                            <span className="has-text-grey is-size-7">Requesting…</span>
                        )}
                        {syncState.kind === 'queued' && (
                            <span className="has-text-success is-size-7">Update requested</span>
                        )}
                        {syncState.kind === 'already_running' && (
                            <span className="has-text-warning is-size-7">
                                An update is already running
                            </span>
                        )}
                        {syncState.kind === 'refused' && (
                            <span className="has-text-danger is-size-7">{syncState.reason}</span>
                        )}
                        {syncState.kind === 'failed' && (
                            <span className="has-text-danger is-size-7">Update failed</span>
                        )}
                    </div>

                    {/* Disconnect Button */}
                    <div className="mt-3">
                        <button
                            className="button is-small is-danger is-outlined"
                            disabled={disconnecting}
                            onClick={() => {
                                setDisconnectError(null);
                                setShowDisconnectConfirm(true);
                            }}
                        >
                            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Disconnect Confirmation Modal */}
        {showDisconnectConfirm && (
            <div className="modal is-active">
                <div className="modal-background" onClick={handleDisconnectCancel} />
                <div className="modal-card">
                    <header className="modal-card-head">
                        <p className="modal-card-title">Disconnect {humanizeService(connection.external_service)}</p>
                    </header>
                    <section className="modal-card-body">
                        <p>
                            This will stop future data from {humanizeService(connection.external_service)}.
                            Measurements already imported from this service are kept.
                        </p>
                        {disconnectError && (
                            <div className="notification is-danger mt-3">
                                <p>{disconnectError}</p>
                            </div>
                        )}
                    </section>
                    <footer className="modal-card-foot">
                        <button
                            className="button is-danger"
                            disabled={disconnecting}
                            onClick={handleDisconnectConfirm}
                        >
                            {disconnecting ? 'Disconnecting…' : 'Confirm'}
                        </button>
                        <button
                            className="button"
                            disabled={disconnecting}
                            onClick={handleDisconnectCancel}
                        >
                            Cancel
                        </button>
                    </footer>
                </div>
            </div>
        )}
        </>
    );
};
