import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const apiErr = err?.response?.data?.error;
    const fieldErrors = apiErr?.details?.fieldErrors as Record<string, string[]> | undefined;
    const formErrors = apiErr?.details?.formErrors as string[] | undefined;

    const firstFieldMsg = fieldErrors
      ? Object.entries(fieldErrors)
          .flatMap(([field, msgs]) => (Array.isArray(msgs) && msgs.length ? [`${field}: ${msgs[0]}`] : []))
          [0]
      : undefined;

    const detailedMsg = firstFieldMsg || formErrors?.[0];
    const baseMsg = apiErr?.message || err?.message || 'An unexpected error occurred';
    const message =
      detailedMsg && baseMsg === 'Invalid request payload' ? detailedMsg : baseMsg;

    const wrapped = new Error(message) as Error & { status?: number; code?: string };
    wrapped.status = err?.response?.status;
    wrapped.code = apiErr?.code;
    return Promise.reject(wrapped);
  },
);
