import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useGetConnectionsQuery,
  useBeginConnectionMutation,
} from './connectedAccountApi';
import { useGetServiceCredentialsQuery } from './serviceCredentialApi';
import type { ConfiguredServiceType, ConnectionType } from './types';
import { ConnectionCard } from './ConnectionCard';
import { useRealtimeStatus } from './useRealtimeStatus';
// Side-effect import: registers handler for ConnectedAccountStatusChanged broadcasts
import './connectionRealtime';

export const ConnectedServices: React.FC = () => {
  const navigate = useNavigate();
  const realtimeStatus = useRealtimeStatus();
  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    error: connectionsError,
    refetch,
  } = useGetConnectionsQuery();
  const {
    data: servicesData,
    isLoading: servicesLoading,
    error: servicesError,
  } = useGetServiceCredentialsQuery();
  const [beginConnection, { isLoading: connecting }] = useBeginConnectionMutation();
  const [connectError, setConnectError] = useState<Record<string, string>>({});

  const connections = connectionsData?.connections ?? [];
  const services = servicesData?.services ?? [];
  const isLoading = connectionsLoading || servicesLoading;
  const hasError = !!connectionsError || !!servicesError;

  // Set of already-connected service slugs
  const connectedServices = new Set(connections.map((c: ConnectionType) => c.external_service));

  // Configured services that are NOT yet connected — these are connectable
  const connectableServices = services.filter(
    (s) => s.configured && !connectedServices.has(s.external_service)
  ) as ConfiguredServiceType[];

  // Unconfigured services — shown as unavailable
  const unavailableServices = services.filter((s) => !s.configured);

  const handleConnect = async (externalService: string) => {
    setConnectError((prev) => ({ ...prev, [externalService]: '' }));
    try {
      const result = await beginConnection({ external_service: externalService }).unwrap();
      window.open(result.authorization_url, '_self');
    } catch (err: any) {
      if (err?.status === 422 && err?.data?.error === 'service_unavailable') {
        setConnectError((prev) => ({
          ...prev,
          [externalService]:
            'This service is not available. It must be configured first.',
        }));
      } else {
        setConnectError((prev) => ({
          ...prev,
          [externalService]: 'Could not start connection. Try again.',
        }));
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container">
        <h1 className="title">Connected Services</h1>
        <p>Loading…</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container">
        <h1 className="title">Connected Services</h1>
        <div className="notification is-danger">
          Cannot reach the application. Please retry.
        </div>
      </div>
    );
  }

  // Empty state: no connections and no services at all
  if (connections.length === 0 && services.length === 0) {
    return (
      <div className="container">
        <h1 className="title">Connected Services</h1>
        <p className="subtitle">
          Connect a wearable or health service to automatically sync your activity, heart rate,
          and other health data.
        </p>
        <div className="notification is-info">
          <p>
            No services are registered on this node yet. When a service is configured, it will
            appear here so you can connect your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="title">Connected Services</h1>
      <p className="subtitle">
        Connect a wearable or health service to automatically sync your activity, heart rate,
        and other health data.
      </p>

      {/* Realtime status notice */}
      {realtimeStatus === 'not-live' && (
        <div className="notification is-warning mb-4">
          <p>Live updating is off. Changes may not appear until you refresh.</p>
          <button className="button is-small is-link mt-2" onClick={() => refetch()}>
            Refresh
          </button>
        </div>
      )}

      {/* Already-connected services */}
      {connections.length > 0 && (
        <div className="mb-6">
          <h2 className="title is-4">Your Connections</h2>
          {connections.map((conn: ConnectionType) => (
            <ConnectionCard key={conn.id} connection={conn} />
          ))}
        </div>
      )}

      {/* Connectable services */}
      {connectableServices.length > 0 && (
        <div className="mb-6">
          <h2 className="title is-4">Available to Connect</h2>
          {connectableServices.map((svc) => (
            <div key={svc.external_service} className="box">
              <div className="media">
                <div className="media-content">
                  <p className="is-size-5">
                    {humanizeService(svc.external_service)}
                  </p>
                  {connectError[svc.external_service] && (
                    <p className="has-text-danger mt-2">
                      {connectError[svc.external_service]}
                    </p>
                  )}
                  {svc.external_service === 'google-health' &&
                    connectError[svc.external_service]?.includes('configure') && (
                      <p className="mt-2">
                        <Link
                          to="/clarion-app/life-log/wearable-services"
                          className="has-text-link"
                        >
                          Go to Wearable Services to configure it first.
                        </Link>
                      </p>
                    )}
                </div>
                <div className="media-right">
                  <button
                    className="button is-link"
                    disabled={connecting}
                    onClick={() => handleConnect(svc.external_service)}
                  >
                    {connecting ? 'Connecting…' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unavailable services */}
      {unavailableServices.length > 0 && (
        <div className="mb-6">
          <h2 className="title is-4">Not Yet Configured</h2>
          {unavailableServices.map((svc) => (
            <div key={svc.external_service} className="box">
              <div className="media">
                <div className="media-content">
                  <p className="is-size-5">
                    {humanizeService(svc.external_service)}
                  </p>
                  <p className="has-text-grey">
                    This service is not configured on this node.
                    <br />
                    <Link
                      to="/clarion-app/life-log/wearable-services"
                      className="has-text-link"
                    >
                      Configure it in Wearable Services first.
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function humanizeService(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}
