import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ApiResponse<T = any> {
  success?: boolean;
  data: T;
  message?: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  meta: PaginatedMeta;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  requestId?: string;
  details?: Record<string, any>;
}

export interface CustomRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  skipAuth?: boolean;
}

export type CustomResponse<T = any> = AxiosResponse<T>;
