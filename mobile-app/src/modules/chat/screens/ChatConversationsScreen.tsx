import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';
import {
  ChatService,
  ChatConversation,
  ChatContact,
} from '../../../core/services/chatService';

export const ChatConversationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'group'>('all');

  // New Chat Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ChatService.getConversations(
        activeTab === 'all' ? undefined : activeTab
      );
      setConversations(data);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const openNewChatModal = async () => {
    setModalVisible(true);
    setIsCreatingGroup(false);
    setSelectedMemberIds([]);
    setGroupName('');
    try {
      setContactsLoading(true);
      const data = await ChatService.getContacts();
      setContacts(data);
    } catch {
      // Graceful fallback
    } finally {
      setContactsLoading(false);
    }
  };

  const handleStartDirectChat = async (contact: ChatContact) => {
    try {
      const conv = await ChatService.createDirectConversation(contact.id);
      setModalVisible(false);
      if (conv) {
        navigation.navigate('ChatConversationDetail', {
          threadId: conv.id,
          title: contact.name,
          type: 'direct',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start conversation';
      Alert.alert('Error', msg);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Required', 'Please enter a group name.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      Alert.alert('Required', 'Please select at least one group member.');
      return;
    }
    try {
      const newGrp = await ChatService.createGroup(groupName.trim(), '', selectedMemberIds);
      setModalVisible(false);
      loadConversations();
      if (newGrp) {
        navigation.navigate('ChatConversationDetail', {
          threadId: newGrp.id,
          title: newGrp.name,
          type: 'group',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create group';
      Alert.alert('Error', msg);
    }
  };

  const toggleSelectMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter((m) => m !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages & Chat</Text>
        <TouchableOpacity
          onPress={openNewChatModal}
          style={styles.newChatBtn}
          accessibilityRole="button"
          accessibilityLabel="New chat"
        >
          <Text style={styles.newChatBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations & groups..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Tab Filter Chips */}
      <View style={styles.tabsRow}>
        {(['all', 'direct', 'group'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabChipText,
                activeTab === tab && styles.tabChipTextActive,
              ]}
            >
              {tab === 'all' ? 'All Chats' : tab === 'direct' ? 'Direct Messages' : 'Groups'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conversation List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color="#4F46E5" style={styles.loader} />
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No Conversations</Text>
            <Text style={styles.emptySubtitle}>
              Start a direct conversation with your colleagues or create a project group.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openNewChatModal}>
              <Text style={styles.emptyBtnText}>Start New Chat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredConversations.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.convCard}
              onPress={() =>
                navigation.navigate('ChatConversationDetail', {
                  threadId: item.id,
                  title: item.name,
                  type: item.type,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Conversation with ${item.name}`}
            >
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>
                    {item.name ? item.name.substring(0, 2).toUpperCase() : 'CH'}
                  </Text>
                </View>
                {item.participants?.some((p) => p.online) && <View style={styles.onlineBadge} />}
              </View>

              <View style={styles.convDetails}>
                <View style={styles.convTopRow}>
                  <Text style={styles.convName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.convTime}>
                    {item.lastMessage?.createdAt
                      ? new Date(item.lastMessage.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </Text>
                </View>

                <View style={styles.convBottomRow}>
                  <Text style={styles.convSnippet} numberOfLines={1}>
                    {item.lastMessage?.content || 'No messages yet'}
                  </Text>
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* New Chat / Group Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isCreatingGroup ? 'Create New Group' : 'Start New Chat'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Mode Switcher */}
            <View style={styles.modalModeSwitch}>
              <TouchableOpacity
                style={[styles.switchBtn, !isCreatingGroup && styles.switchBtnActive]}
                onPress={() => setIsCreatingGroup(false)}
              >
                <Text
                  style={[styles.switchBtnText, !isCreatingGroup && styles.switchBtnTextActive]}
                >
                  Direct Message
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.switchBtn, isCreatingGroup && styles.switchBtnActive]}
                onPress={() => setIsCreatingGroup(true)}
              >
                <Text
                  style={[styles.switchBtnText, isCreatingGroup && styles.switchBtnTextActive]}
                >
                  New Group
                </Text>
              </TouchableOpacity>
            </View>

            {isCreatingGroup && (
              <View style={styles.groupInputSection}>
                <Text style={styles.fieldLabel}>Group Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Design Team Sprints"
                  placeholderTextColor="#94A3B8"
                  value={groupName}
                  onChangeText={setGroupName}
                />
                <Text style={styles.fieldLabel}>Select Members ({selectedMemberIds.length})</Text>
              </View>
            )}

            {/* Contacts Picker */}
            <ScrollView style={styles.contactsList} showsVerticalScrollIndicator={false}>
              {contactsLoading ? (
                <ActivityIndicator color="#4F46E5" style={styles.loader} />
              ) : (
                contacts.map((contact) => {
                  const isSelected = selectedMemberIds.includes(contact.id);
                  return (
                    <TouchableOpacity
                      key={contact.id}
                      style={[styles.contactRow, isSelected && styles.contactRowSelected]}
                      onPress={() => {
                        if (isCreatingGroup) {
                          toggleSelectMember(contact.id);
                        } else {
                          handleStartDirectChat(contact);
                        }
                      }}
                    >
                      <View style={styles.contactAvatar}>
                        <Text style={styles.contactAvatarText}>
                          {contact.name.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactDept}>
                          {contact.designation || contact.department || contact.email}
                        </Text>
                      </View>
                      {isCreatingGroup && (
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkboxActive,
                          ]}
                        >
                          {isSelected && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {isCreatingGroup && (
              <TouchableOpacity style={styles.createGroupBtn} onPress={handleCreateGroup}>
                <Text style={styles.createGroupBtnText}>Create Group Chat</Text>
              </TouchableOpacity>
            )}
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  newChatBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  newChatBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabChipActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 30,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  convCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  convDetails: {
    flex: 1,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  convTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  convBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convSnippet: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold',
  },
  modalModeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  switchBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  switchBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  switchBtnTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  groupInputSection: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  contactsList: {
    maxHeight: 280,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  contactRowSelected: {
    backgroundColor: '#F5F7FF',
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactDept: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  createGroupBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  createGroupBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
