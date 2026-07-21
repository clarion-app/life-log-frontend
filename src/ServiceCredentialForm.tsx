import React, { useState, useRef, useCallback } from 'react';
import {
  useCreateServiceCredentialMutation,
  useUpdateServiceCredentialMutation,
} from './serviceCredentialApi';
import { callbackUrlFor } from './callbackUrl';
import { CallbackAddress } from './CallbackAddress';
import type {
  ConfiguredServiceType,
  ServiceCredentialType,
  CreateCredentialPayload,
  UpdateCredentialPayload,
} from './types';

interface ServiceCredentialFormProps {
  service: ServiceCredentialType;
}

export const ServiceCredentialForm: React.FC<ServiceCredentialFormProps> = ({ service }) => {
  const clientIdRef = useRef<HTMLInputElement>(null);
  const secretRef = useRef<HTMLInputElement>(null);
  const [secretTouched, setSecretTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createCredential, { isLoading: creating }] = useCreateServiceCredentialMutation();
  const [updateCredential, { isLoading: updating }] = useUpdateServiceCredentialMutation();

  const isConfigured = service.configured;
  const isLoading = creating || updating;

  const validate = useCallback((): boolean => {
    const errors: Record<string, string[]> = {};
    const clientIdVal = clientIdRef.current?.value?.trim() ?? '';
    if (!clientIdVal) {
      errors.client_id = ['Client ID is required. Enter the value from the provider console.'];
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    if (!validate()) return;

    const clientIdVal = clientIdRef.current?.value?.trim() ?? '';
    const secretVal = secretRef.current?.value ?? '';
    const redirectUri = callbackUrlFor(service.external_service);

    try {
      if (!isConfigured) {
        const payload: CreateCredentialPayload = {
          external_service: service.external_service,
          client_id: clientIdVal,
          client_secret: secretVal,
          redirect_uri: redirectUri,
        };
        await createCredential(payload).unwrap();
      } else {
        const payload: UpdateCredentialPayload = {
          client_id: clientIdVal,
          redirect_uri: redirectUri,
        };
        if (secretTouched && secretVal.trim()) {
          payload.client_secret = secretVal.trim();
        }
        await updateCredential({
          service: service.external_service,
          data: payload,
        }).unwrap();
      }
      setSuccessMessage('Saved.');
      if (secretRef.current) secretRef.current.value = '';
      setSecretTouched(false);
    } catch (err: any) {
      const data = err?.data;
      if (err?.status === 409 && data?.error === 'already_configured') {
        setServerError('Another user configured this service first. Refreshing...');
        return;
      }
      if (err?.status === 422) {
        if (data?.error === 'unknown_service') {
          setServerError('Service is not registered on this node. Refresh the list.');
          return;
        }
        if (data?.error === 'validation_error' && data?.messages) {
          setFieldErrors(data.messages);
          return;
        }
        if (data?.errors) {
          setFieldErrors(data.errors);
          return;
        }
      }
      setServerError('Could not save. Try again.');
    }
  };

  const handleSecretChange = () => {
    setSecretTouched(true);
  };

  return (
    <div className="box">
      <CallbackAddress
        service={service.external_service}
        storedRedirectUri={isConfigured ? (service as ConfiguredServiceType).redirect_uri : null}
      />

      {serverError && (
        <div className="notification is-danger">
          {serverError}
        </div>
      )}

      {successMessage && (
        <div className="notification is-info">
          {successMessage}
        </div>
      )}

      {isConfigured && (
        <div className="content">
          <p>
            <strong>Status:</strong> Configured
          </p>
          <p>
            <strong>Secret:</strong>{' '}
            {(service as ConfiguredServiceType).has_secret
              ? 'A secret is stored'
              : 'No secret stored'}
          </p>
          <p>
            <strong>Secret last changed:</strong>{' '}
            {(service as ConfiguredServiceType).secret_updated_at
              ? new Date((service as ConfiguredServiceType).secret_updated_at!).toISOString().split('T')[0]
              : 'never'}
          </p>
          {(service as ConfiguredServiceType).last_verified_at && (
            <p>
              <strong>Last verified:</strong>{' '}
              {new Date((service as ConfiguredServiceType).last_verified_at!).toISOString().split('T')[0]} —{' '}
              {(service as ConfiguredServiceType).last_verification_outcome === 'passed'
                ? 'Passed'
                : (service as ConfiguredServiceType).last_verification_outcome === 'failed'
                ? 'Failed — check credentials'
                : 'Unknown'}
            </p>
          )}
        </div>
      )}

      {!isConfigured && (
        <div className="notification is-warning">
          <strong>Not yet configured.</strong> Enter the credentials below.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor={`client-id-${service.external_service}`}>
            Client ID
          </label>
          <div className="control">
            <input
              ref={clientIdRef}
              id={`client-id-${service.external_service}`}
              className={`input ${fieldErrors.client_id ? 'is-danger' : ''}`}
              type="text"
              defaultValue={isConfigured ? (service as ConfiguredServiceType).client_id : ''}
              placeholder="e.g., 1234.apps.googleusercontent.com"
              aria-label="Client ID"
            />
          </div>
          {fieldErrors.client_id && (
            <p className="help is-danger">{fieldErrors.client_id[0]}</p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor={`secret-${service.external_service}`}>
            {isConfigured ? 'New Secret (leave blank to keep current)' : 'Client Secret'}
          </label>
          <div className="control">
            <input
              ref={secretRef}
              id={`secret-${service.external_service}`}
              className={`input ${fieldErrors.client_secret ? 'is-danger' : ''}`}
              type="password"
              onChange={handleSecretChange}
              placeholder={isConfigured ? 'Enter new secret' : 'Client secret'}
              aria-label="Secret"
            />
          </div>
          {fieldErrors.client_secret && (
            <p className="help is-danger">{fieldErrors.client_secret[0]}</p>
          )}
        </div>

        <div className="field">
          <div className="control">
            <button
              className="button is-primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
