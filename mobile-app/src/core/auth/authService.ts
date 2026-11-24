import { apiClient } from '../api/apiClient';
import { ApiError } from '../api/apiErrors';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../../config/constants';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { queryClient } from '../../app/providers/queryClient';
import { PushNotificationService } from '../services/pushNotificationService';
import { BiometricService } from './biometricService';
import {
  LoginResult,
  LoginResponseSuccess,
  MfaChallenge,
  RefreshTokenResponse,
  User,
} from '../../types/auth.types';

export class AuthService {
  /**
   * Submits email and password to POST /api/v1/auth/login
   * Returns either full session or 2FA challenge.
   * Supports Cloudflare Turnstile bot verification token (via body and/or header).
   */
  public static async login(credentials: {
    email: string;
    password: string;
    workspaceSlug?: string;
    turnstileToken?: string;
  }): Promise<LoginResult> {
    try {
      const headers: Record<string, string> = {
        'x-client-platform': 'mobile',
        'x-mobile-app': 'true',
      };
      if (credentials.workspaceSlug) {
        headers['x-tenant-slug'] = credentials.workspaceSlug;
      }
      if (credentials.turnstileToken) {
        headers['x-turnstile-token'] = credentials.turnstileToken;
      }

      const body: Record<string, any> = {
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      };
      if (credentials.turnstileToken) {
        body.turnstileToken = credentials.turnstileToken;
      }

      const response = await apiClient.post<LoginResult>(
        '/api/v1/auth/login',
        body,
        {
          skipAuth: true,
          headers,
        } as any
      );

      const data = response.data;

      // Handle 2FA Challenge
      if ('requires2FA' in data && data.requires2FA) {
        useAuthStore.getState().setMfaPending(data as MfaChallenge);
        return data;
      }

      // Handle Direct Login (when 2FA is disabled)
      const successData = data as LoginResponseSuccess;

      // Strict enforcement: Super Administrator accounts are forbidden from mobile application access
      const userRoles = successData.roles || successData.user?.roles || [];
      const hasSuperAdmin = userRoles.some(
        (r: any) => String(r).toLowerCase() === 'super_admin' || String(r).toLowerCase() === 'superadmin'
      );
      if (hasSuperAdmin) {
        throw new Error(
          'Access denied. Super Administrator accounts cannot log in to the mobile application. This mobile app is exclusively for Employees, HR, and Tenant Administrators.'
        );
      }

      await useAuthStore.getState().setSession({
        token: successData.token,
        user: successData.user,
        roles: successData.roles,
        sessionId: successData.sessionId,
        refreshToken: successData.refreshToken,
      });

      // Persist encrypted credentials for Fingerprint / Face ID unlock across sign-outs
      await BiometricService.saveBiometricCredentials(
        credentials.email.trim().toLowerCase(),
        credentials.password
      );

      // Automatically hydrate tenant based on login details
      const tenantId = successData.user?.profile?.tenantId;
      const tenantSlug = successData.tenantSlug;
      if (tenantId) {
        await useTenantStore.getState().setTenant({
          resolved: true,
          id: tenantId,
          name: (tenantSlug || 'Workspace').toUpperCase(),
          slug: tenantSlug || 'default',
        });
      }

      void PushNotificationService.registerForPushNotifications();
      PushNotificationService.initListeners();

      return successData;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error && !('response' in error)) {
        throw new ApiError(400, error.message, 'CLIENT_VALIDATION_ERROR');
      }
      throw ApiError.fromAxiosError(error);
    }
  }

  /**
   * Completes 2FA login verification via POST /api/v1/auth/2fa/verify-login
   */
  public static async verify2Fa(mfaToken: string, code: string): Promise<LoginResponseSuccess> {
    try {
      const response = await apiClient.post<LoginResponseSuccess>(
        '/api/v1/auth/2fa/verify-login',
        {
          mfaToken,
          code: code.trim(),
        },
        { skipAuth: true } as any
      );

      const data = response.data;

      // Strict enforcement: Super Administrator accounts are forbidden from mobile application access
      const userRoles = data.roles || data.user?.roles || [];
      const hasSuperAdmin = userRoles.some(
        (r: any) => String(r).toLowerCase() === 'super_admin' || String(r).toLowerCase() === 'superadmin'
      );
      if (hasSuperAdmin) {
        throw new Error(
          'Access denied. Super Administrator accounts cannot log in to the mobile application. This mobile app is exclusively for Employees, HR, and Tenant Administrators.'
        );
      }

      await useAuthStore.getState().setSession({
        token: data.token,
        user: data.user,
        roles: data.roles,
        sessionId: data.sessionId,
        refreshToken: data.refreshToken,
      });

      // Automatically hydrate tenant based on 2FA login details
      const tenantId = data.user?.profile?.tenantId;
      const tenantSlug = data.tenantSlug;
      if (tenantId) {
        await useTenantStore.getState().setTenant({
          resolved: true,
          id: tenantId,
          name: (tenantSlug || 'Workspace').toUpperCase(),
          slug: tenantSlug || 'default',
        });
      }

      void PushNotificationService.registerForPushNotifications();
      PushNotificationService.initListeners();

      return data;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error && !('response' in error)) {
        throw new ApiError(400, error.message, 'CLIENT_VALIDATION_ERROR');
      }
      throw ApiError.fromAxiosError(error);
    }
  }

  /**
   * Resends fresh 6-digit OTP code via POST /api/v1/auth/2fa/resend
   * Server enforces 30-second cooldown (returns 429 if called prematurely).
   */
  public static async resend2Fa(mfaToken: string): Promise<{
    success: boolean;
    emailSent: boolean;
    message: string;
    cooldownSeconds: number;
  }> {
    try {
      const response = await apiClient.post(
        '/api/v1/auth/2fa/resend',
        { mfaToken },
        { skipAuth: true } as any
      );
      return response.data;
    } catch (error: any) {
      throw ApiError.fromAxiosError(error);
    }
  }

  /**
   * Atomic token refresh via POST /api/v1/auth/refresh
   * Rotates refresh token and returns new access token.
   */
  public static async refreshToken(
    refreshToken?: string,
    sessionId?: string
  ): Promise<RefreshTokenResponse> {
    try {
      const activeRefreshToken =
        refreshToken || (await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN));
      const activeSessionId =
        sessionId || (await secureStorage.getItem(STORAGE_KEYS.SESSION_ID));

      if (!activeRefreshToken || !activeSessionId) {
        throw new Error('No refresh token or session id found');
      }

      const response = await apiClient.post<RefreshTokenResponse>(
        '/api/v1/auth/refresh',
        { refreshToken: activeRefreshToken, sessionId: activeSessionId },
        { skipAuth: true } as any
      );

      const data = response.data;
      if (data.token) {
        useAuthStore.getState().setToken(data.token);
      }
      if (data.refreshToken) {
        await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      }

      return data;
    } catch (error: any) {
      throw ApiError.fromAxiosError(error);
    }
  }

  /**
   * Biometric session restoration via POST /api/v1/auth/refresh
   * Reads securely stored refresh token and sessionId from Keychain/Keystore,
   * performs token rotation, validates user roles (enforcing Super Admin exclusion),
   * restores full auth session and initiates push notification listeners.
   */
  public static async restoreBiometricSession(): Promise<{ success: boolean; user: User }> {
    try {
      const activeRefreshToken = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const activeSessionId = await secureStorage.getItem(STORAGE_KEYS.SESSION_ID);

      if (!activeRefreshToken || !activeSessionId) {
        // Fallback to SecureStore biometric-linked credentials if user previously signed out
        const savedCreds = await BiometricService.getSavedBiometricCredentials();
        if (savedCreds?.email && savedCreds?.password) {
          const loginRes = await this.login({
            email: savedCreds.email,
            password: savedCreds.password,
          });
          if ('user' in loginRes && loginRes.user) {
            return { success: true, user: loginRes.user };
          }
        }
        throw new Error('No saved biometric session found. Please sign in with your email and password first.');
      }

      const response = await apiClient.post<RefreshTokenResponse>(
        '/api/v1/auth/refresh',
        { refreshToken: activeRefreshToken, sessionId: activeSessionId },
        { skipAuth: true } as any
      );

      const data = response.data;
      if (!data?.token) {
        throw new Error('Failed to refresh authentication session.');
      }

      // Update in-memory token first so subsequent requests are authenticated
      useAuthStore.getState().setToken(data.token);

      // Rotate refresh token in secure storage if new one provided
      if (data.refreshToken) {
        await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      }
      if (data.sessionId) {
        await secureStorage.setItem(STORAGE_KEYS.SESSION_ID, data.sessionId);
      }

      // Fetch verified user profile & roles
      const userWithPerms = await this.getCurrentUser();

      // Enforce Super Admin mobile exclusion
      const userRoles = userWithPerms.roles || [];
      const hasSuperAdmin = userRoles.some(
        (r: any) => String(r).toLowerCase() === 'super_admin' || String(r).toLowerCase() === 'superadmin'
      );
      if (hasSuperAdmin) {
        await useAuthStore.getState().logout();
        throw new Error(
          'Access denied. Super Administrator accounts cannot log in to the mobile application. This mobile app is exclusively for Employees, HR, and Tenant Administrators.'
        );
      }

      // Restore session in authStore
      await useAuthStore.getState().setSession({
        token: data.token,
        user: userWithPerms,
        roles: userWithPerms.roles,
        sessionId: data.sessionId || activeSessionId,
        refreshToken: data.refreshToken || activeRefreshToken,
      });

      // Hydrate tenant
      const tenantId = userWithPerms.profile?.tenantId;
      if (tenantId) {
        await useTenantStore.getState().setTenant({
          resolved: true,
          id: tenantId,
          name: 'Workspace',
          slug: 'default',
        });
      }

      void PushNotificationService.registerForPushNotifications();
      PushNotificationService.initListeners();

      return { success: true, user: userWithPerms };
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error && !('response' in error)) {
        throw new ApiError(400, error.message, 'BIOMETRIC_AUTH_ERROR');
      }
      throw ApiError.fromAxiosError(error);
    }
  }

  /**
   * Hydrates current user, profile, roles, and permissions via GET /api/v1/auth/me
   */
  public static async getCurrentUser(): Promise<User & { permissions: string[]; workspaceRole: any }> {
    try {
      const response = await apiClient.get<any>('/api/v1/auth/me');
      const data = response.data;

      const user: User = {
        id: data.id,
        email: data.email,
        profile: data.profile,
        roles: data.roles || [],
        permissions: data.permissions || [],
        workspaceRole: data.workspaceRole,
        enabledModules: data.enabledModules || [],
        allowedDashboards: data.allowedDashboards || [],
        twoFactorEnabled: data.twoFactorEnabled,
      };

      useAuthStore.getState().setUser(user);

      // Ensure tenantStore is synchronized with user profile tenant
      if (data.profile?.tenantId && useTenantStore.getState().currentTenant?.id !== data.profile.tenantId) {
        await useTenantStore.getState().setTenant({
          resolved: true,
          id: data.profile.tenantId,
          name: 'Workspace',
          slug: 'default',
        });
      }

      return {
        ...user,
        permissions: data.permissions || [],
        workspaceRole: data.workspaceRole,
      };
    } catch (error: any) {
      throw ApiError.fromAxiosError(error);
    }
  }

  /**
   * Unlocks an inactive session via POST /api/v1/auth/unlock
   */
  public static async unlockSession(password: string, email?: string): Promise<{ token: string; user: User }> {
    try {
      const response = await apiClient.post<any>('/api/v1/auth/unlock', {
        email,
        password,
      });

      const data = response.data;
      if (data.token) {
        useAuthStore.getState().setToken(data.token);
      }
      if (data.user) {
        useAuthStore.getState().setUser(data.user);
      }

      return data;
    } catch (error: any) {
      throw ApiError.fromAxiosError(error);
    }
  }

  /**
   * Initiates forgot-password workflow via POST /api/v1/auth/forgot-password
   */
  public static async forgotPassword(email: string): Promise<{ success: boolean; message: string; maskedEmail?: string; previewCode?: string }> {
    try {
      const response = await apiClient.post(
        '/api/v1/auth/forgot-password',
        { email: email.trim().toLowerCase() },
        { skipAuth: true } as any
      );
      return response.data;
    } catch (error: any) {
      throw ApiError.fromAxiosError(error);
    }
  }

  /**
   * Verifies 6-digit password reset OTP via POST /api/v1/auth/verify-reset-otp
   */
  public static async verifyResetOtp(payload: {
    email: string;
    code: string;
  }): Promise<{ success: boolean; valid: boolean; resetToken: string; message: string }> {
    try {
      const response = await apiClient.post(
        '/api/v1/auth/verify-reset-otp',
        {
          email: payload.email.trim().toLowerCase(),
          code: payload.code.trim(),
        },
        { skipAuth: true } as any
      );
      return response.data;
    } catch (error: any) {
      throw ApiError.fromAxiosError(error);
    }
  }

  /**
   * Resets password via reset token (from email link) or 6-digit OTP code via POST /api/v1/auth/reset-password
   */
  public static async resetPassword(payload: {
    email: string;
    token?: string;
    code?: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const body: Record<string, string> = {
        email: payload.email.trim().toLowerCase(),
        newPassword: payload.newPassword,
      };

      if (payload.token && payload.token.trim().length > 0) {
        body.token = payload.token.trim();
      }
      if (payload.code && payload.code.trim().length > 0) {
        body.code = payload.code.trim();
      }

      const response = await apiClient.post(
        '/api/v1/auth/reset-password',
        body,
        { skipAuth: true } as any
      );
      return response.data;
    } catch (error: any) {
      throw ApiError.fromAxiosError(error);
    }
  }

  /**
   * Registers a new organization or user via POST /api/v1/auth/register
   */
  public static async register(payload: {
    email: string;
    password: string;
    fullName: string;
    companyName?: string;
    workspaceSlug?: string;
  }): Promise<any> {
    try {
      const response = await apiClient.post(
        '/api/v1/auth/register',
        payload,
        { skipAuth: true } as any
      );
      return response.data;
    } catch (error: any) {
      throw ApiError.fromAxiosError(error);
    }
  }

  /**
   * Revokes remote server session and cleans up local caches completely.
   */
  public static async logout(): Promise<void> {
    try {
      const sessionId = useAuthStore.getState().sessionId;
      await apiClient.post('/api/v1/auth/logout', { sessionId }).catch(() => { });
    } catch {
      // Non-fatal: local cleanup proceeds even if network fails
    } finally {
      // 1. Purge secure storage credentials
      await secureStorage.clear();

      // 2. Clear query cache
      queryClient.clear();

      // 3. Clear auth state store
      await useAuthStore.getState().logout();
    }
  }
}

