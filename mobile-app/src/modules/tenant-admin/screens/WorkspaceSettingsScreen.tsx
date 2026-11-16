import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { TenantAdminService } from '../../../core/services/tenantAdminService';
import { useTenantStore } from '../../../store/tenantStore';
import { useNavigation } from '@react-navigation/native';

export const WorkspaceSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const currentTenant = useTenantStore((state) => state.currentTenant);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState(currentTenant?.name || '');
  const [supportEmail, setSupportEmail] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR (₹)');

  const loadData = useCallback(async () => {
    try {
      const data = await TenantAdminService.getSettings('general');
      if (data.companyName) setCompanyName(data.companyName);
      if (data.supportEmail) setSupportEmail(data.supportEmail);
      if (data.timezone) setTimezone(data.timezone);
      if (data.currency) setCurrency(data.currency);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await TenantAdminService.updateSettings('general', {
        companyName,
        supportEmail,
        timezone,
        currency,
      });
      Alert.alert('Settings Saved', 'Workspace general settings updated successfully.');
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Unable to update workspace settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workspace Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tenant Identity</Text>

            <Text style={styles.inputLabel}>Organization / Company Name</Text>
            <TextInput
              style={styles.input}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="e.g. MasterHRMS Inc."
            />

            <Text style={styles.inputLabel}>Workspace Slug</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={currentTenant?.slug || 'webfamily'}
              editable={false}
            />

            <Text style={styles.inputLabel}>Primary Support Email</Text>
            <TextInput
              style={styles.input}
              value={supportEmail}
              onChangeText={setSupportEmail}
              placeholder="support@company.com"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Regional & Localization</Text>

            <Text style={styles.inputLabel}>Timezone</Text>
            <TextInput
              style={styles.input}
              value={timezone}
              onChangeText={setTimezone}
              placeholder="Asia/Kolkata (UTC+05:30)"
            />

            <Text style={styles.inputLabel}>Operating Currency</Text>
            <TextInput
              style={styles.input}
              value={currency}
              onChangeText={setCurrency}
              placeholder="INR (₹)"
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Workspace Settings</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  placeholder: {
    width: 36,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  saveButton: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
