export type UserRole =
  | 'employee'
  | 'hr_admin'
  | 'admin'
  | 'tenant_admin'
  | 'workspace_admin'
  | 'manager'
  | 'super_admin'
  | string;

export interface UserProfile {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  gender?: string | null;
  tenantId?: string | null;
  designation?: string | null;
  position?: string | null;
  department?: string | null;
}

export interface User {
  id: string;
  email: string;
  profile?: UserProfile | null;
  roles: UserRole[];
  designation?: string | null;
  permissions?: string[];
  workspaceRole?: {
    id: string;
    name: string;
    description?: string;
    isActive?: boolean;
    isSystem?: boolean;
  };
  enabledModules?: string[];
  allowedDashboards?: string[];
  twoFactorEnabled?: boolean;
}

export interface AuthSession {
  token: string;
  refreshToken?: string;
  sessionId: string;
  user: User;
  roles: UserRole[];
  tenantSlug?: string;
  workspaceUrl?: string;
}

export interface MfaChallenge {
  requires2FA: true;
  isSetup: boolean;
  mfaToken: string;
  email: string;
  maskedEmail: string;
  twoFactorMethod: 'EMAIL_OTP' | 'TOTP';
  emailSent?: boolean;
  emailError?: string;
  message?: string;
}

export interface LoginResponseSuccess {
  token: string;
  refreshToken?: string;
  sessionId: string;
  user: User;
  roles: UserRole[];
  tenantSlug?: string;
  workspaceUrl?: string;
  message?: string;
}

export type LoginResult = LoginResponseSuccess | MfaChallenge;

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  sessionId: string;
}
