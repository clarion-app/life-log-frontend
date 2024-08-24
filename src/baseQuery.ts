import { BaseQueryFn, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { backend } from '.';

const rawBaseQuery = (baseUrl: string) => fetchBaseQuery({ 
    baseUrl: baseUrl,
    prepareHeaders: (headers) => {
        headers.set('Content-Type', 'application/json');
        headers.set('Authorization', 'Bearer ' + backend.token);
        return headers;
    }
  });
  
  export default function baseQuery(): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
      return async (args, api, extraOptions) => {
          let result = await rawBaseQuery((await backend).url + '/api/clarion-app/life-log')(args, api, extraOptions);
          return result;
      };
  }