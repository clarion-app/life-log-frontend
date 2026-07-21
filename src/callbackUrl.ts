export const CONNECTION_CALLBACK_PATH = '/clarion-app/life-log/connected-services/callback';

export const callbackUrlFor = (service: string): string =>
  `${window.location.origin}${CONNECTION_CALLBACK_PATH}/${service}`;
