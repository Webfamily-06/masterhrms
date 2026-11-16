import { useAuthStore } from '../src/store/authStore';
import { useTenantStore } from '../src/store/tenantStore';
import { ApiError } from '../src/core/api/apiErrors';
import { createTenantQueryKey } from '../src/app/providers/QueryProvider';
import { createTenantTheme, lightTheme } from '../src/theme/theme';

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn().mockResolvedValue(null),
  setGenericPassword: jest.fn().mockResolvedValue(true),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  ACCESSIBLE: {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AccessibleAfterFirstUnlockThisDeviceOnly',
  },
}));

describe('Phase 1: Foundation Unit Tests', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      roles: [],
      permissions: [],
      sessionId: null,
      isAuthenticated: false,
      isLoading: false,
    });
    useTenantStore.setState({
      currentTenant: null,
      isResolved: false,
      isLoading: false,
      error: null,
    });
  });

  describe('Auth Store', () => {
    it('initializes with unauthenticated state', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
    });

    it('sets token and marks isAuthenticated as true', () => {
      useAuthStore.getState().setToken('test_jwt_token_123');
      const state = useAuthStore.getState();
      expect(state.token).toBe('test_jwt_token_123');
      expect(state.isAuthenticated).toBe(true);
    });

    it('clears state on logout', async () => {
      useAuthStore.getState().setToken('test_jwt_token_123');
      await useAuthStore.getState().logout();
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
    });
  });

  describe('Tenant Store', () => {
    it('sets resolved tenant branding', async () => {
      await useTenantStore.getState().setTenant({
        resolved: true,
        id: 'tenant-test-uuid',
        name: 'Acme Test Corp',
        slug: 'acme-test',
        primaryColor: '#0055FF',
      });

      const state = useTenantStore.getState();
      expect(state.isResolved).toBe(true);
      expect(state.currentTenant?.name).toBe('Acme Test Corp');
      expect(state.currentTenant?.slug).toBe('acme-test');
    });

    it('clears tenant on request', async () => {
      await useTenantStore.getState().setTenant({
        resolved: true,
        id: 'tenant-test-uuid',
        name: 'Acme Test Corp',
        slug: 'acme-test',
      });
      await useTenantStore.getState().clearTenant();
      const state = useTenantStore.getState();
      expect(state.isResolved).toBe(false);
      expect(state.currentTenant).toBeNull();
    });
  });

  describe('Tenant-Aware Query Key Helper', () => {
    it('prefixes query keys with active tenant ID', async () => {
      await useTenantStore.getState().setTenant({
        resolved: true,
        id: 'tenant-abc-123',
        name: 'ABC Corp',
        slug: 'abc',
      });

      const key = createTenantQueryKey(['attendance', 'history', { month: '2026-11' }]);
      expect(key[0]).toBe('tenant-abc-123');
      expect(key[1]).toBe('attendance');
    });
  });

  describe('Dynamic Tenant Theming', () => {
    it('overlays tenant primary brand color without mutating defaults', () => {
      const customTheme = createTenantTheme(lightTheme, '#123456');
      expect(customTheme.colors.primary).toBe('#123456');
      expect(lightTheme.colors.primary).toBe('#FF6B00'); // Unchanged default
    });
  });

  describe('ApiError Normalization', () => {
    it('correctly maps HTTP error status, message, and error codes', () => {
      const error = new ApiError(403, 'Cross-workspace access denied.', 'HOST_TENANT_MISMATCH');
      expect(error.status).toBe(403);
      expect(error.isForbidden).toBe(true);
      expect(error.isTenantMismatch).toBe(true);
    });

    it('identifies session expired codes', () => {
      const error = new ApiError(401, 'Session revoked.', 'SESSION_REVOKED');
      expect(error.isUnauthorized).toBe(true);
      expect(error.isSessionExpired).toBe(true);
    });
  });
});
