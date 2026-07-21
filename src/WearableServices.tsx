import React, { useState } from 'react';
import {
  useGetServiceCredentialsQuery,
  useVerifyServiceCredentialMutation,
  useDeleteServiceCredentialMutation,
} from './serviceCredentialApi';
import { ServiceCredentialForm } from './ServiceCredentialForm';
import { serviceLabel } from './sourceLabels';
import type { ServiceCredentialType } from './types';

export const WearableServices: React.FC = () => {
  const {
    data,
    isLoading,
    error,
  } = useGetServiceCredentialsQuery();
  const services = data?.services ?? [];
  const [verifyCredential, { isLoading: verifying }] = useVerifyServiceCredentialMutation();
  const [deleteCredential, { isLoading: deleting }] = useDeleteServiceCredentialMutation();
  const [removingService, setRemovingService] = useState<string | null>(null);
  const [verifyPending, setVerifyPending] = useState<string | null>(null);
  const [verifyOutcome, setVerifyOutcome] = useState<Record<string, string>>({});
  const [transportError, setTransportError] = useState<string | null>(null);
  const [removalOutcome, setRemovalOutcome] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="container">
        <h1 className="title">Wearable Services</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1 className="title">Wearable Services</h1>
        <div className="notification is-danger">
          Cannot reach the server. Error — retry.
        </div>
      </div>
    );
  }

  const handleVerify = async (service: ServiceCredentialType) => {
    setVerifyPending(service.external_service);
    setVerifyOutcome((prev) => ({ ...prev, [service.external_service]: '' }));
    setTransportError(null);

    try {
      const result = await verifyCredential({
        service: service.external_service,
      }).unwrap();

      const outcome =
        result.outcome === 'passed'
          ? 'Credentials still valid.'
          : result.outcome === 'failed'
          ? 'Credentials failed verification. Check them.'
          : 'Verification returned an unknown result.';
      setVerifyOutcome((prev) => ({ ...prev, [service.external_service]: outcome }));
    } catch (err: any) {
      setTransportError('Could not verify. Try again.');
    } finally {
      setVerifyPending(null);
    }
  };

  const handleRemove = async (service: ServiceCredentialType) => {
    setRemovingService(service.external_service);
    setTransportError(null);

    try {
      const result = await deleteCredential({
        service: service.external_service,
      }).unwrap();

      // Confirmation of the node-wide impact the user was warned about before
      // the action — never the first mention of it.
      const marked = result?.connections_marked_needing_attention ?? 0;
      setRemovalOutcome(
        marked === 0
          ? `${serviceLabel(service.external_service)} is no longer configured. No existing connections were affected.`
          : `${serviceLabel(service.external_service)} is no longer configured. ${marked} existing ${
              marked === 1 ? 'connection' : 'connections'
            } on this node stopped working, as warned.`,
      );
    } catch (err: any) {
      setTransportError('Could not remove. Try again.');
    } finally {
      setRemovingService(null);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Wearable Services</h1>
      <p className="subtitle">
        Configure credentials for external services. Each service is shared by everyone on the
        node.
      </p>

      {transportError && (
        <div className="notification is-danger">
          {transportError}
        </div>
      )}

      {removalOutcome && (
        <div className="notification is-info">
          {removalOutcome}
        </div>
      )}

      {services.length === 0 && (
        <div className="notification is-info">
          No services registered on this node.
        </div>
      )}

      {services.map((service: ServiceCredentialType) => (
        <div key={service.external_service} className="box">
          <h2 className="title is-3">{serviceLabel(service.external_service)}</h2>

          <ServiceCredentialForm service={service} />

          {service.configured && (
            <div className="content">
              <button
                className="button is-link"
                onClick={() => handleVerify(service)}
                disabled={verifying || verifyPending === service.external_service}
              >
                {verifying && verifyPending === service.external_service
                  ? 'Verifying...'
                  : 'Verify'}
              </button>

              {verifyOutcome[service.external_service] && (
                <p className="has-text-info">
                  {verifyOutcome[service.external_service]}
                </p>
              )}

              {service.last_verification_outcome && (
                <p className="has-text-grey is-size-7">
                  Last check: {service.last_verification_outcome === 'passed' ? 'Verified OK' : service.last_verification_outcome === 'failed' ? 'Verification failed' : 'Needs authorization'}
                  {service.last_verified_at && ` — ${new Date(service.last_verified_at).toLocaleString()}`}
                </p>
              )}
            </div>
          )}

          {service.configured && (
            <div className="content">
              {removingService === service.external_service ? (
                <div className="notification is-warning">
                  <strong>Confirm removal.</strong> This credential is shared by everyone on the node. Existing connections for every user will stop working.
                  <div className="field is-grouped">
                    <button
                      className="button is-danger"
                      onClick={() => handleRemove(service)}
                      disabled={deleting}
                    >
                      {deleting ? 'Removing...' : 'Yes, remove'}
                    </button>
                    <button
                      className="button"
                      onClick={() => setRemovingService(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="button is-danger"
                  onClick={() => setRemovingService(service.external_service)}
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
