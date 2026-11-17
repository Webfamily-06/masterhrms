import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Text } from '../../../components/common/Text';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { AppBottomNav } from '../../../components/common';
import { Check } from 'lucide-react-native';
import { useAuthStore } from '../../../store/authStore';
import { useTenantStore } from '../../../store/tenantStore';
import { AuthService } from '../../../core/auth/authService';

export const HomeScreen: React.FC = () => {
  const { theme, toggleTheme, mode } = useTheme();
  const { user, roles } = useAuthStore();
  const currentTenant = useTenantStore((s) => s.currentTenant);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={styles.container}>
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
            {[
              'React Native CLI + TypeScript Active',
              'Hardware Secure Storage (Keystore/Keychain)',
              'Axios API Client with Atomic Refresh',
              'Zustand Stores (Auth, Tenant, Theme)',
              'TanStack Query with Tenant-Aware Keys',
            ].map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 }}>
                <Check size={14} color={theme.colors.success} />
                <Text variant="bodySmall" color={theme.colors.success}>
                  {item}
                </Text>
              </View>
            ))}
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
      <AppBottomNav activeRoute="Home" />
    </View>
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
