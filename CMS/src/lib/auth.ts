/**
 * Auth Session, Active Portal, and Multi-Portal State Manager
 */

export type PortalType = "tenant" | "hr" | "me" | "super";

export interface SessionInfo {
  userId: string;
  email: string;
  fullName?: string;
  tenantId?: string | null;
  roles: string[];
  permissions: string[];
  portals: PortalType[];
  landingPortal: PortalType;
  employeeId?: string | null;
}

export interface ImpersonationState {
  isImpersonating: boolean;
  actorId?: string;
  targetId?: string;
  targetName?: string;
}

const ACTIVE_PORTAL_KEY = "master_hrms_active_portal";
const IMPERSONATION_KEY = "master_hrms_view_as_state";

/**
 * Calculates accessible portals from given roles
 */
export function calculatePortalsFromRoles(roles: string[] = []): {
  portals: PortalType[];
  landingPortal: PortalType;
} {
  const isSuper = roles.includes("super_admin");
  const isTenantAdmin =
    isSuper ||
    roles.includes("admin") ||
    roles.includes("workspace_admin") ||
    roles.includes("tenant_admin") ||
    roles.includes("Workspace Admin");

  const isHrAdmin = roles.includes("hr_admin") || roles.includes("hr_manager");
  const isEmployee = roles.includes("employee") || roles.includes("staff");

  if (isSuper && !isTenantAdmin) {
    return {
      portals: ["super"],
      landingPortal: "super",
    };
  }

  if (isTenantAdmin) {
    return {
      portals: ["tenant", "hr", "me"],
      landingPortal: "tenant",
    };
  }

  if (isHrAdmin) {
    return {
      portals: ["hr", "me"],
      landingPortal: "hr",
    };
  }

  if (isEmployee) {
    return {
      portals: ["me"],
      landingPortal: "me",
    };
  }

  // Fallback
  return {
    portals: ["me"],
    landingPortal: "me",
  };
}

/**
 * Get active portal from localStorage or default to landingPortal
 */
export function getActivePortal(defaultPortal: PortalType = "me"): PortalType {
  if (typeof window === "undefined") return defaultPortal;
  const stored = localStorage.getItem(ACTIVE_PORTAL_KEY) as PortalType | null;
  if (stored && ["tenant", "hr", "me", "super"].includes(stored)) {
    return stored;
  }
  return defaultPortal;
}

/**
 * Set active portal in localStorage
 */
export function setActivePortal(portal: PortalType): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_PORTAL_KEY, portal);
  window.dispatchEvent(new Event("active-portal-changed"));
}

/**
 * Impersonation / View-as Helper
 */
export function getImpersonationState(): ImpersonationState {
  if (typeof window === "undefined") return { isImpersonating: false };
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    if (!raw) return { isImpersonating: false };
    return JSON.parse(raw);
  } catch {
    return { isImpersonating: false };
  }
}

export function startViewAs(targetId: string, targetName: string, actorId: string): void {
  if (typeof window === "undefined") return;
  const state: ImpersonationState = {
    isImpersonating: true,
    actorId,
    targetId,
    targetName,
  };
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("impersonation-changed"));
}

export function stopViewAs(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(IMPERSONATION_KEY);
  window.dispatchEvent(new Event("impersonation-changed"));
}
