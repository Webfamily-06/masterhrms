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