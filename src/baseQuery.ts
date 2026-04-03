import { BaseQueryFn, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { backend } from '.';

const rawBaseQuery = (baseUrl: string) => fetchBaseQuery({ 
    baseUrl: baseUrl,
    credentials: 'include',
    prepareHeaders: (headers) => {
        headers.set('Content-Type', 'application/json');
        return headers;
    }
  });
  
  export default function baseQuery(): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
      return async (args, api, extraOptions) => {
          let result = await rawBaseQuery((await backend).url + '/api/clarion-app/life-log')(args, api, extraOptions);
          return result;
      };
  }