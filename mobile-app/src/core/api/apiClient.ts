import axios, { AxiosInstance } from 'axios';
import { Config, normalizeApiOrigin, setRuntimeApiBaseUrl } from '../../config/environment';
import { setupInterceptors } from './interceptors';

export const apiClient: AxiosInstance = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: Config.API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Updates the active API client baseURL at runtime (useful for developer diagnostics or dynamic LAN switches).
 */
export function updateApiClientBaseUrl(url: string): void {
  const normalized = normalizeApiOrigin(url);
  setRuntimeApiBaseUrl(normalized);
  apiClient.defaults.baseURL = normalized;
}

setupInterceptors(apiClient);
