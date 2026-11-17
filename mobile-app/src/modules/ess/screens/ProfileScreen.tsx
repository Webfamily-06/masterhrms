import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
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
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import {
  EmployeeService,
  EmployeeProfile,
} from '../../../core/services/employeeService';
import { useAuthStore } from '../../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';
import { Config } from '../../../config/environment';

const normalizeAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null;
  let normalized = url.trim();
  if (!normalized) return null;
  if (normalized.includes('api.dicebear.com') && normalized.includes('/svg?')) {
    normalized = normalized.replace('/svg?', '/png?');
  }
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }
  if (normalized.startsWith('/')) {
    return `${Config.API_BASE_URL}${normalized}`;
  }
  return normalized;
};

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'Profile'>>();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);

  // Modals for 82 (Personal Info), 84 (Identity Verification), 89 (Job History), 77 (Logout)
  const [personalInfoModalOpen, setPersonalInfoModalOpen] = useState(false);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [jobHistoryModalOpen, setJobHistoryModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const profData = await EmployeeService.getMyProfile();
      setProfile(profData);
    } catch {
      // Handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const fullName = useMemo(() => {
    if (profile?.firstName || profile?.lastName) {
      return `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
    }
    return user?.profile?.fullName || user?.email?.split('@')[0] || 'Sarah Miller';
  }, [profile, user]);

  const designation = profile?.designation?.name || 'Senior Software Engineer';
  const department = profile?.department?.name || 'Engineering';
  const employeeId = profile?.employeeCode || 'EMP-2024-889';

  const avatarUri = useMemo(
    () => normalizeAvatarUrl(user?.profile?.avatarUrl),
    [user?.profile?.avatarUrl]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          onPress={() => setLogoutModalOpen(true)}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Log Out"
        >
          <LogOut size={20} color="#EF4444" strokeWidth={2.2} />
        </TouchableOpacity>
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
          {/* ─────────────────────────────────────────────────────────── */}
          {/* 81. Profile – Default View                                  */}
          {/* ─────────────────────────────────────────────────────────── */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarLargeImg} />
              ) : (
                <View style={styles.avatarFallbackLarge}>
                  <Text style={styles.avatarFallbackLargeText}>
                    {fullName.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.profileFullName}>{fullName}</Text>
            <Text style={styles.profileRoleDept}>
              {designation} • {department}
            </Text>

            <View style={styles.empIdBadge}>
              <Text style={styles.empIdText}>ID: {employeeId}</Text>
            </View>
          </View>

          {/* 3 Main Section Cards */}
          <View style={styles.mainActionCardsList}>
            {/* 1. Personal Information */}
            <TouchableOpacity
              style={styles.actionNavCard}
              onPress={() => setPersonalInfoModalOpen(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.cardIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <User size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.actionCardTitle}>Personal Information</Text>
                <Text style={styles.actionCardSub}>
                  Contact details, address, and emergency
                </Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* 2. Identity Verification */}
            <TouchableOpacity
              style={styles.actionNavCard}
              onPress={() => setIdentityModalOpen(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.cardIconCircle, { backgroundColor: '#EEF2FF' }]}>
                <ShieldCheck size={22} color="#4F46E5" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.actionCardTitle}>Identity Verification</Text>
                <Text style={styles.actionCardSub}>
                  Passport, ID card, tax information
                </Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* 3. Employment Information */}
            <TouchableOpacity
              style={styles.actionNavCard}
              onPress={() => setJobHistoryModalOpen(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.cardIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Briefcase size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.actionCardTitle}>Employment Information</Text>
                <Text style={styles.actionCardSub}>
                  Position, department, employment details
                </Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Edit Profile Quick Shortcut */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editProfileBtnText}>Edit Profile Details</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 82. Profile – Personal Information Detail Modal                   */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Modal visible={personalInfoModalOpen} animationType="slide" transparent onRequestClose={() => setPersonalInfoModalOpen(false)}>
        <View style={styles.fullModalContainer}>
          <View style={styles.modalHeaderRow}>
            <TouchableOpacity onPress={() => setPersonalInfoModalOpen(false)} style={styles.backBtn}>
              <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Personal Information</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {/* Basic Information Card */}
            <View style={styles.infoSectionCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <User size={18} color="#2563EB" />
                <Text style={styles.infoSectionTitle}>Basic Information</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.smallInfoAvatar} />
                ) : (
                  <View style={[styles.smallInfoAvatar, { backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{fullName.substring(0, 2).toUpperCase()}</Text>
                  </View>
                )}
                <TouchableOpacity style={{ marginLeft: 16 }}>
                  <Text style={styles.uploadPhotoLink}>↑ Upload Photo</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldItemLabel}>Full Name</Text>
              <Text style={styles.fieldItemVal}>{fullName}</Text>

              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldItemLabel}>Date of Birth</Text>
                  <Text style={styles.fieldItemVal}>{profile?.dateOfBirth || '14 Oct 1992'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldItemLabel}>Gender</Text>
                  <Text style={styles.fieldItemVal}>Male</Text>
                </View>
              </View>
            </View>

            {/* Contact Information Card */}
            <View style={styles.infoSectionCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Phone size={18} color="#2563EB" />
                <Text style={styles.infoSectionTitle}>Contact Information</Text>
              </View>

              <Text style={styles.fieldItemLabel}>Phone Number</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.fieldItemVal}>{profile?.phone || '+1 (555) 123-4567'}</Text>
                <CheckCircle2 size={16} color="#16A34A" />
              </View>

              <Text style={[styles.fieldItemLabel, { marginTop: 12 }]}>Personal Email</Text>
              <Text style={styles.fieldItemVal}>{profile?.email || user?.email || 'sarah@karajo.app'}</Text>

              <Text style={[styles.fieldItemLabel, { marginTop: 12 }]}>Residential Address</Text>
              <Text style={styles.fieldItemVal}>
                {profile?.address || '42 Innovation Drive, Apt 304\nSan Francisco, CA 94107'}
              </Text>
            </View>

            {/* Emergency Contact Card */}
            <View style={styles.infoSectionCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <ShieldCheck size={18} color="#2563EB" />
                <Text style={styles.infoSectionTitle}>Emergency Contact</Text>
              </View>

              <Text style={styles.fieldItemLabel}>Contact Name</Text>
              <Text style={styles.fieldItemVal}>{profile?.emergencyContactName || 'Hanna Jenkins'}</Text>

              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldItemLabel}>Relationship</Text>
                  <Text style={styles.fieldItemVal}>{profile?.emergencyContactRelation || 'Spouse'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldItemLabel}>Phone Number</Text>
                  <Text style={styles.fieldItemVal}>{profile?.emergencyContactPhone || '+1 (555) 987-6543'}</Text>
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

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 84. Profile – Identity Verification Modal                         */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Modal visible={identityModalOpen} animationType="slide" transparent onRequestClose={() => setIdentityModalOpen(false)}>
        <View style={styles.fullModalContainer}>
          <View style={styles.modalHeaderRow}>
            <TouchableOpacity onPress={() => setIdentityModalOpen(false)} style={styles.backBtn}>
              <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Identity Verification</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* Status Hero Pill */}
            <View style={styles.identityConfirmedHeroCard}>
              <View style={styles.verifiedCheckBadge}>
                <CheckCircle2 size={28} color="#16A34A" />
              </View>
              <Text style={styles.identityHeroTitle}>Identity Verified</Text>
              <Text style={styles.identityHeroSub}>
                All government issued documents have been confirmed by HR compliance.
              </Text>
            </View>

            {/* Document Checklist */}
            <View style={styles.infoSectionCard}>
              <View style={styles.docVerifyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docVerifyName}>National ID / Aadhaar Card</Text>
                  <Text style={styles.docVerifyNum}>**** **** 4589</Text>
                </View>
                <View style={styles.confirmedPill}>
                  <Text style={styles.confirmedPillText}>Confirmed</Text>
                </View>
              </View>

              <View style={styles.dividerThin} />

              <View style={styles.docVerifyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docVerifyName}>Tax Identification / PAN Card</Text>
                  <Text style={styles.docVerifyNum}>ABCDE****F</Text>
                </View>
                <View style={styles.confirmedPill}>
                  <Text style={styles.confirmedPillText}>Confirmed</Text>
                </View>
              </View>

              <View style={styles.dividerThin} />

              <View style={styles.docVerifyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docVerifyName}>Bank Account Verification</Text>
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

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 89. Profile – Job History Modal                                    */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Modal visible={jobHistoryModalOpen} animationType="slide" transparent onRequestClose={() => setJobHistoryModalOpen(false)}>
        <View style={styles.fullModalContainer}>
          <View style={styles.modalHeaderRow}>
            <TouchableOpacity onPress={() => setJobHistoryModalOpen(false)} style={styles.backBtn}>
              <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Job History</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* Active Position Card */}
            <View style={styles.activeJobCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={styles.activeJobPill}>
                  <Text style={styles.activeJobPillText}>Active</Text>
                </View>
                <View style={[styles.jobIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Briefcase size={18} color="#2563EB" />
                </View>
              </View>

              <Text style={styles.activeJobTitle}>{designation}</Text>
              <Text style={styles.activeJobDept}>{department} Department</Text>

              <View style={styles.dividerThin} />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} color="#2563EB" />
                <Text style={styles.activeJobDates}>Jan 2023 - Present • 1 yr 4 mos</Text>
              </View>
            </View>

            {/* Timeline Past Roles */}
            <View style={styles.timelineList}>
              {[
                {
                  role: 'Product Designer',
                  dept: 'Design Team',
                  period: 'Jan 2021 - Dec 2022 • 2 yrs',
                  manager: 'Alex Smith',
                },
                {
                  role: 'Junior UI Designer',
                  dept: 'Creative Studio',
                  period: 'Jun 2019 - Dec 2020 • 1 yr 6 mos',
                  manager: 'Jennifer Lopez',
                },
                {
                  role: 'Design Intern',
                  dept: 'Creative Studio',
                  period: 'Jan 2019 - May 2019 • 5 mos',
                  manager: 'David Kim',
                },
              ].map((item, idx) => (
                <View key={idx} style={styles.timelineCard}>
                  <Text style={styles.timelineRole}>{item.role}</Text>
                  <Text style={styles.timelineDept}>{item.dept}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                    <Calendar size={13} color="#64748B" />
                    <Text style={styles.timelineDates}>{item.period}</Text>
                  </View>
                  <View style={styles.dividerThin} />
                  <Text style={styles.timelineManager}>Manager: {item.manager}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 77_Logout Modal (Matches 77_Logout.png)                            */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Modal visible={logoutModalOpen} animationType="slide" transparent onRequestClose={() => setLogoutModalOpen(false)}>
        <View style={styles.logoutBackdrop}>
          <View style={styles.logoutSheet}>
            {/* Close Circle floating on top */}
            <TouchableOpacity onPress={() => setLogoutModalOpen(false)} style={styles.logoutCloseBtn}>
              <X size={20} color="#0F172A" />
            </TouchableOpacity>

            {/* Arched Yellow Graphic with Logout Icon */}
            <View style={styles.yellowArchGraphic}>
              <View style={styles.logoutDocWhiteCard}>
                <LogOut size={32} color="#D97706" />
              </View>
            </View>

            <Text style={styles.logoutModalTitle}>Logout ?</Text>
            <Text style={styles.logoutModalSub}>
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
                logout();
              }}
            >
              <Text style={styles.confirmedLogoutBtnText}>Confirmed Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Persistent Bottom Nav */}
      <AppBottomNav activeRoute="Profile" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    color: '#0F172A',
  },

  /* Avatar Profile Section (81. Profile – Default.png) */
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarWrap: {
    marginBottom: 14,
  },
  avatarLargeImg: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarFallbackLarge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarFallbackLargeText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
  },
  profileFullName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileRoleDept: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  empIdBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  empIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  /* Action Nav Cards (81) */
  mainActionCardsList: {
    marginHorizontal: 16,
    gap: 12,
    marginTop: 10,
  },
  actionNavCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    color: '#0F172A',
  },
  actionCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  editProfileBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
    color: '#0F172A',
  },

  /* Full Screen Modals (82, 84, 89) */
  fullModalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
  },
  infoSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  smallInfoAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    color: '#0F172A',
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

  /* Identity Verification (84) */
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
    color: '#0F172A',
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
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },

  /* Job History (89) */
  activeJobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeJobTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
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
  timelineList: {
    gap: 12,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  timelineRole: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineDept: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  timelineDates: {
    fontSize: 12,
    color: '#64748B',
  },
  timelineManager: {
    fontSize: 12,
    color: '#94A3B8',
  },

  /* 77_Logout Modal */
  logoutBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  logoutSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    width: '100%',
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  logoutCloseBtn: {
    position: 'absolute',
    top: -48,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yellowArchGraphic: {
    width: 120,
    height: 100,
    backgroundColor: '#F59E0B',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
    marginVertical: 12,
  },
  logoutDocWhiteCard: {
    width: 64,
    height: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  logoutModalSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  keepItBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    width: '100%',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  keepItBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  confirmedLogoutBtn: {
    backgroundColor: '#EF4444',
    width: '100%',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmedLogoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
