import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  Fingerprint,
  ScanFace,
  Lock,
  KeyRound,
  Bell,
  Mail,
  Moon,
  Sun,
  Smartphone,
  HelpCircle,
  Info,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { useAuthStore } from '../../../store/authStore';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { BiometricService } from '../../../core/auth/biometricService';
import { AuthService } from '../../../core/auth/authService';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'Settings'>>();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const lockApp = useAuthStore((s) => s.lockApp);
  const { theme, mode, setMode } = useTheme();

  const [fingerprintEnabled, setFingerprintEnabled] = useState(false);
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState<string>('Hardware Biometrics Ready');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  useEffect(() => {
    async function loadSecuritySettings() {
      const [fp, face, caps] = await Promise.all([
        BiometricService.isFingerprintEnabled(),
        BiometricService.isFaceIdEnabled(),
        BiometricService.getCapabilities(),
      ]);
      setFingerprintEnabled(fp);
      setFaceIdEnabled(face);
      if (caps.biometryType) {
        setBiometricLabel(`${caps.biometryType} available`);
      } else if (!caps.supported) {
        setBiometricLabel('Device Passcode / Simulator Mode');
      }
    }
    void loadSecuritySettings();
  }, []);

  const handleToggleFingerprint = async (val: boolean) => {
    if (val) {
      const res = await BiometricService.verifyHardwareBiometric(
        Platform.OS === 'ios'
          ? 'Verify Touch ID to enable app unlock'
          : 'Scan fingerprint to enable app unlock',
        'fingerprint'
      );
      if (res.success) {
        await BiometricService.setFingerprintEnabled(true, user?.id || 'active_session');
        setFingerprintEnabled(true);
        Alert.alert(
          'Fingerprint Unlock Enabled',
          'You can now unlock MasterHRMS anytime using your fingerprint sensor.'
        );
      } else {
        Alert.alert(
          'Verification Required',
          res.error || 'Could not verify fingerprint. Make sure biometrics is enrolled in device Settings.'
        );
      }
    } else {
      await BiometricService.setFingerprintEnabled(false);
      setFingerprintEnabled(false);
    }
  };

  const handleToggleFaceId = async (val: boolean) => {
    if (val) {
      const res = await BiometricService.verifyHardwareBiometric(
        'Verify Face ID to enable app unlock',
        'face'
      );
      if (res.success) {
        await BiometricService.setFaceIdEnabled(true, user?.id || 'active_session');
        setFaceIdEnabled(true);
        Alert.alert(
          'Face ID Unlock Enabled',
          'You can now unlock MasterHRMS anytime using Face ID.'
        );
      } else {
        Alert.alert(
          'Verification Required',
          res.error || 'Could not verify Face ID. Make sure Face ID is enrolled in device Settings.'
        );
      }
    } else {
      await BiometricService.setFaceIdEnabled(false);
      setFaceIdEnabled(false);
    }
  };

  const handleLockNow = async () => {
    if (!fingerprintEnabled && !faceIdEnabled) {
      const res = await BiometricService.verifyHardwareBiometric(
        'Verify identity to enable and lock workspace',
        'any'
      );
      if (!res.success) {
        Alert.alert(
          'Enable Biometrics First',
          res.error || 'Turn on Fingerprint Unlock or Face ID Unlock above before locking the app.'
        );
        return;
      }
      await BiometricService.enableBiometrics(user?.id || 'active_session');
      setFingerprintEnabled(true);
      setFaceIdEnabled(true);
    }
    lockApp();
  };

  const handleToggleDarkMode = (val: boolean) => {
    setMode(val ? 'dark' : 'light');
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          theme.isDark && { backgroundColor: '#0F172A', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity
          onPress={() => handleToggleDarkMode(!theme.isDark)}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Toggle dark mode"
        >
          {theme.isDark ? (
            <Sun size={18} color="#FBBF24" strokeWidth={2.2} />
          ) : (
            <Moon size={18} color="#FFFFFF" strokeWidth={2.2} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card with Live Profile Image */}
        <View
          style={[
            styles.userCard,
            theme.isDark && {
              backgroundColor: '#1E293B',
              borderWidth: 1,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <UserAvatar
            entity={user}
            name={fullName}
            email={user?.email}
            size={56}
            borderWidth={2}
            borderColor="rgba(255,255,255,0.4)"
            style={{ marginRight: 14 }}
          />
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

        {/* Security & Biometric Unlock */}
        <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>
          Biometric Unlock & Security
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          {/* Fingerprint Unlock */}
          <View style={styles.row}>
            <View
              style={[
                styles.rowIconCircle,
                { backgroundColor: theme.isDark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF' },
              ]}
            >
              <Fingerprint size={19} color="#4F46E5" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                {Platform.OS === 'ios' ? 'Touch ID / Fingerprint Unlock' : 'Fingerprint Unlock'}
              </Text>
              <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                Unlock application with fingerprint sensor
              </Text>
            </View>
            <Switch
              value={fingerprintEnabled}
              onValueChange={handleToggleFingerprint}
              trackColor={{ false: theme.isDark ? '#374151' : '#CBD5E1', true: '#86EFAC' }}
              thumbColor={fingerprintEnabled ? '#22C55E' : '#F1F5F9'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          {/* Face ID Unlock */}
          <View style={styles.row}>
            <View
              style={[
                styles.rowIconCircle,
                { backgroundColor: theme.isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5' },
              ]}
            >
              <ScanFace size={19} color="#059669" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Face ID Unlock</Text>
              <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                Unlock application with facial recognition ({biometricLabel})
              </Text>
            </View>
            <Switch
              value={faceIdEnabled}
              onValueChange={handleToggleFaceId}
              trackColor={{ false: theme.isDark ? '#374151' : '#CBD5E1', true: '#86EFAC' }}
              thumbColor={faceIdEnabled ? '#22C55E' : '#F1F5F9'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          {/* Instant App Lock / Biometric Test Action */}
          <TouchableOpacity
            style={styles.row}
            onPress={handleLockNow}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View
              style={[
                styles.rowIconCircle,
                { backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' },
              ]}
            >
              <Lock size={18} color="#D97706" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                Lock Application Now
              </Text>
              <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                Immediately lock workspace & test Fingerprint / Face ID
              </Text>
            </View>
            <View style={styles.lockNowPill}>
              <Text style={styles.lockNowPillText}>Lock</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          {/* Two-Factor Authentication */}
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              Alert.alert(
                'Two-Factor Authentication',
                '2FA is enforced by your workspace security policy.'
              )
            }
          >
            <View
              style={[
                styles.rowIconCircle,
                { backgroundColor: theme.isDark ? '#1F2937' : '#F1F5F9' },
              ]}
            >
              <KeyRound size={18} color="#4F46E5" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                Two-Factor Authentication
              </Text>
              <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                Email OTP Verification
              </Text>
            </View>
            <View style={styles.badgeActive}>
              <Text style={styles.badgeActiveText}>Active</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Appearance & Preferences */}
        <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>
          Appearance & Notifications
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          {/* Dark Mode Toggle */}
          <View style={styles.row}>
            <View
              style={[
                styles.rowIconCircle,
                { backgroundColor: theme.isDark ? 'rgba(124, 58, 237, 0.22)' : '#F3E8FF' },
              ]}
            >
              <Moon size={18} color="#7C3AED" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Dark Mode</Text>
              <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                {theme.isDark ? 'Dark theme active' : 'Light theme active'} ({mode.toUpperCase()})
              </Text>
            </View>
            <Switch
              value={theme.isDark}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: theme.isDark ? '#374151' : '#CBD5E1', true: '#86EFAC' }}
              thumbColor={theme.isDark ? '#22C55E' : '#F1F5F9'}
            />
          </View>

          {/* Theme Mode Segmented Selector: Light / Dark / System */}
          <View
            style={[
              styles.themeModeSegment,
              { backgroundColor: theme.isDark ? '#1F2937' : '#F1F5F9' },
            ]}
          >
            {(
              [
                { key: 'light', label: 'Light', icon: Sun },
                { key: 'dark', label: 'Dark', icon: Moon },
                { key: 'system', label: 'System', icon: Smartphone },
              ] as const
            ).map((opt) => {
              const selected = mode === opt.key;
              const IconComp = opt.icon;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.themeModeBtn,
                    selected && {
                      backgroundColor: theme.isDark ? '#374151' : '#FFFFFF',
                    },
                  ]}
                  onPress={() => setMode(opt.key)}
                  activeOpacity={0.8}
                >
                  <IconComp
                    size={14}
                    color={selected ? '#4F46E5' : theme.colors.textSecondary}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.themeModeBtnText,
                      {
                        color: selected ? (theme.isDark ? '#FFFFFF' : '#0F172A') : theme.colors.textSecondary,
                        fontWeight: selected ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.row}>
            <View
              style={[
                styles.rowIconCircle,
                { backgroundColor: theme.isDark ? '#1F2937' : '#F1F5F9' },
              ]}
            >
              <Bell size={18} color="#D97706" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                Push Notifications
              </Text>
              <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                Approvals, payroll & task alerts
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: theme.isDark ? '#374151' : '#CBD5E1', true: '#86EFAC' }}
              thumbColor={pushEnabled ? '#22C55E' : '#F1F5F9'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.row}>
            <View
              style={[
                styles.rowIconCircle,
                { backgroundColor: theme.isDark ? '#1F2937' : '#F1F5F9' },
              ]}
            >
              <Mail size={18} color="#2563EB" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Email Digests</Text>
              <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                Weekly activity and schedule updates
              </Text>
            </View>
            <Switch
              value={emailAlerts}
              onValueChange={setEmailAlerts}
              trackColor={{ false: theme.isDark ? '#374151' : '#CBD5E1', true: '#86EFAC' }}
              thumbColor={emailAlerts ? '#22C55E' : '#F1F5F9'}
            />
          </View>
        </View>

        {/* Legal & About */}
        <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>
          Support & Legal
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              Alert.alert(
                'Help & Support',
                'Reach out to support@masterhrms.com or your internal HR helpdesk.'
              )
            }
          >
            <View
              style={[
                styles.rowIconCircle,
                { backgroundColor: theme.isDark ? '#1F2937' : '#F1F5F9' },
              ]}
            >
              <HelpCircle size={18} color="#0D9488" strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                Help & Support Desk
              </Text>
              <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                FAQs, tickets & HR guidance
              </Text>
            </View>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              Alert.alert(
                'MasterHRMS',
                'MasterHRMS Unified Mobile App\nVersion: 2.4.0\nProtected by Hardware Biometric & Enterprise Encryption'
              )
            }
          >
            <View
              style={[
                styles.rowIconCircle,
                { backgroundColor: theme.isDark ? '#1F2937' : '#F1F5F9' },
              ]}
            >
              <Info size={18} color={theme.colors.icon} strokeWidth={2.2} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                About Application
              </Text>
              <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                v2.4.0 • Enterprise Edition
              </Text>
            </View>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[
            styles.signOutBtn,
            theme.isDark && {
              backgroundColor: 'rgba(239, 68, 68, 0.16)',
              borderColor: 'rgba(239, 68, 68, 0.45)',
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={[styles.signOutBtnText, theme.isDark && { color: '#F87171' }]}>
            Log Out of Workspace
          </Text>
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
  },
  header: {
    backgroundColor: '#1E1B4B',
    paddingTop: 50,
    paddingBottom: 18,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
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
    fontSize: 12.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  arrowText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  divider: {
    height: 1,
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
  lockNowPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lockNowPillText: {
    color: '#B45309',
    fontSize: 11.5,
    fontWeight: '700',
  },
  themeModeSegment: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginTop: 12,
    gap: 4,
  },
  themeModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  themeModeBtnText: {
    fontSize: 12.5,
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
