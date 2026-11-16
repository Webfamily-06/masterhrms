import React, { useState } from 'react';
import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Text } from '../../../components/common/Text';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { useTenantStore } from '../../../store/tenantStore';
import { TenantService } from '../../../core/tenant/tenantService';
import { NavigationProp } from '../../../types/navigation.types';
import { useNavigation } from '@react-navigation/native';

export const CompanyDiscoveryScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp<'CompanyDiscovery'>>();
  const { setTenant, currentTenant } = useTenantStore();

  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResolveCompany = async () => {
    const trimmed = slug.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your company code or workspace name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tenantData = await TenantService.resolveTenant(trimmed);

      if (tenantData && tenantData.resolved) {
        await setTenant(tenantData);
        navigation.navigate('Login', { workspaceSlug: tenantData.slug });
      } else {
        await setTenant(tenantData);
        navigation.navigate('Login', { workspaceSlug: 'default' });
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to MasterHRMS workspace server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.logoBadge, { backgroundColor: theme.colors.primaryLight }]}>
            <Text variant="h1" color={theme.colors.primary}>
              M
            </Text>
          </View>
          <Text variant="h1" style={styles.title}>
            MasterHRMS
          </Text>
          <Text variant="body" color={theme.colors.textSecondary} align="center">
            Unified Multi-Tenant Workforce Management
          </Text>
        </View>

        <Card elevated style={styles.card}>
          <Text variant="h3" style={styles.cardTitle}>
            Find Your Workspace
          </Text>
          <Text variant="bodySmall" color={theme.colors.textSecondary} style={styles.cardSubtitle}>
            Enter your organization code or workspace subdomain.
          </Text>

          <View style={styles.inputContainer}>
            <Text variant="caption" color={theme.colors.textSecondary} style={styles.inputLabel}>
              COMPANY CODE / WORKSPACE
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderColor: error ? theme.colors.danger : theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="e.g. acme or company-name"
              placeholderTextColor={theme.colors.textMuted}
              value={slug}
              onChangeText={(text) => {
                setSlug(text);
                if (error) setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleResolveCompany}
            />
          </View>

          {error ? (
            <Text variant="bodySmall" color={theme.colors.danger} style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          <Button
            title="Continue to Sign In"
            onPress={handleResolveCompany}
            loading={loading}
            style={styles.button}
          />
        </Card>

        {currentTenant?.resolved ? (
          <View style={styles.resolvedFooter}>
            <Text variant="caption" color={theme.colors.textMuted}>
              Connected to: {currentTenant.name} ({currentTenant.slug})
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 4,
  },
  card: {
    width: '100%',
  },
  cardTitle: {
    marginBottom: 4,
  },
  cardSubtitle: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  errorText: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
  resolvedFooter: {
    marginTop: 24,
    alignItems: 'center',
  },
});
