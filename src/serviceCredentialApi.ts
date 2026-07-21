import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '@clarion-app/frontend-base';
import { backend } from './config';
import type {
  ServiceCredentialType,
  CreateCredentialPayload,
  UpdateCredentialPayload,
} from './types';

const baseQuery = createBaseQuery({
  routePrefix: '/api/clarion-app/life-log',
  backendConfig: backend,
});

export const serviceCredentialApi = createApi({
  reducerPath: 'clarion-app-life-log-serviceCredentialApi',
  baseQuery,
  tagTypes: ['ServiceCredential'],
  endpoints: (build) => ({
    getServiceCredentials: build.query<
      { services: ServiceCredentialType[] },
      void
    >({
      query: () => '/service-credentials',
      providesTags: ['ServiceCredential'],
    }),

    createServiceCredential: build.mutation<
      ServiceCredentialType,
      CreateCredentialPayload
    >({
      query: (payload) => ({
        url: '/service-credentials',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['ServiceCredential'],
    }),

    updateServiceCredential: build.mutation<
      ServiceCredentialType,
      { service: string; data: UpdateCredentialPayload }
    >({
      query: ({ service, data }) => ({
        url: `/service-credentials/${service}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['ServiceCredential'],
    }),

    verifyServiceCredential: build.mutation<
      { outcome: string },
      { service: string }
    >({
      query: ({ service }) => ({
        url: `/service-credentials/${service}/verify`,
        method: 'POST',
      }),
      invalidatesTags: ['ServiceCredential'],
    }),

    deleteServiceCredential: build.mutation<
      { deleted: boolean },
      { service: string }
    >({
      query: ({ service }) => ({
        url: `/service-credentials/${service}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ServiceCredential'],
    }),
  }),
});

export const {
  useGetServiceCredentialsQuery,
  useCreateServiceCredentialMutation,
  useUpdateServiceCredentialMutation,
  useVerifyServiceCredentialMutation,
  useDeleteServiceCredentialMutation,
} = serviceCredentialApi;
