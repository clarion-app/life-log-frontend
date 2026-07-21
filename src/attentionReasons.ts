/**
 * Closed reason set for needs-attention connections.
 * Maps each wire value to distinct, non-generic copy and a remedy classification.
 *
 * FR-025: Each reason has distinct copy.
 * FR-029: Configuration-side reasons don't blame the user's account.
 * SC-003: No role wording (admin, owner, etc.).
 * SC-004: No secrets in copy or types.
 */

export const ATTENTION_REASONS = [
    'credential_rotated',
    'credential_removed',
    'authorization_unrenewable',
    'sync_failures',
    'access_revoked',
    'access_expired',
    'credentials_rejected',
    'rate_limited',
    'service_unavailable',
    'invalid_request',
    'unknown',
] as const;

export type AttentionReason = (typeof ATTENTION_REASONS)[number];

/** Remedy classification for a reason. */
export type RemedyKind =
    | 'reconnect'                        // Reconnect is the primary action.
    | 'wearable_services'                // Wearable Services link is primary; reconnect secondary.
    | 'wearable_services_disabled_reconnect' // Wearable Services link primary; reconnect disabled.
    | 'transient';                       // Usually clears on its own; reconnect secondary.

interface ReasonEntry {
    copy: (service: string) => string;
    remedy: RemedyKind;
}

const REASON_MAP: Record<string, ReasonEntry> = {
    credential_rotated: {
        copy: (service: string) =>
            `The credentials for ${service} were changed on this node. Check the service configuration; you may then need to reconnect.`,
        remedy: 'wearable_services',
    },
    credential_removed: {
        copy: () =>
            `This service is no longer configured on this node. It has to be configured again before this connection can work.`,
        remedy: 'wearable_services_disabled_reconnect',
    },
    authorization_unrenewable: {
        copy: (service: string) =>
            `Your authorization for ${service} can't be renewed automatically. Reconnect to restore it.`,
        remedy: 'reconnect',
    },
    sync_failures: {
        copy: (service: string) =>
            `Updates from ${service} have failed repeatedly. Reconnect to restore the connection.`,
        remedy: 'reconnect',
    },
    access_revoked: {
        copy: (service: string) =>
            `Access to ${service} was withdrawn. Reconnect to grant it again.`,
        remedy: 'reconnect',
    },
    access_expired: {
        copy: (service: string) =>
            `Access to ${service} expired and couldn't be renewed. Reconnect to restore it.`,
        remedy: 'reconnect',
    },
    credentials_rejected: {
        copy: (service: string) =>
            `${service} rejected the credentials from this node. Check the service configuration.`,
        remedy: 'wearable_services',
    },
    rate_limited: {
        copy: (service: string) =>
            `${service} is limiting how often this node can ask for data. This usually clears on its own.`,
        remedy: 'transient',
    },
    service_unavailable: {
        copy: (service: string) =>
            `${service} couldn't be reached. This usually clears on its own.`,
        remedy: 'transient',
    },
    invalid_request: {
        copy: (service: string) =>
            `${service} rejected the last request. Reconnecting often clears this.`,
        remedy: 'reconnect',
    },
    unknown: {
        copy: () =>
            `This connection stopped working, but the reason wasn't recorded. Reconnecting usually restores it.`,
        remedy: 'reconnect',
    },
};

const UNKNOWN_ENTRY: ReasonEntry = REASON_MAP.unknown;

/**
 * Humanise an external service slug for display in reason copy.
 */
function humanizeService(slug: string): string {
    return slug
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get the display copy for a needs-attention reason.
 * Unrecognised values fall back to the "unknown" copy and never echo the raw value.
 */
export function attentionReasonCopy(reason: string, serviceSlug: string = 'this service'): string {
    const entry = REASON_MAP[reason];
    const service = humanizeService(serviceSlug);
    return entry ? entry.copy(service) : UNKNOWN_ENTRY.copy(service);
}

/**
 * Get the remedy classification for a reason.
 * Unrecognised values fall back to 'reconnect'.
 */
export function attentionReasonRemedy(reason: string): RemedyKind {
    const entry = REASON_MAP[reason];
    return entry ? entry.remedy : UNKNOWN_ENTRY.remedy;
}

/**
 * Whether the primary remedy for a reason routes to the Wearable Services page.
 */
export function reasonRoutesToWearableServices(reason: string): boolean {
    const remedy = attentionReasonRemedy(reason);
    return remedy === 'wearable_services' || remedy === 'wearable_services_disabled_reconnect';
}
