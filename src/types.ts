import { LaravelModelType } from "@clarion-app/types";
import { ContactType } from "@clarion-app/contacts-frontend";

export interface EntryType extends LaravelModelType {
    user_id: string;
    title: string;
    content: string;
    entry_date: string;
    location_id?: string;
    contacts?: ContactType[];
}

export interface LocationType extends LaravelModelType {
    user_id: string;
    latitude: number;
    longitude: number;
    description?: string;
    visited_at?: string;
    contacts?: ContactType[];
}

export interface HealthMetricType extends LaravelModelType {
    user_id: string;
    type: string;
    value: number;
    recorded_at: string;
    source: string;
    unit?: string | null;
    external_service?: string | null;
}

// Service credential types — discriminated union on `configured`
// No client_secret, access_token, or refresh_token field (FR-045, SC-004)

export interface UnconfiguredServiceType {
  external_service: string;
  configured: false;
}

export interface ConfiguredServiceType {
  external_service: string;
  configured: true;
  client_id: string;
  redirect_uri: string;
  has_secret: boolean;
  secret_updated_at: string | null;
  last_verified_at: string | null;
  last_verification_outcome: string | null;
  version: number;
}

export type ServiceCredentialType = UnconfiguredServiceType | ConfiguredServiceType;

// Payload types for create and update operations

export interface CreateCredentialPayload {
  external_service: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

export interface UpdateCredentialPayload {
  client_id?: string;
  client_secret?: string;
  redirect_uri?: string;
}

// Connection type — one user's link to one service
// No access_token, refresh_token, or client_secret field (FR-045, SC-004)

export interface ConnectionType {
  id: string;
  external_service: string;
  status: 'healthy' | 'needs_attention';
  last_successful_sync_at: string | null;
  connected_at: string;
  needs_attention_reason: string | null;
  granted_scopes: string[];
  granted_types: string[];
  missing_types: string[];
}

// Transient client-owned sync request state

export type SyncRequestState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'queued'; at: number }
  | { kind: 'already_running'; at: number }
  | { kind: 'refused'; reason: string }
  | { kind: 'failed' };

// Source filter value for health metrics listing

export type SourceFilterValue = { kind: 'all' } | { kind: 'source'; source: string };

// Paginated measurement response

export interface MeasurementPageType {
  data: HealthMetricType[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    available_sources: string[];
  };
}