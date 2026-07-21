import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  useCompleteConnectionMutation,
  useBeginConnectionMutation,
} from './connectedAccountApi';

type OutcomeState =
  | { kind: 'processing' }
  | { kind: 'success' }
  | { kind: 'not_completed'; retryable: boolean };

export const ConnectionCallback: React.FC = () => {
  const { service } = useParams<{ service: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [completeConnection] = useCompleteConnectionMutation();
  const [beginConnection] = useBeginConnectionMutation();
  const [outcome, setOutcome] = useState<OutcomeState>({ kind: 'processing' });

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  useEffect(() => {
    if (!service) return;

    // Provider decline: no code present, do NOT call the endpoint
    if (error === 'access_denied' && !code) {
      setOutcome({ kind: 'not_completed', retryable: false });
      return;
    }

    // No code and no error — something went wrong on the provider side
    if (!code) {
      setOutcome({ kind: 'not_completed', retryable: true });
      return;
    }

    // Code and state present — complete the connection
    completeConnection({
      external_service: service,
      state: state ?? '',
      code,
    })
      .unwrap()
      .then(() => {
        setOutcome({ kind: 'success' });
        setTimeout(() => {
          navigate('/clarion-app/life-log/connected-services');
        }, 1500);
      })
      .catch((err) => {
        if (err?.status === 422 && err?.data?.error === 'connection_not_completed') {
          setOutcome({ kind: 'not_completed', retryable: true });
        } else {
          setOutcome({ kind: 'not_completed', retryable: true });
        }
      });
  }, [service, code, state, error, completeConnection, navigate]);

  const handleTryAgain = async () => {
    if (!service) return;
    try {
      const result = await beginConnection({ external_service: service }).unwrap();
      window.open(result.authorization_url, '_self');
    } catch {
      // If beginConnection fails, the user will see the error on the connected services page
    }
  };

  const renderProcessing = () => (
    <div className="container">
      <h1 className="title">Connecting</h1>
      <div className="notification is-info">
        <p>Processing your connection… please wait.</p>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="container">
      <h1 className="title">Connected</h1>
      <div className="notification is-success">
        <p>Your wearable account is now connected.</p>
        <p>Redirecting to your connections…</p>
      </div>
    </div>
  );

  const renderNotCompleted = (retryable: boolean) => (
    <div className="container">
      <h1 className="title">Connection Not Completed</h1>
      <div className="notification is-warning">
        <p>The connection was not completed.</p>
        {retryable && (
          <div className="mt-3">
            <button className="button is-link" onClick={handleTryAgain}>
              Try again
            </button>
          </div>
        )}
        <div className="mt-3">
          <button
            className="button is-text"
            onClick={() => navigate('/clarion-app/life-log/connected-services')}
          >
            Go to Connected Services
          </button>
        </div>
      </div>
    </div>
  );

  if (outcome.kind === 'processing') return renderProcessing();
  if (outcome.kind === 'success') return renderSuccess();
  return renderNotCompleted(outcome.retryable);
};
