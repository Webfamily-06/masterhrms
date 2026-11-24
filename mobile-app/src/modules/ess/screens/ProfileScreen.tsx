import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Briefcase,
  ChevronRight,
  LogOut,
  X,
  Phone,
  Calendar,
  CheckCircle2,
  Settings,
  Camera,
  Moon,
  Sun,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { UserAvatar } from '../../../components/common/UserAvatar';
import {
  EmployeeService,
  EmployeeProfile,
} from '../../../core/services/employeeService';
import { useAuthStore } from '../../../store/authStore';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'Profile'>>();
  const user = useAuthStore((state) => state.user);
  const updateUserAvatar = useAuthStore((state) => state.updateUserAvatar);
  const logout = useAuthStore((state) => state.logout);
  const { theme, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);

  const [personalInfoModalOpen, setPersonalInfoModalOpen] = useState(false);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [jobHistoryModalOpen, setJobHistoryModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const profData = await EmployeeService.getMyProfile();
      setProfile(profData);
      if (profData?.avatarUrl) {
        updateUserAvatar(profData.avatarUrl);
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateUserAvatar]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const handlePickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access in Settings to update your profile image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.35,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      const dataUri = asset.base64
        ? `data:${mimeType};base64,${asset.base64}`
        : asset.uri;

      setUploadingPhoto(true);
      updateUserAvatar(dataUri);
      setProfile((prev) => (prev ? { ...prev, avatarUrl: dataUri } : prev));

      try {
        await EmployeeService.updateMyProfile({ avatarUrl: dataUri });
      } catch {
        // Local avatar already updated cleanly
      }

      Alert.alert('Profile Photo Updated', 'Your profile photo is now active across the app.');
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message || 'Could not select profile image.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const fullName = useMemo(() => {
    if (profile?.firstName || profile?.lastName) {
      return `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
    }
    return user?.profile?.fullName || user?.email?.split('@')[0] || 'Sarah Miller';
  }, [profile, user]);

  const designation = profile?.designation?.name || user?.profile?.designation || 'Senior Software Engineer';
  const department = profile?.department?.name || user?.profile?.department || 'Engineering';
  const employeeId = profile?.employeeCode || 'EMP-2024-889';
  const rawAvatar = profile?.avatarUrl || user?.profile?.avatarUrl;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={theme.colors.text} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Toggle dark mode"
          >
            {theme.isDark ? (
              <Sun size={19} color="#FBBF24" strokeWidth={2.2} />
            ) : (
              <Moon size={19} color={theme.colors.text} strokeWidth={2.2} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLogoutModalOpen(true)}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Log Out"
          >
            <LogOut size={20} color="#EF4444" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Avatar Hero Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={handlePickAvatar}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              <UserAvatar
                uri={rawAvatar}
                entity={user}
                name={fullName}
                email={user?.email}
                size={108}
                borderWidth={3}
                borderColor={theme.colors.surface}
              />
              <View style={styles.cameraOverlayBtn}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Camera size={15} color="#FFFFFF" strokeWidth={2.4} />
                )}
              </View>
            </TouchableOpacity>

            <Text style={[styles.profileFullName, { color: theme.colors.text }]}>{fullName}</Text>
            <Text style={[styles.profileRoleDept, { color: theme.colors.textSecondary }]}>
              {designation} • {department}
            </Text>

            <View
              style={[
                styles.empIdBadge,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Text style={[styles.empIdText, { color: theme.colors.textSecondary }]}>
                ID: {employeeId}
              </Text>
            </View>
          </View>

          {/* Main Section Cards */}
          <View style={styles.mainActionCardsList}>
            {/* 1. Personal Information */}
            <TouchableOpacity
              style={[
                styles.actionNavCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              onPress={() => setPersonalInfoModalOpen(true)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.cardIconCircle,
                  { backgroundColor: theme.isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF' },
                ]}
              >
                <User size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.actionCardTitle, { color: theme.colors.text }]}>
                  Personal Information
                </Text>
                <Text style={[styles.actionCardSub, { color: theme.colors.textSecondary }]}>
                  Contact details, photo, address, and emergency
                </Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* 2. Identity Verification */}
            <TouchableOpacity
              style={[
                styles.actionNavCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              onPress={() => setIdentityModalOpen(true)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.cardIconCircle,
                  { backgroundColor: theme.isDark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF' },
                ]}
              >
                <ShieldCheck size={22} color="#4F46E5" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.actionCardTitle, { color: theme.colors.text }]}>
                  Identity Verification
                </Text>
                <Text style={[styles.actionCardSub, { color: theme.colors.textSecondary }]}>
                  Passport, ID card, tax information
                </Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* 3. Employment Information */}
            <TouchableOpacity
              style={[
                styles.actionNavCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              onPress={() => setJobHistoryModalOpen(true)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.cardIconCircle,
                  { backgroundColor: theme.isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF' },
                ]}
              >
                <Briefcase size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.actionCardTitle, { color: theme.colors.text }]}>
                  Employment Information
                </Text>
                <Text style={[styles.actionCardSub, { color: theme.colors.textSecondary }]}>
                  Position, department, employment details
                </Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* 4. App Settings, Biometrics & Dark Mode */}
            <TouchableOpacity
              style={[
                styles.actionNavCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.cardIconCircle,
                  { backgroundColor: theme.isDark ? 'rgba(124, 58, 237, 0.2)' : '#F3E8FF' },
                ]}
              >
                <Settings size={22} color="#7C3AED" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.actionCardTitle, { color: theme.colors.text }]}>
                  Security, Biometrics & Appearance
                </Text>
                <Text style={[styles.actionCardSub, { color: theme.colors.textSecondary }]}>
                  Fingerprint unlock, Face ID & Dark Mode settings
                </Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Edit Profile Quick Shortcut */}
          <TouchableOpacity
            style={[
              styles.editProfileBtn,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={[styles.editProfileBtnText, { color: theme.colors.text }]}>
              Edit Profile Details
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Personal Information Detail Modal */}
      <Modal visible={personalInfoModalOpen} animationType="slide" transparent onRequestClose={() => setPersonalInfoModalOpen(false)}>
        <View style={[styles.fullModalContainer, { backgroundColor: theme.colors.background }]}>
          <View
            style={[
              styles.modalHeaderRow,
              { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity onPress={() => setPersonalInfoModalOpen(false)} style={styles.backBtn}>
              <ArrowLeft size={20} color={theme.colors.text} strokeWidth={2.4} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Personal Information</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View
              style={[
                styles.infoSectionCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <User size={18} color="#2563EB" />
                <Text style={[styles.infoSectionTitle, { color: theme.colors.text }]}>Basic Information</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <UserAvatar
                  uri={rawAvatar}
                  entity={user}
                  name={fullName}
                  email={user?.email}
                  size={56}
                />
                <TouchableOpacity style={{ marginLeft: 16 }} onPress={handlePickAvatar}>
                  <Text style={styles.uploadPhotoLink}>
                    {uploadingPhoto ? 'Uploading...' : '↑ Upload Photo'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldItemLabel}>Full Name</Text>
              <Text style={[styles.fieldItemVal, { color: theme.colors.text }]}>{fullName}</Text>

              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldItemLabel}>Date of Birth</Text>
                  <Text style={[styles.fieldItemVal, { color: theme.colors.text }]}>
                    {profile?.dateOfBirth || '14 Oct 1992'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldItemLabel}>Gender</Text>
                  <Text style={[styles.fieldItemVal, { color: theme.colors.text }]}>
                    {profile?.gender || 'Not specified'}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.infoSectionCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Phone size={18} color="#2563EB" />
                <Text style={[styles.infoSectionTitle, { color: theme.colors.text }]}>Contact Information</Text>
              </View>

              <Text style={styles.fieldItemLabel}>Phone Number</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.fieldItemVal, { color: theme.colors.text }]}>
                  {profile?.phone || '+1 (555) 123-4567'}
                </Text>
                <CheckCircle2 size={16} color="#16A34A" />
              </View>

              <Text style={[styles.fieldItemLabel, { marginTop: 12 }]}>Work Email</Text>
              <Text style={[styles.fieldItemVal, { color: theme.colors.text }]}>
                {profile?.email || user?.email}
              </Text>

              <Text style={[styles.fieldItemLabel, { marginTop: 12 }]}>Residential Address</Text>
              <Text style={[styles.fieldItemVal, { color: theme.colors.text }]}>
                {profile?.address || '42 Innovation Drive, Apt 304'}
              </Text>
            </View>

            <View
              style={[
                styles.infoSectionCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <ShieldCheck size={18} color="#2563EB" />
                <Text style={[styles.infoSectionTitle, { color: theme.colors.text }]}>Emergency Contact</Text>
              </View>

              <Text style={styles.fieldItemLabel}>Contact Name</Text>
              <Text style={[styles.fieldItemVal, { color: theme.colors.text }]}>
                {profile?.emergencyContactName || 'Hanna Jenkins'}
              </Text>

              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldItemLabel}>Relationship</Text>
                  <Text style={[styles.fieldItemVal, { color: theme.colors.text }]}>
                    {profile?.emergencyContactRelation || 'Spouse'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldItemLabel}>Phone Number</Text>
                  <Text style={[styles.fieldItemVal, { color: theme.colors.text }]}>
                    {profile?.emergencyContactPhone || '+1 (555) 987-6543'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryActionBtn}
              onPress={() => {
                setPersonalInfoModalOpen(false);
                navigation.navigate('EditProfile');
              }}
            >
              <Text style={styles.modalPrimaryActionBtnText}>Edit Personal Information</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Identity Verification Modal */}
      <Modal visible={identityModalOpen} animationType="slide" transparent onRequestClose={() => setIdentityModalOpen(false)}>
        <View style={[styles.fullModalContainer, { backgroundColor: theme.colors.background }]}>
          <View
            style={[
              styles.modalHeaderRow,
              { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity onPress={() => setIdentityModalOpen(false)} style={styles.backBtn}>
              <ArrowLeft size={20} color={theme.colors.text} strokeWidth={2.4} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Identity Verification</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View
              style={[
                styles.identityConfirmedHeroCard,
                theme.isDark && { backgroundColor: 'rgba(22, 163, 74, 0.18)' },
              ]}
            >
              <View style={styles.verifiedCheckBadge}>
                <CheckCircle2 size={28} color="#16A34A" />
              </View>
              <Text style={styles.identityHeroTitle}>Identity Verified</Text>
              <Text
                style={[
                  styles.identityHeroSub,
                  theme.isDark && { color: '#86EFAC' },
                ]}
              >
                All government issued documents have been confirmed by HR compliance.
              </Text>
            </View>

            <View
              style={[
                styles.infoSectionCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <View style={styles.docVerifyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docVerifyName, { color: theme.colors.text }]}>
                    National ID / Aadhaar Card
                  </Text>
                  <Text style={styles.docVerifyNum}>**** **** 4589</Text>
                </View>
                <View style={styles.confirmedPill}>
                  <Text style={styles.confirmedPillText}>Confirmed</Text>
                </View>
              </View>

              <View style={[styles.dividerThin, { backgroundColor: theme.colors.borderLight }]} />

              <View style={styles.docVerifyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docVerifyName, { color: theme.colors.text }]}>
                    Tax Identification / PAN Card
                  </Text>
                  <Text style={styles.docVerifyNum}>ABCDE****F</Text>
                </View>
                <View style={styles.confirmedPill}>
                  <Text style={styles.confirmedPillText}>Confirmed</Text>
                </View>
              </View>

              <View style={[styles.dividerThin, { backgroundColor: theme.colors.borderLight }]} />

              <View style={styles.docVerifyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docVerifyName, { color: theme.colors.text }]}>
                    Bank Account Verification
                  </Text>
                  <Text style={styles.docVerifyNum}>HDFC Bank • ****4582</Text>
                </View>
                <View style={styles.confirmedPill}>
                  <Text style={styles.confirmedPillText}>Confirmed</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Job History Modal */}
      <Modal visible={jobHistoryModalOpen} animationType="slide" transparent onRequestClose={() => setJobHistoryModalOpen(false)}>
        <View style={[styles.fullModalContainer, { backgroundColor: theme.colors.background }]}>
          <View
            style={[
              styles.modalHeaderRow,
              { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity onPress={() => setJobHistoryModalOpen(false)} style={styles.backBtn}>
              <ArrowLeft size={20} color={theme.colors.text} strokeWidth={2.4} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Job History</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View
              style={[
                styles.activeJobCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={styles.activeJobPill}>
                  <Text style={styles.activeJobPillText}>Active</Text>
                </View>
                <View style={[styles.jobIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Briefcase size={18} color="#2563EB" />
                </View>
              </View>

              <Text style={[styles.activeJobTitle, { color: theme.colors.text }]}>{designation}</Text>
              <Text style={styles.activeJobDept}>{department} Department</Text>

              <View style={[styles.dividerThin, { backgroundColor: theme.colors.borderLight }]} />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} color="#2563EB" />
                <Text style={styles.activeJobDates}>Jan 2023 - Present</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={logoutModalOpen} animationType="slide" transparent onRequestClose={() => setLogoutModalOpen(false)}>
        <View style={styles.logoutBackdrop}>
          <View style={[styles.logoutSheet, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity
              onPress={() => setLogoutModalOpen(false)}
              style={[styles.logoutCloseBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
            >
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={styles.yellowArchGraphic}>
              <View style={styles.logoutDocWhiteCard}>
                <LogOut size={32} color="#D97706" />
              </View>
            </View>

            <Text style={[styles.logoutModalTitle, { color: theme.colors.text }]}>Logout ?</Text>
            <Text style={[styles.logoutModalSub, { color: theme.colors.textSecondary }]}>
              Are you sure you want to logout of your account
            </Text>

            <TouchableOpacity
              style={styles.keepItBtn}
              onPress={() => setLogoutModalOpen(false)}
            >
              <Text style={styles.keepItBtnText}>Keep It</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmedLogoutBtn}
              onPress={() => {
                setLogoutModalOpen(false);
                void logout();
              }}
            >
              <Text style={styles.confirmedLogoutBtnText}>Confirmed Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AppBottomNav activeRoute="Profile" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarWrap: {
    marginBottom: 14,
    position: 'relative',
  },
  cameraOverlayBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileFullName: {
    fontSize: 22,
    fontWeight: '800',
  },
  profileRoleDept: {
    fontSize: 13,
    marginTop: 4,
  },
  empIdBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  empIdText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mainActionCardsList: {
    marginHorizontal: 16,
    gap: 12,
    marginTop: 10,
  },
  actionNavCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  editProfileBtn: {
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 20,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  fullModalContainer: {
    flex: 1,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  infoSectionCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  infoSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  uploadPhotoLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  fieldItemLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  fieldItemVal: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalPrimaryActionBtn: {
    backgroundColor: '#2563EB',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  modalPrimaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  identityConfirmedHeroCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifiedCheckBadge: {
    marginBottom: 8,
  },
  identityHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16A34A',
  },
  identityHeroSub: {
    fontSize: 12,
    color: '#15803D',
    textAlign: 'center',
    marginTop: 4,
  },
  docVerifyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  docVerifyName: {
    fontSize: 14,
    fontWeight: '700',
  },
  docVerifyNum: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  confirmedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confirmedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  dividerThin: {
    height: 1,
    marginVertical: 10,
  },
  activeJobCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  activeJobPill: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeJobPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  jobIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeJobTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  activeJobDept: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  activeJobDates: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  logoutBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  logoutSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  logoutCloseBtn: {
    alignSelf: 'flex-end',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yellowArchGraphic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutDocWhiteCard: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  logoutModalSub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 22,
  },
  keepItBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  keepItBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmedLogoutBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmedLogoutBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
});
