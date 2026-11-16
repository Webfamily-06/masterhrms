import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Text } from '../../../components/common/Text';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { useAuthStore } from '../../../store/authStore';
import { useTenantStore } from '../../../store/tenantStore';
import { AuthService } from '../../../core/auth/authService';

export const HomeScreen: React.FC = () => {
  const { theme, toggleTheme, mode } = useTheme();
  const { user, roles } = useAuthStore();
  const currentTenant = useTenantStore((s) => s.currentTenant);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="h2">MasterHRMS Foundation</Text>
          <Text variant="body" color={theme.colors.textSecondary}>
            Workspace: {currentTenant?.name || 'Default Workspace'}
          </Text>
        </View>

        <Card elevated style={styles.card}>
          <Text variant="h3" style={styles.cardTitle}>
            Session Details
          </Text>
          <Text variant="body" color={theme.colors.textSecondary}>
            User: {user?.email || 'Authenticated User'}
          </Text>
          <Text variant="bodySmall" color={theme.colors.textMuted} style={styles.roleText}>
            Roles: {roles.length > 0 ? roles.join(', ') : 'None'}
          </Text>
        </Card>

        <Card style={[styles.card, styles.mt]}>
          <Text variant="h4" style={styles.cardTitle}>
            Phase 1 Foundation Status
          </Text>
          <Text variant="bodySmall" color={theme.colors.success}>
            ✓ React Native CLI + TypeScript Active
          </Text>
          <Text variant="bodySmall" color={theme.colors.success}>
            ✓ Hardware Secure Storage (Keystore/Keychain)
          </Text>
          <Text variant="bodySmall" color={theme.colors.success}>
            ✓ Axios API Client with Atomic Refresh
          </Text>
          <Text variant="bodySmall" color={theme.colors.success}>
            ✓ Zustand Stores (Auth, Tenant, Theme)
          </Text>
          <Text variant="bodySmall" color={theme.colors.success}>
            ✓ TanStack Query with Tenant-Aware Keys
          </Text>
        </Card>

        <View style={styles.actions}>
          <Button
            title={`Toggle Theme (Current: ${mode})`}
            variant="secondary"
            onPress={toggleTheme}
            style={styles.actionBtn}
          />
          <Button
            title="Log Out"
            variant="danger"
            onPress={() => AuthService.logout()}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 8,
  },
  roleText: {
    marginTop: 4,
  },
  mt: {
    marginTop: 8,
  },
  actions: {
    marginTop: 16,
  },
  actionBtn: {
    marginBottom: 12,
  },
});
