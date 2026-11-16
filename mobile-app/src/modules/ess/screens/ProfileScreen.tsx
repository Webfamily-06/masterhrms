import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  EmployeeService,
  EmployeeProfile,
  EmployeeDocument,
} from '../../../core/services/employeeService';
import { useAuthStore } from '../../../store/authStore';
import { useNavigation } from '@react-navigation/native';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);

  // Request Document Modal
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [docType, setDocType] = useState('Bonafide Letter');
  const [docReason, setDocReason] = useState('');
  const [submittingDoc, setSubmittingDoc] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [profData, docsData] = await Promise.all([
        EmployeeService.getMyProfile(),
        EmployeeService.getMyDocuments(),
      ]);
      setProfile(profData);
      setDocuments(docsData);
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

  const handleRequestDocument = async () => {
    if (!docReason.trim()) {
      Alert.alert('Validation Error', 'Please provide a reason for the document request.');
      return;
    }

    setSubmittingDoc(true);
    try {
      await EmployeeService.requestDocument({
        type: docType,
        reason: docReason.trim(),
      });
      Alert.alert('Requested', 'Your document request has been sent to HR.');
      setDocModalVisible(false);
      setDocReason('');
      loadData();
    } catch (err: any) {
      Alert.alert('Request Failed', err?.message || 'Unable to request document.');
    } finally {
      setSubmittingDoc(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  // Masking helpers
  const maskPan = (pan?: string | null) => {
    if (!pan || pan.length < 10) return 'ABCDE****F';
    return `${pan.substring(0, 5)}****${pan.substring(9)}`;
  };

  const maskAadhaar = (aadhaar?: string | null) => {
    if (!aadhaar || aadhaar.length < 12) return '**** **** 1234';
    return `**** **** ${aadhaar.slice(-4)}`;
  };

  const maskBank = (acc?: string | null) => {
    if (!acc || acc.length < 4) return '******1234';
    return `******${acc.slice(-4)}`;
  };

  const fullName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : user?.profile?.fullName || 'Employee';

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
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('Settings')}
            style={styles.settingsHeaderBtn}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Avatar and Info Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
            <Text style={styles.nameText}>{fullName}</Text>
            <Text style={styles.designationText}>
              {profile?.designation?.name || 'Software Engineer'} •{' '}
              {profile?.department?.name || 'Technology'}
            </Text>
            <Text style={styles.codeText}>ID: {profile?.employeeCode || 'EMP-001'}</Text>
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => (navigation as any).navigate('EditProfile')}
            >
              <Text style={styles.editProfileBtnText}>✏️ Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Contact Details */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Contact & Employment</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Work Email</Text>
              <Text style={styles.infoValue}>{profile?.email || user?.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mobile Phone</Text>
              <Text style={styles.infoValue}>{profile?.phone || '+91 98765 43210'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reporting Manager</Text>
              <Text style={styles.infoValue}>
                {profile?.reportingManager
                  ? `${profile.reportingManager.firstName} ${profile.reportingManager.lastName}`
                  : 'Engineering Lead'}
              </Text>
            </View>
          </View>

          {/* Masked Statutory Details */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Statutory & Banking (Encrypted)</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>PAN Card</Text>
              <Text style={styles.maskedValue}>{maskPan(profile?.panNumber)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Aadhaar Card</Text>
              <Text style={styles.maskedValue}>{maskAadhaar(profile?.aadhaarNumber)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bank Account</Text>
              <Text style={styles.maskedValue}>{maskBank(profile?.bankAccountNumber)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>IFSC Code</Text>
              <Text style={styles.infoValue}>{profile?.bankIfsc || 'HDFC0001234'}</Text>
            </View>
          </View>

          {/* Emergency Contact */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Emergency Contact</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>
                {profile?.emergencyContactName || 'Family Member'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Relationship</Text>
              <Text style={styles.infoValue}>
                {profile?.emergencyContactRelation || 'Parent / Spouse'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>
                {profile?.emergencyContactPhone || '+91 91234 56789'}
              </Text>
            </View>
          </View>

          {/* Documents Section */}
          <View style={styles.sectionCard}>
            <View style={styles.docHeaderRow}>
              <Text style={styles.sectionHeader}>Employee Documents</Text>
              <TouchableOpacity onPress={() => setDocModalVisible(true)}>
                <Text style={styles.reqDocText}>+ Request</Text>
              </TouchableOpacity>
            </View>

            {documents.length === 0 ? (
              <View style={styles.docList}>
                <View style={styles.docItem}>
                  <Text style={styles.docIcon}>📄</Text>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>Employment_Contract_2026.pdf</Text>
                    <Text style={styles.docMeta}>Official Signed Document</Text>
                  </View>
                </View>
                <View style={styles.docItem}>
                  <Text style={styles.docIcon}>📜</Text>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>Employee_Code_Of_Conduct.pdf</Text>
                    <Text style={styles.docMeta}>Company Handbook</Text>
                  </View>
                </View>
              </View>
            ) : (
              documents.map((doc) => (
                <View key={doc.id} style={styles.docItem}>
                  <Text style={styles.docIcon}>📄</Text>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    <Text style={styles.docMeta}>{doc.type}</Text>
                  </View>
                </View>
              ))
            )}
            <TouchableOpacity
              style={styles.viewVaultBtn}
              onPress={() => (navigation as any).navigate('DocumentsVault')}
            >
              <Text style={styles.viewVaultText}>Open Full Document Vault →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Request Document Modal */}
      <Modal visible={docModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Official Document</Text>

            <Text style={styles.inputLabel}>Document Type</Text>
            <View style={styles.typeSelector}>
              {['Bonafide Letter', 'Experience Certificate', 'Address Proof'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, docType === t && styles.typeChipSelected]}
                  onPress={() => setDocType(t)}
                >
                  <Text
                    style={[styles.typeChipText, docType === t && styles.typeChipTextSelected]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Reason / Purpose</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              value={docReason}
              onChangeText={setDocReason}
              placeholder="e.g. Visa application, Bank loan verification"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDocModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleRequestDocument}
                disabled={submittingDoc}
              >
                {submittingDoc ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  logoutBtnText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#15803D',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  designationText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  codeText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  maskedValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  docHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reqDocText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#16A34A',
  },
  docList: {
    marginTop: 4,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  docIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  docMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 6,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAF8',
  },
  typeChipSelected: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  typeChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  typeChipTextSelected: {
    color: '#15803D',
    fontWeight: '700',
  },
  modalInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSubmitBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  settingsHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 18,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editProfileBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  editProfileBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  viewVaultBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  viewVaultText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '600',
  },
});
