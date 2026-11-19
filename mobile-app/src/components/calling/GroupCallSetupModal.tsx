import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Search,
  Check,
  Phone,
  Video,
  Users,
} from 'lucide-react-native';
import { Text } from '../common/Text';
import { ChatService } from '../../core/services/chatService';
import { createTenantQueryKey } from '../../core/query/tenantQueryKeys';
import { Config } from '../../config/environment';

interface GroupCallSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onStartGroupCall: (callType: 'audio' | 'video', selectedUserIds: string[], groupName?: string) => void;
  preselectedUserId?: string;
}

export const GroupCallSetupModal: React.FC<GroupCallSetupModalProps> = ({
  visible,
  onClose,
  onStartGroupCall,
  preselectedUserId,
}) => {
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [search, setSearch] = useState('');
  const [groupMeetingName, setGroupMeetingName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    preselectedUserId ? [preselectedUserId] : []
  );

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: createTenantQueryKey(['chat', 'contacts']),
    queryFn: () => ChatService.getContacts(),
    enabled: visible,
  });

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.department && c.department.toLowerCase().includes(q)) ||
        (c.designation && c.designation.toLowerCase().includes(q))
    );
  }, [contacts, search]);

  const toggleSelect = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleStart = () => {
    if (selectedUserIds.length === 0) return;
    onStartGroupCall(
      callType,
      selectedUserIds,
      groupMeetingName.trim() || undefined
    );
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Group Call Setup</Text>
              <Text style={styles.subtitle}>Invite colleagues to live meeting</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close modal">
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Audio vs Video Segment Switch */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[styles.segmentBtn, callType === 'audio' && styles.segmentBtnActive]}
              onPress={() => setCallType('audio')}
              activeOpacity={0.8}
            >
              <Phone size={16} color={callType === 'audio' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.segmentText, callType === 'audio' && styles.segmentTextActive]}>
                Audio Meeting
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, callType === 'video' && styles.segmentBtnActive]}
              onPress={() => setCallType('video')}
              activeOpacity={0.8}
            >
              <Video size={16} color={callType === 'video' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.segmentText, callType === 'video' && styles.segmentTextActive]}>
                Video Meeting
              </Text>
            </TouchableOpacity>
          </View>

          {/* Optional Meeting Topic Input */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              placeholder="Meeting topic (optional, e.g. Design Review)"
              placeholderTextColor="#64748B"
              value={groupMeetingName}
              onChangeText={setGroupMeetingName}
            />
          </View>

          {/* Search Box */}
          <View style={styles.searchWrap}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, department..."
              placeholderTextColor="#64748B"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Colleague Roster List */}
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>SELECT PARTICIPANTS</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{selectedUserIds.length} Selected</Text>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.loadingText}>Loading colleagues...</Text>
              </View>
            ) : filteredContacts.length === 0 ? (
              <View style={styles.centerBox}>
                <Users size={32} color="#475569" />
                <Text style={styles.emptyText}>No colleagues found.</Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                {filteredContacts.map((contact) => {
                  const isSelected = selectedUserIds.includes(contact.userId);
                  const avatarUri = contact.avatar
                    ? (contact.avatar.startsWith('http')
                        ? contact.avatar
                        : `${Config.API_BASE_URL}${contact.avatar.startsWith('/') ? '' : '/'}${contact.avatar}`)
                    : null;

                  return (
                    <TouchableOpacity
                      key={contact.id}
                      style={[styles.contactRow, isSelected && styles.contactRowSelected]}
                      onPress={() => toggleSelect(contact.userId)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.avatarWrap}>
                        {avatarUri ? (
                          <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                        ) : (
                          <View style={styles.avatarInitials}>
                            <Text style={styles.avatarInitialsText}>
                              {contact.name.substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        {contact.online && <View style={styles.onlineBadge} />}
                      </View>

                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName} numberOfLines={1}>
                          {contact.name}
                        </Text>
                        <Text style={styles.contactDept} numberOfLines={1}>
                          {contact.designation || contact.department || contact.email || 'Team Member'}
                        </Text>
                      </View>

                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.startBtn,
                selectedUserIds.length === 0 && styles.startBtnDisabled,
              ]}
              onPress={handleStart}
              disabled={selectedUserIds.length === 0}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Start group call"
            >
              {callType === 'video' ? (
                <Video size={18} color="#FFFFFF" />
              ) : (
                <Phone size={18} color="#FFFFFF" />
              )}
              <Text style={styles.startBtnText}>
                {selectedUserIds.length === 0
                  ? 'Select Colleagues to Start'
                  : `Start ${callType === 'video' ? 'Video' : 'Voice'} Call (${selectedUserIds.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '85%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#6366F1',
  },
  segmentText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  inputWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textInput: {
    color: '#F8FAFC',
    fontSize: 14,
    paddingVertical: 10,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    paddingVertical: 9,
  },
  listContainer: {
    flex: 1,
    marginBottom: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listHeaderText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '600',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 180,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  contactRowSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialsText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  contactDept: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  footer: {
    paddingTop: 8,
  },
  startBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
