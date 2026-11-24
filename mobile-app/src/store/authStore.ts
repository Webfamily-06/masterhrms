import { create } from 'zustand';
import { User, UserRole, MfaChallenge } from '../types/auth.types';
import {
  CanonicalRole,
  normalizeToCanonicalRoles,
  resolvePrimaryRole,
} from '../types/roles.types';
import { secureStorage } from '../core/storage/secureStorage';
import { STORAGE_KEYS } from '../config/constants';
import { configureInterceptorDependencies } from '../core/api/interceptors';
import { purgeQueryCache } from '../core/query/queryClient';
import { realtimeManager } from '../core/realtime/realtimeManager';
import { PushNotificationService } from '../core/services/pushNotificationService';

interface AuthState {
  token: string | null;
  user: User | null;
  rawRoles: UserRole[];
  canonicalRoles: CanonicalRole[];
  roles: UserRole[];
  activeRole: CanonicalRole | null;
  permissions: string[];
  enabledModules: string[];
  allowedDashboards: string[];
  sessionId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMfaPending: boolean;
  mfaChallenge: MfaChallenge | null;
  isSuperAdmin: boolean;
  isAppLocked: boolean;

  // Actions
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  updateUserAvatar: (avatarUrl: string) => void;
  setActiveRole: (role: CanonicalRole) => void;
  setSession: (session: {
    token: string;
    user: User;
    roles: UserRole[];
    sessionId: string;
    refreshToken?: string;
  }) => Promise<void>;
  setMfaPending: (challenge: MfaChallenge) => void;
  clearMfaPending: () => void;
  lockApp: () => void;
  unlockApp: () => void;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  rawRoles: [],
  canonicalRoles: [],
  roles: [],
  activeRole: null,
  permissions: [],
  enabledModules: [],
  allowedDashboards: [],
  sessionId: null,
  isAuthenticated: false,
  isLoading: true,
  isMfaPending: false,
  mfaChallenge: null,
  isSuperAdmin: false,
  isAppLocked: false,

  setToken: (token: string) => set({ token, isAuthenticated: Boolean(token) }),

  setUser: (user: User) => {
    const rawRoles = user.roles || [];
    const canonicalRoles = normalizeToCanonicalRoles(rawRoles);
    const currentActive = get().activeRole;
    // Maintain current active role if still valid, otherwise resolve primary
    const activeRole =
      currentActive && canonicalRoles.includes(currentActive)
        ? currentActive
        : resolvePrimaryRole(canonicalRoles);

    const isSuperAdmin = rawRoles.some(
      (r) => String(r).toLowerCase() === 'super_admin'
    );

    set({
      user,
      rawRoles,
      canonicalRoles,
      roles: rawRoles,
      activeRole,
      permissions: user.permissions || [],
      enabledModules: user.enabledModules || [],
      allowedDashboards: user.allowedDashboards || [],
      isSuperAdmin,
    });
  },

  updateUserAvatar: (avatarUrl: string) => {
    const current = get().user;
    if (!current) return;
    set({
      user: {
        ...current,
        profile: {
          ...(current.profile || { email: current.email }),
          avatarUrl,
        },
      },
    });
  },

  setActiveRole: (role: CanonicalRole) => {
    const { canonicalRoles } = get();
    if (canonicalRoles.includes(role)) {
      set({ activeRole: role });
    }
  },

  setSession: async ({ token, user, roles, sessionId, refreshToken }) => {
    if (refreshToken) {
      await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    await secureStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);

    const sessionRawRoles = roles || user.roles || [];
    const canonicalRoles = normalizeToCanonicalRoles(sessionRawRoles);
    const activeRole = resolvePrimaryRole(canonicalRoles);
    const isSuperAdmin = sessionRawRoles.some(
      (r) => String(r).toLowerCase() === 'super_admin'
    );

    set({
      token,
      user,
      rawRoles: roles || user.roles || [],
      canonicalRoles,
      roles: roles || user.roles || [],
      activeRole,
      permissions: user.permissions || [],
      enabledModules: user.enabledModules || [],
      allowedDashboards: user.allowedDashboards || [],
      sessionId,
      isAuthenticated: true,
      isMfaPending: false,
      mfaChallenge: null,
      isLoading: false,
      isSuperAdmin,
    });
  },

  setMfaPending: (challenge: MfaChallenge) =>
    set({
      isMfaPending: true,
      mfaChallenge: challenge,
      isLoading: false,
    }),

  clearMfaPending: () =>
    set({
      isMfaPending: false,
      mfaChallenge: null,
    }),

  lockApp: () => set({ isAppLocked: true }),

  unlockApp: () => set({ isAppLocked: false }),

  logout: async () => {
    try {
      await PushNotificationService.unregisterDeviceToken();
    } catch {
      // Ignore in offline/test environments
    }

    realtimeManager.disconnectAll();
    // Purge query cache to completely isolate former tenant session
    try {
      await purgeQueryCache();
    } catch {
      // Ignore in mock/unit test environments
    }

    await secureStorage.clear();

    set({
      token: null,
      user: null,
      rawRoles: [],
      canonicalRoles: [],
      roles: [],
      activeRole: null,
      permissions: [],
      enabledModules: [],
      allowedDashboards: [],
      sessionId: null,
      isAuthenticated: false,
      isMfaPending: false,
      mfaChallenge: null,
      isLoading: false,
      isSuperAdmin: false,
      isAppLocked: false,
    });
  },

  setLoading: (isLoading: boolean) => set({ isLoading }),
}));

// Wire up interceptor accessors
configureInterceptorDependencies({
  getAccessToken: () => useAuthStore.getState().token,
  getTenantHeaders: () => {
    return {};
  },
  onSessionExpired: () => {
    useAuthStore.getState().logout();
  },
  updateAccessToken: (newToken: string) => {
    useAuthStore.getState().setToken(newToken);
  },
});
