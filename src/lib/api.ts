/**
 * Backend API Client for Master HRMS (Node.js + Express + MySQL)
 */

export const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:4000/api";

function getToken(): string | null {
  return localStorage.getItem("hrms_auth_token");
}

export function setToken(token: string) {
  localStorage.setItem("hrms_auth_token", token);
  window.dispatchEvent(new Event("auth-token-changed"));
}

export function clearToken() {
  localStorage.removeItem("hrms_auth_token");
  window.dispatchEvent(new Event("auth-token-changed"));
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function formatInventoryError(err: unknown, defaultMessage = "Inventory operation failed"): string {
  if (err instanceof ApiError) {
    if (err.status === 409 || err.code === "INSUFFICIENT_STOCK") {
      const details = err.details;
      if (details?.requested !== undefined && details?.available !== undefined) {
        return `Insufficient stock! Requested: ${details.requested}, Available: ${details.available}`;
      }
      return err.message || "Insufficient stock for this operation.";
    }
    return err.message;
  }

  if (err && typeof err === "object") {
    const anyErr = err as any;
    const data = anyErr.response?.data || anyErr.data || anyErr;
    if (data.status === 409 || data.code === "INSUFFICIENT_STOCK" || anyErr.status === 409) {
      const details = data.details || anyErr.details;
      if (details?.requested !== undefined && details?.available !== undefined) {
        return `Insufficient stock! Requested: ${details.requested}, Available: ${details.available}`;
      }
      if (data.error) return data.error;
    }
    if (anyErr.message) return anyErr.message;
    if (data.error) return data.error;
  }

  if (err instanceof Error) {
    return err.message;
  }
  return defaultMessage;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (API_BASE.endsWith("/api") && cleanEndpoint.startsWith("/api/")) {
    cleanEndpoint = cleanEndpoint.substring(4);
  }
  const url = `${API_BASE}${cleanEndpoint}`;
  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      window.dispatchEvent(new CustomEvent("network:offline"));
    }
    throw new ApiError(err?.message || "Network request failed. You may be offline.", 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // 401 Unauthorized: Session Token Expired
    if (response.status === 401 && !cleanEndpoint.startsWith("/auth/login") && !cleanEndpoint.startsWith("/auth/register")) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:session-expired", {
          detail: { path: window.location.pathname, message: data.error }
        }));
      }
    }

    // 403 Forbidden: Insufficient Permissions / License Lock
    if (response.status === 403) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:forbidden", {
          detail: { endpoint: cleanEndpoint, message: data.error }
        }));
      }
    }

    // 503 Service Unavailable: Maintenance Mode
    if (response.status === 503) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/maintenance")) {
        window.location.href = "/maintenance";
      }
    }

    throw new ApiError(
      data.error || `Request failed with status ${response.status}`,
      response.status,
      data.code,
      data.details
    );
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }),
  post: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: "DELETE" }),
  upload: <T = any>(endpoint: string, formData: FormData) =>
    apiRequest<T>(endpoint, { method: "POST", body: formData }),
};
