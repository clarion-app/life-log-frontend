import { BackendType } from "@clarion-app/types";

export const backend: BackendType = { url: "http://localhost:8000", token: "", user: { id: "", name: "", email: ""} };

export const updateFrontend = (config: BackendType) => {
    backend.url = config.url;
    backend.token = config.token;
    backend.user = config.user;
};

export { entryApi } from './entryApi';
export { locationApi } from './locationApi';
export { healthMetricApi } from './healthMetricApi';
export { Entries } from './Entries';