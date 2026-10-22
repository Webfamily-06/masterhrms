/**
 * Centralized Authenticated API Client for MASTERHRMS Classic Workspace
 * Automatically injects authorization token, tenant context, and standard headers.
 */

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("hrms_auth_token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    null
  );
}

export function getAuthUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("hrms_user") || localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If body is not FormData, ensure Content-Type is application/json
  if (options.body && !(options.body instanceof FormData)) {
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (typeof options.body !== "string") {
      options.body = JSON.stringify(options.body);
    }
  }

  const url = endpoint.startsWith("http") ? endpoint : endpoint;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: "POST", body }),
  put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: "PUT", body }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: "DELETE" }),
};

export default api;
