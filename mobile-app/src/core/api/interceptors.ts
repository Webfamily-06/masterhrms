import { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from './apiErrors';
import { CustomRequestConfig } from './types';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../../config/constants';
import { Config } from '../../config/environment';

// Forward reference store accessors to prevent circular imports
let getAccessToken: () => string | null = () => null;
let getTenantHeaders: () => { tenantId?: string; tenantSlug?: string } = () => ({});
let onSessionExpired: () => void = () => {};
let updateAccessToken: (token: string) => void = () => {};

export function configureInterceptorDependencies(deps: {
  getAccessToken: () => string | null;
  getTenantHeaders: () => { tenantId?: string; tenantSlug?: string };
  onSessionExpired: () => void;
  updateAccessToken: (token: string) => void;
}) {
  getAccessToken = deps.getAccessToken;
  getTenantHeaders = deps.getTenantHeaders;
  onSessionExpired = deps.onSessionExpired;
  updateAccessToken = deps.updateAccessToken;
}

// Concurrency-safe atomic refresh lock
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

function processQueue(error: any, token: string | null = null) {
  refreshQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  refreshQueue = [];
}

export function setupInterceptors(axiosInstance: AxiosInstance): void {
  // Request Interceptor: Attach Bearer JWT, Tenant Context, and Client Identification
  // Strictly respects the configured baseURL and never overwrites it.
  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const customConfig = config as CustomRequestConfig;

      // 1. Attach Bearer token unless skipAuth is specified
      if (!customConfig.skipAuth) {
        const token = getAccessToken();
        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      // 2. Attach Tenant scoping headers
      const { tenantId, tenantSlug } = getTenantHeaders();
      if (tenantId && !config.headers['x-tenant-id']) {
        config.headers['x-tenant-id'] = tenantId;
      }
      if (tenantSlug && !config.headers['x-tenant-slug']) {
        config.headers['x-tenant-slug'] = tenantSlug;
      }

      // 3. Attach standard client metadata (without fabricated proxy host headers)
      config.headers['x-client-platform'] = 'mobile';
      config.headers['x-mobile-app'] = 'true';
      config.headers['User-Agent'] = `${Config.APP_NAME}-Mobile/${Config.APP_VERSION}`;

      return config;
    },
    (error) => Promise.reject(ApiError.fromAxiosError(error))
  );

  // Response Interceptor: Normalized Errors & Atomic Token Refresh on 401
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as CustomRequestConfig;

      if (!originalRequest || !error.response) {
        return Promise.reject(ApiError.fromAxiosError(error));
      }

      const status = error.response.status;

      // Handle 401 Unauthorized with Token Refresh
      if (status === 401 && !originalRequest._retry && !originalRequest.skipAuth) {
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
          })
            .then((newToken) => {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return axiosInstance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
          const sessionId = await secureStorage.getItem(STORAGE_KEYS.SESSION_ID);

          if (!refreshToken || !sessionId) {
            throw new Error('No refresh token or session id found');
          }

          // Call backend atomic refresh endpoint
          const refreshResponse = await axiosInstance.post(
            '/api/v1/auth/refresh',
            { refreshToken, sessionId },
            { skipAuth: true } as CustomRequestConfig
          );

          const { token: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;

          if (!newAccessToken) {
            throw new Error('Failed to obtain new access token from refresh endpoint');
          }

          // Persist rotated credentials
          if (newRefreshToken) {
            await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
          }
          updateAccessToken(newAccessToken);

          processQueue(null, newAccessToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          return axiosInstance(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          onSessionExpired();
          return Promise.reject(ApiError.fromAxiosError(refreshErr));
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(ApiError.fromAxiosError(error));
    }
  );
}
