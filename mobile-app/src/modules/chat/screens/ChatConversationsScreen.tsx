import React, { useState, useEffect, useMemo } from 'react';
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
  Image,
  Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text } from '../../../components/common/Text';
import {
  Search,
  X,
  Archive,
  Pin,
  Paperclip,
  MessageSquare,
  Users,
  Megaphone,
  Phone,
  Video,
  Bell,
  BellOff,
  Mail,
  Check,
  CheckSquare,
  Square,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react-native';
import {
  WorkspaceModuleShell,
  WorkspaceLoadingBlock,
  WorkspaceErrorBlock,
  WorkspaceEmptyBlock,
} from '../../../components/workspace/WorkspaceModuleShell';
import { createTenantQueryKey } from '../../../app/providers/QueryProvider';
import { useAuthStore } from '../../../store/authStore';
import { usePermission } from '../../../hooks/usePermission';
import { realtimeManager } from '../../../core/realtime/realtimeManager';
import { openOrShareAttachment } from '../../../core/storage/attachmentHelper';
import {
  ChatService,
  ChatConversation,
  ChatContact,
  ChatGroupDetail,
  CallLogItem,
  OrgGroupTemplate,
} from '../../../core/services/chatService';

type ChatWorkspaceTab = 'chats' | 'groups' | 'contacts' | 'calls';

export const ChatConversationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { hasAnyPermission, activeRole } = usePermission();

  const initialTab: ChatWorkspaceTab = route.params?.initialTab || 'chats';
  const [activeTab, setActiveTab] = useState<ChatWorkspaceTab>(initialTab);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Call logs filters
  const [callTypeFilter, setCallTypeFilter] = useState<'all' | 'audio' | 'video'>('all');
  const [callStatusFilter, setCallStatusFilter] = useState<'all' | 'COMPLETED' | 'MISSED'>('all');
  const [selectedCallDetail, setSelectedCallDetail] = useState<CallLogItem | null>(null);

  // Thread context action modal
  const [contextConv, setContextConv] = useState<ChatConversation | null>(null);

  // New Chat / Create Group / Join Invite modal
  const [newModalVisible, setNewModalVisible] = useState(false);
  const [newModalMode, setNewModalMode] = useState<'direct' | 'custom_group' | 'org_template' | 'invite'>('direct');
  const [contactFilter, setContactFilter] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [isAnnouncementOnly, setIsAnnouncementOnly] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<OrgGroupTemplate | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // Permission check for Announcement-only channels (mirrors server ChatService.hasChatPermission('chat.announcements'))
  const canCreateAnnouncements =
    hasAnyPermission(['chat.announcements', 'hrm.announcements.manage', 'hrm.manage', '*']) ||
    activeRole === 'hr_admin' ||
    activeRole === 'tenant_admin';

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(timer);
  }, [search]);

  // Auto-join group if deep-linked with joinGroupToken
  useEffect(() => {
    const token = route.params?.joinGroupToken;
    if (token) {
      ChatService.joinGroupByInvite(token)
        .then((grp) => {
          void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['chat']) });
          navigation.navigate('ChatConversationDetail', {
            threadId: grp.threadId,
            title: grp.name,
            type: grp.isAnnouncementOnly ? 'announcement' : 'group',
            groupId: grp.id,
            isAnnouncementOnly: grp.isAnnouncementOnly,
          });
        })
        .catch((err: any) => {
          Alert.alert('Invite Link', err?.message || 'Unable to join group via invite token.');
        });
    }
  }, [route.params?.joinGroupToken, navigation, queryClient]);

  // Presence query & heartbeat
  const presenceQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'presence']),
    queryFn: () => ChatService.getPresence(false),
    refetchInterval: 15000,
  });

  const onlineSet = useMemo(
    () => new Set<string>(presenceQuery.data || []),
    [presenceQuery.data]
  );

  // Conversations query
  const conversationsQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'conversations', showArchived ? 'archived' : 'active']),
    queryFn: () => ChatService.getConversations({ includeArchived: showArchived }),
    refetchInterval: 12000,
  });

  // Groups query
  const groupsQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'groups', showArchived ? 'archived' : 'active']),
    queryFn: () => ChatService.getGroups({ includeArchived: showArchived }),
    enabled: activeTab === 'groups' || newModalVisible,
  });

  // Contacts query
  const contactsQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'contacts']),
    queryFn: () => ChatService.getContacts(),
    enabled: activeTab === 'contacts' || newModalVisible,
  });

  // Org templates query
  const templatesQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'org-templates']),
    queryFn: () => ChatService.getOrgGroupTemplates(),
    enabled: newModalVisible && newModalMode === 'org_template',
  });

  // Call logs query
  const callsQuery = useQuery({
    queryKey: createTenantQueryKey([
      'chat',
      'calls',
      callTypeFilter,
      callStatusFilter,
      debouncedSearch,
    ]),
    queryFn: () =>
      ChatService.getCalls({
        search: activeTab === 'calls' && debouncedSearch ? debouncedSearch : undefined,
        callType: callTypeFilter === 'all' ? undefined : callTypeFilter,
        status: callStatusFilter === 'all' ? undefined : callStatusFilter,
        limit: 40,
      }),
    enabled: activeTab === 'calls',
  });

  // Global search query (>= 2 chars in Personal or Groups tabs)
  const globalSearchQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'search', debouncedSearch]),
    queryFn: () => ChatService.searchGlobal(debouncedSearch, 25),
    enabled:
      (activeTab === 'chats' || activeTab === 'groups') && debouncedSearch.length >= 2,
  });

  // Realtime listeners with strict cleanup on unmount
  useEffect(() => {
    const invalidateChat = () => {
      void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['chat']) });
    };

    const unsubs = [
      realtimeManager.subscribe('chat:message', invalidateChat),
      realtimeManager.subscribe('chat:message_edited', invalidateChat),
      realtimeManager.subscribe('chat:message_deleted', invalidateChat),
      realtimeManager.subscribe('chat:group_created', invalidateChat),
      realtimeManager.subscribe('chat:group_updated', invalidateChat),
      realtimeManager.subscribe('chat:room_revoked', invalidateChat),
      realtimeManager.subscribe('chat:read', invalidateChat),
      realtimeManager.subscribe('presence:update', () => {
        void queryClient.invalidateQueries({
          queryKey: createTenantQueryKey(['chat', 'presence']),
        });
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [queryClient]);

  // Mutations
  const startDirectMutation = useMutation({
    mutationFn: (contact: ChatContact) =>
      ChatService.createDirectConversation(contact.userId || contact.id),
    onSuccess: (conv, contact) => {
      setNewModalVisible(false);
      void queryClient.invalidateQueries({
        queryKey: createTenantQueryKey(['chat', 'conversations']),
      });
      navigation.navigate('ChatConversationDetail', {
        threadId: conv.threadId,
        title: conv.name || contact.name,
        type: 'direct',
        otherParticipantId: contact.userId || contact.id,
        avatarUrl: conv.avatar || contact.avatar,
      });
    },
    onError: (err: any) => {
      Alert.alert('Direct Chat Error', err?.message || 'Unable to open direct conversation.');
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: () =>
      ChatService.createGroup({
        name: groupName.trim(),
        description: groupDesc.trim() || undefined,
        memberIds: selectedMemberIds,
        isAnnouncementOnly: canCreateAnnouncements ? isAnnouncementOnly : false,
        category: isAnnouncementOnly ? 'announcement' : 'custom',
      }),
    onSuccess: (grp) => {
      setNewModalVisible(false);
      setGroupName('');
      setGroupDesc('');
      setSelectedMemberIds([]);
      setIsAnnouncementOnly(false);
      void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['chat']) });
      navigation.navigate('ChatConversationDetail', {
        threadId: grp.threadId,
        title: grp.name,
        type: grp.isAnnouncementOnly ? 'announcement' : 'group',
        groupId: grp.id,
        isAnnouncementOnly: grp.isAnnouncementOnly,
      });
    },
    onError: (err: any) => {
      Alert.alert('Create Group Error', err?.message || 'Unable to create group.');
    },
  });

  const createOrgGroupMutation = useMutation({
    mutationFn: (tpl: OrgGroupTemplate) =>
      ChatService.createGroupFromOrg({
        templateType: tpl.templateType,
        sourceEntityId: tpl.sourceEntityId,
        name: groupName.trim() || undefined,
        description: groupDesc.trim() || undefined,
        isAnnouncementOnly: canCreateAnnouncements ? isAnnouncementOnly : false,
      }),
    onSuccess: (grp) => {
      setNewModalVisible(false);
      setSelectedTemplate(null);
      setGroupName('');
      void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['chat']) });
      navigation.navigate('ChatConversationDetail', {
        threadId: grp.threadId,
        title: grp.name,
        type: grp.isAnnouncementOnly ? 'announcement' : 'group',
        groupId: grp.id,
        isAnnouncementOnly: grp.isAnnouncementOnly,
      });
    },
    onError: (err: any) => {
      Alert.alert('Organization Group Error', err?.message || 'Unable to sync organization group.');
    },
  });

  const joinInviteMutation = useMutation({
    mutationFn: (token: string) => ChatService.joinGroupByInvite(token),
    onSuccess: (grp) => {
      setNewModalVisible(false);
      setInviteCodeInput('');
      void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['chat']) });
      navigation.navigate('ChatConversationDetail', {
        threadId: grp.threadId,
        title: grp.name,
        type: grp.isAnnouncementOnly ? 'announcement' : 'group',
        groupId: grp.id,
      });
    },
    onError: (err: any) => {
      Alert.alert('Join Group Failed', err?.message || 'Invalid or expired invite code.');
    },
  });

  const pinConvMutation = useMutation({
    mutationFn: (threadId: string) => ChatService.pinConversation(threadId),
    onSuccess: () => {
      setContextConv(null);
      void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['chat']) });
    },
  });

  const prefMutation = useMutation({
    mutationFn: (params: {
      threadId: string;
      prefs: { isMuted?: boolean; isArchived?: boolean; markedUnread?: boolean };
    }) => ChatService.updateConversationPreferences(params.threadId, params.prefs),
    onSuccess: () => {
      setContextConv(null);
      void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['chat']) });
    },
  });

  const deleteCallMutation = useMutation({
    mutationFn: (callId: string) => ChatService.deleteCallLog(callId),
    onSuccess: () => {
      setSelectedCallDetail(null);
      void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['chat', 'calls']) });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to remove call log.');
    },
  });

  // Filtered conversations
  const allConversations = useMemo(
    () => conversationsQuery.data || [],
    [conversationsQuery.data]
  );
  const visibleConversations = useMemo(() => {
    return allConversations.filter((c) => {
      if (!showArchived && c.isArchived) return false;
      if (activeTab === 'chats' && c.type !== 'direct') return false;
      if (activeTab === 'groups' && c.type === 'direct') return false;
      if (debouncedSearch) {
        return (
          c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          c.lastMessageText.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
      }
      return true;
    });
  }, [allConversations, showArchived, activeTab, debouncedSearch]);

  const pinnedConversations = useMemo(
    () => allConversations.filter((c) => c.isPinned && !c.isArchived).slice(0, 6),
    [allConversations]
  );

  const directUnreadTotal = useMemo(
    () =>
      allConversations
        .filter((c) => c.type === 'direct')
        .reduce((acc, c) => acc + (c.unreadCount || 0), 0),
    [allConversations]
  );

  const groupUnreadTotal = useMemo(
    () =>
      allConversations
        .filter((c) => c.type !== 'direct')
        .reduce((acc, c) => acc + (c.unreadCount || 0), 0),
    [allConversations]
  );

  // Alphabetical contacts
  const filteredContacts = useMemo(() => {
    const list = (contactsQuery.data || []).filter((c) => c.userId !== user?.id);
    const q = (activeTab === 'contacts' ? debouncedSearch : contactFilter).toLowerCase();
    const matched = q
      ? list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.department || '').toLowerCase().includes(q) ||
            (c.designation || '').toLowerCase().includes(q)
        )
      : list;
    return [...matched].sort((a, b) => a.name.localeCompare(b.name));
  }, [contactsQuery.data, user?.id, activeTab, debouncedSearch, contactFilter]);

  // Call logs stats
  const callRecords = useMemo(
    () => callsQuery.data?.calls || [],
    [callsQuery.data?.calls]
  );
  const callStats = useMemo(() => {
    const total = callsQuery.data?.total ?? callRecords.length;
    const completed = callRecords.filter((c) => c.status === 'COMPLETED' || c.status === 'CONNECTED').length;
    const missed = callRecords.filter((c) =>
      ['MISSED', 'NO_ANSWER', 'REJECTED', 'CANCELLED'].includes(c.status)
    ).length;
    const outgoing = callRecords.filter(
      (c) => c.direction === 'outgoing' || c.callerId === user?.id
    ).length;
    return { total, completed, missed, outgoing, incoming: Math.max(0, callRecords.length - outgoing) };
  }, [callRecords, callsQuery.data?.total, user?.id]);

  const openConversation = (conv: ChatConversation) => {
    navigation.navigate('ChatConversationDetail', {
      threadId: conv.threadId,
      title: conv.name,
      type: conv.type,
      groupId: conv.groupId,
      otherParticipantId: conv.otherParticipantId,
      avatarUrl: conv.avatar,
      isAnnouncementOnly: conv.isAnnouncementOnly,
    });
  };

  const openGroup = (grp: ChatGroupDetail) => {
    navigation.navigate('ChatConversationDetail', {
      threadId: grp.threadId,
      title: grp.name,
      type: grp.isAnnouncementOnly ? 'announcement' : 'group',
      groupId: grp.id,
      avatarUrl: grp.avatar,
      isAnnouncementOnly: grp.isAnnouncementOnly,
    });
  };

  const dialColleague = (targetUserId: string, targetName: string, callType: 'audio' | 'video', threadId?: string) => {
    if (!targetUserId || targetUserId === user?.id) {
      Alert.alert('Call Error', 'Please select a valid colleague to call.');
      return;
    }
    navigation.navigate('ChatCall', {
      receiverId: targetUserId,
      receiverName: targetName,
      callType,
      threadId,
      isGroupMeeting: false,
      isIncoming: false,
    });
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatDurationSec = (sec: number) => {
    if (!sec || sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isRefreshing =
    conversationsQuery.isRefetching ||
    groupsQuery.isRefetching ||
    contactsQuery.isRefetching ||
    callsQuery.isRefetching;

  const handleRefresh = () => {
    void conversationsQuery.refetch();
    if (activeTab === 'groups') void groupsQuery.refetch();
    if (activeTab === 'contacts') void contactsQuery.refetch();
    if (activeTab === 'calls') void callsQuery.refetch();
  };

  return (
    <WorkspaceModuleShell
      activeModule="chat"
      title="Messages & Chat"
      rightActions={
        <TouchableOpacity
          onPress={() => {
            setNewModalMode(activeTab === 'groups' ? 'custom_group' : 'direct');
            setNewModalVisible(true);
          }}
          style={styles.newBtn}
          accessibilityRole="button"
          accessibilityLabel="New conversation or group"
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      }
      subHeader={
        <View style={styles.subHeaderWrap}>
          {/* Search + Archive Filter Row */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search size={15} color="#94A3B8" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={
                  activeTab === 'calls'
                    ? 'Search call history...'
                    : activeTab === 'contacts'
                    ? 'Search organization directory...'
                    : 'Search messages, files & chats...'
                }
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
                  <X size={14} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {(activeTab === 'chats' || activeTab === 'groups') && (
              <TouchableOpacity
                style={[styles.archiveToggle, showArchived && styles.archiveToggleActive]}
                onPress={() => setShowArchived((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel="Toggle archived conversations"
              >
                <Archive size={16} color={showArchived ? '#4F46E5' : '#64748B'} />
              </TouchableOpacity>
            )}
          </View>

          {/* 4-Mode Workspace Switcher: Personal | Groups | Contacts | Call Logs */}
          <View style={styles.modeTabsRow}>
            {(
              [
                { key: 'chats', label: 'Personal', badge: directUnreadTotal },
                { key: 'groups', label: 'Groups', badge: groupUnreadTotal },
                { key: 'contacts', label: 'Contacts', badge: 0 },
                { key: 'calls', label: 'Call Logs', badge: 0 },
              ] as const
            ).map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.modeChip, selected && styles.modeChipActive]}
                  onPress={() => setActiveTab(tab.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.modeChipText, selected && styles.modeChipTextActive]}>
                    {tab.label}
                  </Text>
                  {tab.badge > 0 && (
                    <View style={styles.modeUnreadPill}>
                      <Text style={styles.modeUnreadText}>
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Pinned Conversations Strip */}
        {(activeTab === 'chats' || activeTab === 'groups') &&
          !debouncedSearch &&
          pinnedConversations.length > 0 && (
            <View style={styles.pinnedSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                <Pin size={12} color="#4F46E5" />
                <Text style={styles.sectionMiniLabel}>PINNED</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {pinnedConversations.map((pin) => (
                  <TouchableOpacity
                    key={pin.threadId}
                    style={styles.pinnedChip}
                    onPress={() => openConversation(pin)}
                  >
                    <View style={styles.pinnedAvatar}>
                      <Text style={styles.pinnedAvatarText}>
                        {pin.name.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.pinnedName} numberOfLines={1}>
                      {pin.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

        {/* Global Search Results (Messages + Files) */}
        {(activeTab === 'chats' || activeTab === 'groups') && debouncedSearch.length >= 2 && (
          <View style={styles.searchResultsSection}>
            <Text style={styles.sectionMiniLabel}>
              GLOBAL SEARCH RESULTS {globalSearchQuery.isFetching ? '(Searching...)' : ''}
            </Text>
            {(globalSearchQuery.data?.messages || []).map((msg) => (
              <TouchableOpacity
                key={`smsg-${msg.id}`}
                style={styles.searchHitCard}
                onPress={() =>
                  navigation.navigate('ChatConversationDetail', {
                    threadId: msg.threadId,
                    title: msg.threadName || 'Conversation',
                    type: msg.threadId.startsWith('group_') ? 'group' : 'direct',
                  })
                }
              >
                <View style={styles.convTopRow}>
                  <Text style={styles.convName} numberOfLines={1}>
                    {msg.threadName || msg.senderName}
                  </Text>
                  <Text style={styles.convTime}>{formatTimestamp(msg.createdAt)}</Text>
                </View>
                <Text style={styles.convSnippet} numberOfLines={2}>
                  {msg.senderName}: {msg.content}
                </Text>
              </TouchableOpacity>
            ))}

            {(globalSearchQuery.data?.files || []).map((file) => (
              <TouchableOpacity
                key={`sfile-${file.id}`}
                style={styles.searchHitCard}
                onPress={() =>
                  openOrShareAttachment({
                    url: file.url,
                    mediaId: file.mediaId,
                    fileName: file.name,
                  }).catch((e) => Alert.alert('Attachment', e.message))
                }
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Paperclip size={14} color="#6366F1" />
                  <Text style={styles.convName} numberOfLines={1}>
                    {file.name}
                  </Text>
                </View>
                <Text style={styles.convSnippet}>Tap to preview or download shared file</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* TAB 1: DIRECT CHATS */}
        {activeTab === 'chats' && (
          <>
            {conversationsQuery.isLoading ? (
              <WorkspaceLoadingBlock message="Loading direct conversations..." />
            ) : conversationsQuery.isError ? (
              <WorkspaceErrorBlock
                message={(conversationsQuery.error as any)?.message || 'Failed to load chats.'}
                onRetry={() => conversationsQuery.refetch()}
              />
            ) : visibleConversations.length === 0 ? (
              <WorkspaceEmptyBlock
                title={showArchived ? 'No Archived Chats' : 'No Direct Conversations'}
                description="Start a private conversation with any colleague in your organization workspace."
                actionLabel="Start New Chat"
                onAction={() => {
                  setNewModalMode('direct');
                  setNewModalVisible(true);
                }}
              />
            ) : (
              visibleConversations.map((conv) => {
                const isPeerOnline = Boolean(
                  conv.otherParticipantId && onlineSet.has(conv.otherParticipantId)
                );
                const unread = conv.unreadCount || (conv.markedUnread ? 1 : 0);
                return (
                  <TouchableOpacity
                    key={conv.threadId}
                    style={styles.convCard}
                    onPress={() => openConversation(conv)}
                    onLongPress={() => setContextConv(conv)}
                    accessibilityRole="button"
                    accessibilityLabel={`Direct chat with ${conv.name}`}
                  >
                    <View style={styles.avatarWrap}>
                      {conv.avatar ? (
                        <Image source={{ uri: conv.avatar }} style={styles.avatarImg} />
                      ) : (
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarInitials}>
                            {conv.name.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {isPeerOnline && <View style={styles.onlineDot} />}
                    </View>

                    <View style={styles.convDetails}>
                      <View style={styles.convTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                          {conv.isPinned && <Pin size={12} color="#4F46E5" />}
                          {conv.isMuted && <BellOff size={12} color="#94A3B8" />}
                          <Text style={styles.convName} numberOfLines={1}>
                            {conv.name}
                          </Text>
                        </View>
                        <Text style={styles.convTime}>{formatTimestamp(conv.lastMessageTime)}</Text>
                      </View>
                      <View style={styles.convBottomRow}>
                        <Text style={styles.convSnippet} numberOfLines={1}>
                          {conv.lastMessageText || 'No messages yet — say hello!'}
                        </Text>
                        {unread > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{unread}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* TAB 2: GROUPS & ANNOUNCEMENT CHANNELS */}
        {activeTab === 'groups' && (
          <>
            {groupsQuery.isLoading ? (
              <WorkspaceLoadingBlock message="Loading workspace groups..." />
            ) : groupsQuery.isError ? (
              <WorkspaceErrorBlock
                message={(groupsQuery.error as any)?.message || 'Failed to load groups.'}
                onRetry={() => groupsQuery.refetch()}
              />
            ) : (groupsQuery.data || []).filter((g) =>
                debouncedSearch
                  ? g.name.toLowerCase().includes(debouncedSearch.toLowerCase())
                  : true
              ).length === 0 ? (
              <WorkspaceEmptyBlock
                title="No Groups Found"
                description="Create a project group or sync a department channel to collaborate with your team."
                actionLabel="Create Group"
                onAction={() => {
                  setNewModalMode('custom_group');
                  setNewModalVisible(true);
                }}
              />
            ) : (
              (groupsQuery.data || [])
                .filter((g) =>
                  debouncedSearch
                    ? g.name.toLowerCase().includes(debouncedSearch.toLowerCase())
                    : true
                )
                .map((grp) => (
                  <TouchableOpacity
                    key={grp.id}
                    style={styles.convCard}
                    onPress={() => openGroup(grp)}
                    accessibilityRole="button"
                    accessibilityLabel={`Group ${grp.name}`}
                  >
                    <View style={styles.avatarWrap}>
                      {grp.avatar ? (
                        <Image source={{ uri: grp.avatar }} style={styles.avatarImg} />
                      ) : (
                        <View style={[styles.avatarCircle, styles.groupAvatarBg]}>
                          {grp.isAnnouncementOnly ? (
                            <Megaphone size={16} color="#FFFFFF" />
                          ) : (
                            <Users size={16} color="#FFFFFF" />
                          )}
                        </View>
                      )}
                    </View>

                    <View style={styles.convDetails}>
                      <View style={styles.convTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                          {grp.isPinned && <Pin size={12} color="#4F46E5" />}
                          {grp.isMuted && <BellOff size={12} color="#94A3B8" />}
                          <Text style={styles.convName} numberOfLines={1}>
                            {grp.name}
                          </Text>
                        </View>
                        {grp.isAnnouncementOnly && (
                          <View style={styles.announcementBadge}>
                            <Text style={styles.announcementBadgeText}>Announcement</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.convBottomRow}>
                        <Text style={styles.convSnippet} numberOfLines={1}>
                          {grp.memberCount} members
                          {grp.description ? ` • ${grp.description}` : ''}
                        </Text>
                        {grp.unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{grp.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
            )}
          </>
        )}

        {/* TAB 3: ORGANIZATION CONTACTS DIRECTORY */}
        {activeTab === 'contacts' && (
          <>
            {contactsQuery.isLoading ? (
              <WorkspaceLoadingBlock message="Loading organization directory..." />
            ) : contactsQuery.isError ? (
              <WorkspaceErrorBlock
                message={(contactsQuery.error as any)?.message || 'Failed to load directory.'}
                onRetry={() => contactsQuery.refetch()}
              />
            ) : filteredContacts.length === 0 ? (
              <WorkspaceEmptyBlock
                title="No Matching Colleagues"
                description="No organization members match your current search filter."
              />
            ) : (
              filteredContacts.map((contact) => {
                const isOnline = contact.online || onlineSet.has(contact.userId);
                return (
                  <View key={contact.id} style={styles.convCard}>
                    <TouchableOpacity
                      style={styles.contactMainTouch}
                      onPress={() => startDirectMutation.mutate(contact)}
                    >
                      <View style={styles.avatarWrap}>
                        {contact.avatar ? (
                          <Image source={{ uri: contact.avatar }} style={styles.avatarImg} />
                        ) : (
                          <View style={styles.avatarCircle}>
                            <Text style={styles.avatarInitials}>
                              {contact.name.substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        {isOnline && <View style={styles.onlineDot} />}
                      </View>
                      <View style={styles.convDetails}>
                        <Text style={styles.convName} numberOfLines={1}>
                          {contact.name}
                        </Text>
                        <Text style={styles.convSnippet} numberOfLines={1}>
                          {contact.designation || contact.department || contact.email}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.contactQuickActions}>
                      <TouchableOpacity
                        style={styles.quickActionCircle}
                        onPress={() => startDirectMutation.mutate(contact)}
                        accessibilityRole="button"
                        accessibilityLabel={`Message ${contact.name}`}
                      >
                        <MessageSquare size={16} color="#4F46E5" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionCircle}
                        onPress={() =>
                          dialColleague(contact.userId, contact.name, 'audio', contact.threadId)
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Audio call ${contact.name}`}
                      >
                        <Phone size={16} color="#10B981" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionCircle}
                        onPress={() =>
                          dialColleague(contact.userId, contact.name, 'video', contact.threadId)
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Video call ${contact.name}`}
                      >
                        <Video size={16} color="#6366F1" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* TAB 4: CALL LOGS WORKSPACE */}
        {activeTab === 'calls' && (
          <>
            {/* 4 KPI Stat Cards */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>{callStats.total}</Text>
                <Text style={styles.kpiLabel}>Total Calls</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={[styles.kpiValue, { color: '#10B981' }]}>{callStats.completed}</Text>
                <Text style={styles.kpiLabel}>Completed</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={[styles.kpiValue, { color: '#EF4444' }]}>{callStats.missed}</Text>
                <Text style={styles.kpiLabel}>Missed / No Ans</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>
                  {callStats.incoming} / {callStats.outgoing}
                </Text>
                <Text style={styles.kpiLabel}>In / Out</Text>
              </View>
            </View>

            {/* Call Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.callFiltersRow}
            >
              {(['all', 'audio', 'video'] as const).map((ct) => (
                <TouchableOpacity
                  key={ct}
                  style={[styles.filterPill, callTypeFilter === ct && styles.filterPillActive]}
                  onPress={() => setCallTypeFilter(ct)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {ct === 'audio' && (
                      <Phone size={12} color={callTypeFilter === ct ? '#FFFFFF' : '#64748B'} />
                    )}
                    {ct === 'video' && (
                      <Video size={12} color={callTypeFilter === ct ? '#FFFFFF' : '#64748B'} />
                    )}
                    <Text
                      style={[
                        styles.filterPillText,
                        callTypeFilter === ct && styles.filterPillTextActive,
                      ]}
                    >
                      {ct === 'all' ? 'All Types' : ct === 'audio' ? 'Audio' : 'Video'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {(['all', 'COMPLETED', 'MISSED'] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.filterPill, callStatusFilter === st && styles.filterPillActive]}
                  onPress={() => setCallStatusFilter(st)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      callStatusFilter === st && styles.filterPillTextActive,
                    ]}
                  >
                    {st === 'all' ? 'All Status' : st}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {callsQuery.isLoading ? (
              <WorkspaceLoadingBlock message="Loading call history..." />
            ) : callsQuery.isError ? (
              <WorkspaceErrorBlock
                message={(callsQuery.error as any)?.message || 'Failed to load call logs.'}
                onRetry={() => callsQuery.refetch()}
              />
            ) : callRecords.length === 0 ? (
              <WorkspaceEmptyBlock
                title="No Call History Found"
                description="Audio and video calls made within your workspace will appear here."
              />
            ) : (
              callRecords.map((call) => {
                const isOutgoing = call.callerId === user?.id || call.direction === 'outgoing';
                const peerId = isOutgoing ? call.receiverId : call.callerId;
                const peerName = isOutgoing ? call.receiverName : call.callerName;
                const isMissed = ['MISSED', 'NO_ANSWER', 'REJECTED'].includes(call.status);

                return (
                  <TouchableOpacity
                    key={call.id}
                    style={styles.convCard}
                    onPress={() => setSelectedCallDetail(call)}
                  >
                    <View style={styles.avatarCircle}>
                      {call.callType === 'video' ? (
                        <Video size={16} color="#6366F1" />
                      ) : (
                        <Phone size={16} color="#10B981" />
                      )}
                    </View>
                    <View style={styles.convDetails}>
                      <View style={styles.convTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                          {isOutgoing ? (
                            <ArrowUpRight size={14} color="#64748B" />
                          ) : (
                            <ArrowDownLeft size={14} color={isMissed ? '#DC2626' : '#10B981'} />
                          )}
                          <Text
                            style={[styles.convName, isMissed && { color: '#DC2626' }]}
                            numberOfLines={1}
                          >
                            {peerName}
                          </Text>
                        </View>
                        <Text style={styles.convTime}>{formatTimestamp(call.createdAt)}</Text>
                      </View>
                      <Text style={styles.convSnippet}>
                        {call.status} • {formatDurationSec(call.durationSeconds)}
                      </Text>
                    </View>

                    {peerId && peerId !== user?.id && (
                      <TouchableOpacity
                        style={styles.quickActionCircle}
                        onPress={() => dialColleague(peerId, peerName, call.callType, call.threadId)}
                        accessibilityRole="button"
                        accessibilityLabel={`Call back ${peerName}`}
                      >
                        {call.callType === 'video' ? (
                          <Video size={16} color="#6366F1" />
                        ) : (
                          <Phone size={16} color="#10B981" />
                        )}
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Conversation Context Action Modal */}
      <Modal visible={!!contextConv} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setContextConv(null)}
        >
          <View style={styles.sheetCard}>
            {contextConv && (
              <>
                <Text style={styles.sheetTitle}>{contextConv.name}</Text>
                <TouchableOpacity
                  style={styles.sheetActionRow}
                  onPress={() => pinConvMutation.mutate(contextConv.threadId)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pin size={16} color="#4F46E5" />
                    <Text style={styles.sheetActionText}>
                      {contextConv.isPinned ? 'Unpin Conversation' : 'Pin Conversation'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sheetActionRow}
                  onPress={() =>
                    prefMutation.mutate({
                      threadId: contextConv.threadId,
                      prefs: { isMuted: !contextConv.isMuted },
                    })
                  }
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {contextConv.isMuted ? (
                      <Bell size={16} color="#4F46E5" />
                    ) : (
                      <BellOff size={16} color="#64748B" />
                    )}
                    <Text style={styles.sheetActionText}>
                      {contextConv.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sheetActionRow}
                  onPress={() =>
                    prefMutation.mutate({
                      threadId: contextConv.threadId,
                      prefs: { markedUnread: !contextConv.markedUnread },
                    })
                  }
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Mail size={16} color="#4F46E5" />
                    <Text style={styles.sheetActionText}>
                      {contextConv.markedUnread ? 'Clear Unread Mark' : 'Mark as Unread'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sheetActionRow}
                  onPress={() =>
                    prefMutation.mutate({
                      threadId: contextConv.threadId,
                      prefs: { isArchived: !contextConv.isArchived },
                    })
                  }
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Archive size={16} color="#4F46E5" />
                    <Text style={styles.sheetActionText}>
                      {contextConv.isArchived ? 'Unarchive Chat' : 'Archive Chat'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Call Log Detail Modal */}
      <Modal visible={!!selectedCallDetail} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetCard}>
            {selectedCallDetail && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.sheetTitle}>Call Record Details</Text>
                  <TouchableOpacity onPress={() => setSelectedCallDetail(null)}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.detailLine}>
                  Caller: {selectedCallDetail.callerName}
                </Text>
                <Text style={styles.detailLine}>
                  Receiver: {selectedCallDetail.receiverName}
                </Text>
                <Text style={styles.detailLine}>
                  Type: {selectedCallDetail.callType.toUpperCase()} • Status:{' '}
                  {selectedCallDetail.status}
                </Text>
                <Text style={styles.detailLine}>
                  Duration: {formatDurationSec(selectedCallDetail.durationSeconds)}
                </Text>
                <Text style={styles.detailLine}>
                  Timestamp: {new Date(selectedCallDetail.createdAt).toLocaleString()}
                </Text>

                <View style={styles.callDetailActions}>
                  {(() => {
                    const isOut = selectedCallDetail.callerId === user?.id;
                    const peerId = isOut
                      ? selectedCallDetail.receiverId
                      : selectedCallDetail.callerId;
                    const peerName = isOut
                      ? selectedCallDetail.receiverName
                      : selectedCallDetail.callerName;
                    return peerId && peerId !== user?.id ? (
                      <>
                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          onPress={() => {
                            setSelectedCallDetail(null);
                            dialColleague(peerId, peerName, 'audio', selectedCallDetail.threadId);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Phone size={14} color="#FFFFFF" />
                            <Text style={styles.primaryActionText}>Audio Call</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          onPress={() => {
                            setSelectedCallDetail(null);
                            dialColleague(peerId, peerName, 'video', selectedCallDetail.threadId);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Video size={14} color="#FFFFFF" />
                            <Text style={styles.primaryActionText}>Video Call</Text>
                          </View>
                        </TouchableOpacity>
                      </>
                    ) : null;
                  })()}
                  <TouchableOpacity
                    style={styles.dangerActionBtn}
                    onPress={() => deleteCallMutation.mutate(selectedCallDetail.id)}
                  >
                    <Text style={styles.dangerActionText}>Hide Record</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* New Direct Chat / Custom Group / Org Template / Join Invite Modal */}
      <Modal visible={newModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheetCard, styles.tallSheet]}>
            <View style={styles.modalHeader}>
              <Text style={styles.sheetTitle}>Start Collaboration</Text>
              <TouchableOpacity onPress={() => setNewModalVisible(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* 4-Way Mode Selector */}
            <View style={styles.modalTabsRow}>
              {(
                [
                  { k: 'direct', label: 'Direct' },
                  { k: 'custom_group', label: 'Group' },
                  { k: 'org_template', label: 'Dept/Org' },
                  { k: 'invite', label: 'Invite Code' },
                ] as const
              ).map((m) => (
                <TouchableOpacity
                  key={m.k}
                  style={[styles.modalTabBtn, newModalMode === m.k && styles.modalTabBtnActive]}
                  onPress={() => setNewModalMode(m.k)}
                >
                  <Text
                    style={[
                      styles.modalTabText,
                      newModalMode === m.k && styles.modalTabTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {newModalMode === 'invite' ? (
              <View style={styles.formSection}>
                <Text style={styles.fieldLabel}>Workspace Group Invite Token</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Paste invite token..."
                  placeholderTextColor="#94A3B8"
                  value={inviteCodeInput}
                  onChangeText={setInviteCodeInput}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.submitFullBtn}
                  disabled={!inviteCodeInput.trim() || joinInviteMutation.isPending}
                  onPress={() => joinInviteMutation.mutate(inviteCodeInput.trim())}
                >
                  {joinInviteMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitFullBtnText}>Join Group</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : newModalMode === 'org_template' ? (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Select Department, Branch or Cohort</Text>
                {templatesQuery.isLoading ? (
                  <ActivityIndicator color="#4F46E5" style={{ marginVertical: 20 }} />
                ) : (templatesQuery.data || []).length === 0 ? (
                  <Text style={styles.convSnippet}>No organization templates available.</Text>
                ) : (
                  (templatesQuery.data || []).map((tpl) => {
                    const active = selectedTemplate?.id === tpl.id;
                    return (
                      <TouchableOpacity
                        key={tpl.id}
                        style={[styles.contactSelectRow, active && styles.contactSelectRowActive]}
                        onPress={() => setSelectedTemplate(tpl)}
                      >
                        <View style={styles.convDetails}>
                          <Text style={styles.convName}>{tpl.name}</Text>
                          <Text style={styles.convSnippet}>
                            {tpl.templateType.toUpperCase()}
                            {tpl.memberCount !== undefined ? ` • ${tpl.memberCount} members` : ''}
                          </Text>
                        </View>
                        {active && <Check size={16} color="#4F46E5" />}
                      </TouchableOpacity>
                    );
                  })
                )}

                <Text style={styles.fieldLabel}>Custom Channel Name (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Override template name..."
                  placeholderTextColor="#94A3B8"
                  value={groupName}
                  onChangeText={setGroupName}
                />

                {canCreateAnnouncements && (
                  <View style={styles.switchRow}>
                    <Text style={styles.fieldLabel}>Announcement-Only Channel</Text>
                    <Switch value={isAnnouncementOnly} onValueChange={setIsAnnouncementOnly} />
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitFullBtn, !selectedTemplate && { opacity: 0.5 }]}
                  disabled={!selectedTemplate || createOrgGroupMutation.isPending}
                  onPress={() => selectedTemplate && createOrgGroupMutation.mutate(selectedTemplate)}
                >
                  {createOrgGroupMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitFullBtnText}>Sync & Open Group</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <>
                {newModalMode === 'custom_group' && (
                  <View style={styles.formSection}>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Group Name *"
                      placeholderTextColor="#94A3B8"
                      value={groupName}
                      onChangeText={setGroupName}
                    />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Description (optional)"
                      placeholderTextColor="#94A3B8"
                      value={groupDesc}
                      onChangeText={setGroupDesc}
                    />
                    {canCreateAnnouncements && (
                      <View style={styles.switchRow}>
                        <Text style={styles.fieldLabel}>Announcement-Only (Admins post)</Text>
                        <Switch value={isAnnouncementOnly} onValueChange={setIsAnnouncementOnly} />
                      </View>
                    )}
                    <Text style={styles.fieldLabel}>
                      Members Selected ({selectedMemberIds.length})
                    </Text>
                  </View>
                )}

                <TextInput
                  style={styles.modalInput}
                  placeholder="Filter colleagues by name, email, department..."
                  placeholderTextColor="#94A3B8"
                  value={contactFilter}
                  onChangeText={setContactFilter}
                />

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  {contactsQuery.isLoading ? (
                    <ActivityIndicator color="#4F46E5" style={{ marginVertical: 20 }} />
                  ) : (
                    filteredContacts.map((c) => {
                      const chosen = selectedMemberIds.includes(c.userId);
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.contactSelectRow, chosen && styles.contactSelectRowActive]}
                          onPress={() => {
                            if (newModalMode === 'direct') {
                              startDirectMutation.mutate(c);
                            } else {
                              setSelectedMemberIds((prev) =>
                                prev.includes(c.userId)
                                  ? prev.filter((id) => id !== c.userId)
                                  : [...prev, c.userId]
                              );
                            }
                          }}
                        >
                          <View style={styles.avatarCircleSmall}>
                            <Text style={styles.avatarInitialsSmall}>
                              {c.name.substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.convDetails}>
                            <Text style={styles.convName}>{c.name}</Text>
                            <Text style={styles.convSnippet}>
                              {c.designation || c.department || c.email}
                            </Text>
                          </View>
                          {newModalMode === 'custom_group' && (
                            chosen ? (
                              <CheckSquare size={18} color="#4F46E5" />
                            ) : (
                              <Square size={18} color="#94A3B8" />
                            )
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>

                {newModalMode === 'custom_group' && (
                  <TouchableOpacity
                    style={styles.submitFullBtn}
                    disabled={createGroupMutation.isPending}
                    onPress={() => {
                      if (!groupName.trim()) {
                        Alert.alert('Required', 'Group name is required.');
                        return;
                      }
                      if (selectedMemberIds.length === 0) {
                        Alert.alert('Required', 'Select at least one colleague.');
                        return;
                      }
                      createGroupMutation.mutate();
                    }}
                  >
                    {createGroupMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitFullBtnText}>Create Group</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Floating Action Button (Matches Light UI Chats List) */}
      <TouchableOpacity
        style={styles.fabBtn}
        onPress={() => {
          setNewModalMode(activeTab === 'groups' ? 'custom_group' : 'direct');
          setNewModalVisible(true);
        }}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="New Chat or Group"
      >
        <MessageSquare size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </WorkspaceModuleShell>
  );
};

const styles = StyleSheet.create({
  newBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  subHeaderWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
  },
  clearSearchBtn: {
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchText: {
    fontSize: 14,
    color: '#64748B',
  },
  archiveToggle: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveToggleActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  archiveToggleText: {
    fontSize: 16,
  },
  archiveToggleTextActive: {
    color: '#4F46E5',
  },
  modeTabsRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 6,
  },
  modeChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 4,
  },
  modeChipActive: {
    backgroundColor: '#E8F8F0',
    borderWidth: 1,
    borderColor: '#00D287',
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modeChipTextActive: {
    color: '#00A86B',
    fontWeight: '700',
  },
  modeUnreadPill: {
    backgroundColor: '#00D287',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeUnreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  pinnedSection: {
    marginBottom: 12,
  },
  sectionMiniLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  pinnedChip: {
    width: 72,
    alignItems: 'center',
    marginRight: 10,
  },
  pinnedAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  pinnedAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  pinnedName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  searchResultsSection: {
    marginBottom: 14,
  },
  searchHitCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  convCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    minHeight: 68,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarBg: {
    backgroundColor: '#E0E7FF',
  },
  avatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4F46E5',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
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
    marginBottom: 3,
  },
  convName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
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
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#00D287',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  announcementBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  announcementBadgeText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '700',
  },
  contactMainTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickActionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  callFiltersRow: {
    paddingBottom: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  tallSheet: {
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    padding: 6,
  },
  sheetActionRow: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  detailLine: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 6,
  },
  callDetailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  primaryActionBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dangerActionBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerActionText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  modalTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  modalTabBtn: {
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9,
  },
  modalTabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  modalTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modalTabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  formSection: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  modalInput: {
    minHeight: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalScroll: {
    maxHeight: 280,
  },
  contactSelectRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contactSelectRowActive: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
  },
  avatarCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitialsSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
  },
  submitFullBtn: {
    minHeight: 46,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  submitFullBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  fabBtn: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#00D287',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});
