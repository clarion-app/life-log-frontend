import { BackendType } from "@clarion-app/types";

export const backend: BackendType = { url: "http://localhost:8000", token: "" };

export const initializeFrontend = (setBackendUrl: string) => {
    backend.url = setBackendUrl;
};

export const setFrontendToken = (token: string) => {
    backend.token = token;
};