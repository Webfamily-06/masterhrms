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
  EmployeeDocument,
  CompanyContract,
} from '../../../core/services/employeeService';
import { useNavigation } from '@react-navigation/native';

export const DocumentsVaultScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'contracts' | 'policies' | 'letters'>('all');

  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [contracts, setContracts] = useState<CompanyContract[]>([]);

  // Request Document Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [docType, setDocType] = useState('Bonafide Letter');
  const [reason, setReason] = useState('');
  const [requesting, setRequesting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [docsData, contractsData] = await Promise.all([
        EmployeeService.getMyDocuments(),
        EmployeeService.getMyContracts(),
      ]);
      setDocuments(docsData);
      setContracts(contractsData);
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
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please provide a purpose or reason for this document request.');
      return;
    }

    setRequesting(true);
    try {
      await EmployeeService.requestDocument({
        type: docType,
        reason: reason.trim(),
      });
      Alert.alert('Request Sent', 'Your document request has been submitted to the HR operations desk.');
      setModalVisible(false);
      setReason('');
      loadData();
    } catch (err: any) {
      Alert.alert('Request Failed', err?.message || 'Unable to submit request.');
    } finally {
      setRequesting(false);
    }
  };

  const handleDownload = (docName: string) => {
    Alert.alert('Document Downloaded', `${docName} has been downloaded to your secure device storage.`);
  };

  const filteredDocs = documents.filter((d) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'policies') return d.type?.toLowerCase().includes('policy') || !d.type;
    if (activeTab === 'letters') return d.type?.toLowerCase().includes('letter') || d.type?.toLowerCase().includes('certificate');
    return true;
  });

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
        <Text style={styles.headerTitle}>Document Vault</Text>
        <TouchableOpacity
          style={styles.requestHeaderBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.requestHeaderBtnText}>+ Request</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Vault Banner */}
        <View style={styles.bannerCard}>
          <View>
            <Text style={styles.bannerLabel}>SECURE ENTERPRISE VAULT</Text>
            <Text style={styles.bannerTitle}>Official Records</Text>
            <Text style={styles.bannerSub}>Encrypted & Tamper-Proof Storage</Text>
          </View>
          <View style={styles.docCountBadge}>
            <Text style={styles.docCountText}>{documents.length + contracts.length}</Text>
            <Text style={styles.docCountSub}>Files</Text>
          </View>
        </View>

        {/* Tab Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          <TouchableOpacity
            style={[styles.chip, activeTab === 'all' && styles.chipActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.chipText, activeTab === 'all' && styles.chipTextActive]}>
              All Documents ({documents.length + contracts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, activeTab === 'contracts' && styles.chipActive]}
            onPress={() => setActiveTab('contracts')}
          >
            <Text style={[styles.chipText, activeTab === 'contracts' && styles.chipTextActive]}>
              Contracts ({contracts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, activeTab === 'policies' && styles.chipActive]}
            onPress={() => setActiveTab('policies')}
          >
            <Text style={[styles.chipText, activeTab === 'policies' && styles.chipTextActive]}>
              Company Policies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, activeTab === 'letters' && styles.chipActive]}
            onPress={() => setActiveTab('letters')}
          >
            <Text style={[styles.chipText, activeTab === 'letters' && styles.chipTextActive]}>
              Letters & Proofs
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
        ) : activeTab === 'contracts' ? (
          <View>
            {contracts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📜</Text>
                <Text style={styles.emptyTitle}>No Employment Contracts Found</Text>
                <Text style={styles.emptyDesc}>
                  Your digital offer letters and employment agreements will appear here once executed.
                </Text>
              </View>
            ) : (
              contracts.map((c, idx) => (
                <View key={c.id || idx} style={styles.docCard}>
                  <View style={styles.docIconBox}>
                    <Text style={styles.docIcon}>📜</Text>
                  </View>
                  <View style={styles.docDetails}>
                    <Text style={styles.docName}>{c.title}</Text>
                    <Text style={styles.docMeta}>
                      {c.contractType || 'Employment Contract'} • {c.status.toUpperCase()}
                    </Text>
                    {c.effectiveDate && (
                      <Text style={styles.docDate}>Effective: {c.effectiveDate}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => handleDownload(c.title)}
                  >
                    <Text style={styles.downloadBtnText}>⬇️</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : (
          <View>
            {filteredDocs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📁</Text>
                <Text style={styles.emptyTitle}>No Documents in this Category</Text>
                <Text style={styles.emptyDesc}>
                  Need an official certificate or letter? Tap "+ Request" above to request one from HR.
                </Text>
              </View>
            ) : (
              filteredDocs.map((d, idx) => (
                <View key={d.id || idx} style={styles.docCard}>
                  <View style={styles.docIconBox}>
                    <Text style={styles.docIcon}>📄</Text>
                  </View>
                  <View style={styles.docDetails}>
                    <Text style={styles.docName}>{d.name}</Text>
                    <Text style={styles.docMeta}>
                      {d.type || 'Document'} • {d.size ? `${Math.round(d.size / 1024)} KB` : 'PDF'}
                    </Text>
                    <Text style={styles.docDate}>
                      Uploaded: {new Date(d.uploadedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => handleDownload(d.name)}
                  >
                    <Text style={styles.downloadBtnText}>⬇️</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Request Document Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Official Document</Text>
            <Text style={styles.modalSub}>HR will review and upload your certified document.</Text>

            <Text style={styles.inputLabel}>Document Type</Text>
            <View style={styles.typeOptionsRow}>
              {['Bonafide Letter', 'Salary Certificate', 'Experience Letter', 'Address Proof'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeOptionChip, docType === type && styles.typeOptionChipActive]}
                  onPress={() => setDocType(type)}
                >
                  <Text style={[styles.typeOptionText, docType === type && styles.typeOptionTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Purpose / Reason</Text>
            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={3}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. For personal bank loan application or passport renewal..."
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={requesting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleRequestDocument}
                disabled={requesting}
              >
                {requesting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Request</Text>
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
  requestHeaderBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  requestHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  bannerLabel: {
    fontSize: 11,
    color: '#A5B4FC',
    fontWeight: '700',
    letterSpacing: 1,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  bannerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  docCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
  },
  docCountText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  docCountSub: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '600',
  },
  chipsScroll: {
    gap: 8,
    marginBottom: 20,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  docIcon: {
    fontSize: 22,
  },
  docDetails: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 3,
  },
  docMeta: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  docDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadBtnText: {
    fontSize: 16,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  loader: {
    marginTop: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  typeOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeOptionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeOptionChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  typeOptionText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  typeOptionTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  reasonInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
