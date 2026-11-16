export interface TenantBranding {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  logoDark?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  timezone?: string;
  isWhiteLabeled?: boolean;
}

export interface TenantSubscriptionInfo {
  planName?: string;
  status?: string;
}

export interface TenantResolveResponse {
  resolved: boolean;
  id?: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  logoDark?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  timezone?: string;
  isWhiteLabeled?: boolean;
  subscription?: TenantSubscriptionInfo;
}

export interface TenantContextState {
  currentTenant: TenantResolveResponse | null;
  isResolved: boolean;
  isLoading: boolean;
  error: string | null;
}
