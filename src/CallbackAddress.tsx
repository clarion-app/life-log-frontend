import React, { useState } from 'react';
import { callbackUrlFor } from './callbackUrl';

interface CallbackAddressProps {
  service: string;
  storedRedirectUri: string | null;
}

export const CallbackAddress: React.FC<CallbackAddressProps> = ({ service, storedRedirectUri }) => {
  const [copied, setCopied] = useState(false);
  const address = callbackUrlFor(service);
  const hasMismatch = storedRedirectUri !== null && storedRedirectUri !== address;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  };

  return (
    <div className="box">
      <h3 className="title is-5">Registration Address</h3>
      <p className="subtitle is-6">
        Register this address with the OAuth provider. Copy it and paste it into the
        provider&apos;s console.
      </p>

      {hasMismatch && (
        <div className="notification is-warning">
          <strong>Address mismatch.</strong> The stored redirect URI differs from the address
          shown here. Re-save the credentials below to fix this.
        </div>
      )}

      <p className="has-text-grey is-size-7" style={{ wordBreak: 'break-all' }}>
        {address}
      </p>

      <div className="field">
        <div className="control">
          <button
            className="button is-link is-small"
            onClick={handleCopy}
            disabled={copied}
            aria-label="Copy address"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
};
