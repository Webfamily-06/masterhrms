import { ApiErrorResponse } from './types';

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public requestId?: string;
  public details?: Record<string, any>;

  constructor(status: number, message: string, code?: string, requestId?: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }

  static fromAxiosError(error: any): ApiError {
    const status = error.response?.status || 500;
    const data = error.response?.data as ApiErrorResponse | undefined;

    const message =
      typeof data === 'object' && data?.error
        ? data.error
        : error.message || 'An unexpected network error occurred.';

    const code = data?.code || (error.code ? String(error.code) : undefined);
    const requestId = data?.requestId;
    const details = data?.details;

    return new ApiError(status, message, code, requestId, details);
  }

  get isTenantMismatch(): boolean {
    return this.code === 'HOST_TENANT_MISMATCH' || this.code === 'TENANT_MISMATCH';
  }

  get isSessionExpired(): boolean {
    return this.code === 'SESSION_EXPIRED' || this.code === 'SESSION_REVOKED';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNetworkError(): boolean {
    return !this.status || this.status === 0 || this.status >= 500 || this.message.toLowerCase().includes('network');
  }
}
