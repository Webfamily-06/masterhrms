import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  Shield,
  KeyRound,
  Bell,
  Mail,
  Moon,
  HelpCircle,
  Info,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { useAuthStore } from '../../../store/authStore';
import { BiometricService } from '../../../core/auth/biometricService';
import { AuthService } from '../../../core/auth/authService';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'Settings'>>();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);

  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    async function checkBio() {
      const isEn = await BiometricService.isBiometricsEnabled();
      setBiometricsEnabled(isEn);
    }
    checkBio();
  }, []);

  const handleToggleBiometrics = async (val: boolean) => {
    if (val) {
      const { supported } = await BiometricService.isBiometricsSupported();
      if (!supported) {
        Alert.alert('Not Supported', 'Biometric hardware is not available on this device.');
        return;
      }
      const verified = await BiometricService.authenticateWithBiometrics(
        'Verify identity to enable biometric unlock'
      );
      if (verified) {
        await BiometricService.enableBiometrics(user?.id || 'active_session');
        setBiometricsEnabled(true);
        Alert.alert('Enabled', 'Biometric login has been activated for this device.');
      }
    } else {
      await BiometricService.disableBiometrics();
      setBiometricsEnabled(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your workspace?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AuthService.logout();
        },
      },
    ]);
  };

  const fullName = user?.profile?.fullName || user?.email?.split('@')[0] || 'Employee';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{fullName}</Text>
            <Text style={styles.userRole}>{(activeRole || 'Employee').replace('_', ' ').toUpperCase()}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Security & Access */}
        <Text style={styles.sectionHeader}>Security & Access</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIconCircle}>
              <Shield size={18} color="#059669" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowTitle}>Biometric Unlock</Text>
              <Text style={styles.rowSub}>Touch ID / Face ID Quick Access</Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
              thumbColor={biometricsEnabled ? '#22C55E' : '#F1F5F9'}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => Alert.alert('Two-Factor Authentication', '2FA is enforced by your workspace administrator.')}
          >
            <View style={styles.rowIconCircle}>
              <KeyRound size={18} color="#4F46E5" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowTitle}>Two-Factor Authentication</Text>
              <Text style={styles.rowSub}>Email OTP Verification</Text>
            </View>
            <View style={styles.badgeActive}>
              <Text style={styles.badgeActiveText}>Active</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Preferences */}
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIconCircle}>
              <Bell size={18} color="#D97706" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowTitle}>Push Notifications</Text>
              <Text style={styles.rowSub}>Approvals, payroll & task alerts</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
              thumbColor={pushEnabled ? '#22C55E' : '#F1F5F9'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowIconCircle}>
              <Mail size={18} color="#2563EB" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowTitle}>Email Digests</Text>
              <Text style={styles.rowSub}>Weekly activity and schedule updates</Text>
            </View>
            <Switch
              value={emailAlerts}
              onValueChange={setEmailAlerts}
              trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
              thumbColor={emailAlerts ? '#22C55E' : '#F1F5F9'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowIconCircle}>
              <Moon size={18} color="#7C3AED" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowTitle}>Dark Mode</Text>
              <Text style={styles.rowSub}>System automatic theme</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
              thumbColor={darkMode ? '#22C55E' : '#F1F5F9'}
            />
          </View>
        </View>

        {/* Legal & About */}
        <Text style={styles.sectionHeader}>Support & Legal</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => Alert.alert('Help & Support', 'Reach out to support@masterhrms.com or your internal HR helpdesk.')}
          >
            <View style={styles.rowIconCircle}>
              <HelpCircle size={18} color="#0D9488" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowTitle}>Help & Support Desk</Text>
              <Text style={styles.rowSub}>FAQs, tickets & HR guidance</Text>
            </View>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => Alert.alert('MasterHRMS', 'MasterHRMS Unified Mobile App\nVersion: 2.4.0 (Build 20261116)\nProtected by Enterprise Encryption')}
          >
            <View style={styles.rowIconCircle}>
              <Info size={18} color="#475569" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowTitle}>About Application</Text>
              <Text style={styles.rowSub}>v2.4.0 • Enterprise Edition</Text>
            </View>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.signOutBtnText}>Log Out of Workspace</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Pinned Bottom Navigation */}
      <AppBottomNav activeRoute="Settings" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#1E1B4B',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userRole: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  editBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowIcon: {
    fontSize: 16,
  },
  rowTextCol: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  rowSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  arrowText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  badgeActive: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeActiveText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
  },
  signOutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  signOutBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
});
