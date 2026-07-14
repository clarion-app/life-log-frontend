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
}