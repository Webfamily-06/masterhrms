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
  Bell,
  BellOff,
  Mail,
  Check,
  CheckSquare,
  Square,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  Plus,
  Trash2,
} from 'lucide-react-native';
import {
  WorkspaceModuleShell,
  WorkspaceLoadingBlock,
  WorkspaceErrorBlock,
  WorkspaceEmptyBlock,
} from '../../../components/workspace/WorkspaceModuleShell';
import { createTenantQueryKey } from '../../../core/query/tenantQueryKeys';
import { useAuthStore } from '../../../store/authStore';
import { usePermission } from '../../../hooks/usePermission';
import { realtimeManager } from '../../../core/realtime/realtimeManager';
import { openOrShareAttachment } from '../../../core/storage/attachmentHelper';
import {
  ChatService,
  ChatConversation,
  ChatContact,
  ChatGroupDetail,
  OrgGroupTemplate,
} from '../../../core/services/chatService';
import { CallOptionsBottomSheet } from '../../../components/calling/CallOptionsBottomSheet';
import { GroupCallSetupModal } from '../../../components/calling/GroupCallSetupModal';

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


  // Thread context action modal
  const [contextConv, setContextConv] = useState<ChatConversation | null>(null);

  // Call Options Bottom Sheet & Group Call Setup Modal
  const [callOptionsTarget, setCallOptionsTarget] = useState<ChatContact | null>(null);
  const [groupSetupOpen, setGroupSetupOpen] = useState(false);

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

  // Calls query & filter
  const [callFilter, setCallFilter] = useState<'all' | 'missed'>('all');
  const callsQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'calls', callFilter]),
    queryFn: () =>
      ChatService.getCallLogs({
        status: callFilter === 'missed' ? 'missed' : undefined,
        limit: 50,
      }),
    enabled: activeTab === 'calls',
    refetchInterval: 15000,
  });

  const deleteCallMutation = useMutation({
    mutationFn: (id: string) => ChatService.deleteCallRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['chat', 'calls']) });
    },
  });

  // Org templates query
  const templatesQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'org-templates']),
    queryFn: () => ChatService.getOrgGroupTemplates(),
    enabled: newModalVisible && newModalMode === 'org_template',
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


  // Filtered conversations with strict canonical threadId deduplication
  const allConversations = useMemo(() => {
    const list = conversationsQuery.data || [];
    const seen = new Set<string>();
    const deduped: ChatConversation[] = [];
    for (const c of list) {
      const key = String(c.threadId || c.id || '').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(c);
    }
    return deduped;
  }, [conversationsQuery.data]);

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

  // Alphabetical contacts with canonical userId deduplication
  const filteredContacts = useMemo(() => {
    const list = (contactsQuery.data || []).filter((c) => c.userId !== user?.id);
    const seen = new Set<string>();
    const dedupedList: any[] = [];
    for (const c of list) {
      const key = String(c.userId || c.id || '').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      dedupedList.push(c);
    }
    const q = (activeTab === 'contacts' ? debouncedSearch : contactFilter).toLowerCase();
    const matched = q
      ? dedupedList.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.department || '').toLowerCase().includes(q) ||
            (c.designation || '').toLowerCase().includes(q)
        )
      : dedupedList;
    return [...matched].sort((a, b) => a.name.localeCompare(b.name));
  }, [contactsQuery.data, user?.id, activeTab, debouncedSearch, contactFilter]);

  const deduplicatedCalls = useMemo(() => {
    const list = callsQuery.data?.calls || [];
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const c of list) {
      const key = String(c.id || '').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(c);
    }
    return deduped;
  }, [callsQuery.data?.calls]);

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

  const isRefreshing =
    conversationsQuery.isRefetching ||
    groupsQuery.isRefetching ||
    contactsQuery.isRefetching;

  const handleRefresh = () => {
    void conversationsQuery.refetch();
    if (activeTab === 'groups') void groupsQuery.refetch();
    if (activeTab === 'contacts') void contactsQuery.refetch();
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
                  activeTab === 'contacts'
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

          {/* 4-Mode Workspace Switcher: Personal | Groups | Contacts | Calls */}
          <View style={styles.modeTabsRow}>
            {(
              [
                { key: 'chats', label: 'Personal', badge: directUnreadTotal },
                { key: 'groups', label: 'Groups', badge: groupUnreadTotal },
                { key: 'contacts', label: 'Contacts', badge: 0 },
                {
                  key: 'calls',
                  label: 'Calls',
                  badge: (callsQuery.data?.calls || []).filter((c) => c.status === 'missed').length,
                },
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
                        onPress={() =>
                          navigation.navigate('ChatCall', {
                            receiverId: contact.userId,
                            receiverName: contact.name,
                            receiverAvatar: contact.avatar,
                            callType: 'video',
                            isIncoming: false,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Video call ${contact.name}`}
                      >
                        <Video size={16} color="#10B981" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionCircle}
                        onPress={() =>
                          navigation.navigate('ChatCall', {
                            receiverId: contact.userId,
                            receiverName: contact.name,
                            receiverAvatar: contact.avatar,
                            callType: 'audio',
                            isIncoming: false,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Voice call ${contact.name}`}
                      >
                        <Phone size={16} color="#4F46E5" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionCircle}
                        onPress={() => startDirectMutation.mutate(contact)}
                        accessibilityRole="button"
                        accessibilityLabel={`Message ${contact.name}`}
                      >
                        <MessageSquare size={16} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {activeTab === 'calls' && (
          <>
            {/* Quick action bar: New Call / Group Call */}
            <View style={styles.callsQuickBar}>
              <TouchableOpacity
                style={styles.callsNewBtn}
                onPress={() => setGroupSetupOpen(true)}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.callsNewBtnText}>New Call</Text>
              </TouchableOpacity>

              <View style={styles.callFilterRow}>
                <TouchableOpacity
                  style={[styles.callFilterChip, callFilter === 'all' && styles.callFilterChipActive]}
                  onPress={() => setCallFilter('all')}
                >
                  <Text style={[styles.callFilterText, callFilter === 'all' && styles.callFilterTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.callFilterChip, callFilter === 'missed' && styles.callFilterChipActive]}
                  onPress={() => setCallFilter('missed')}
                >
                  <Text style={[styles.callFilterText, callFilter === 'missed' && styles.callFilterTextActive]}>
                    Missed
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {callsQuery.isLoading ? (
              <WorkspaceLoadingBlock message="Loading call history..." />
            ) : callsQuery.isError ? (
              <WorkspaceErrorBlock
                message={(callsQuery.error as any)?.message || 'Failed to load call history.'}
                onRetry={() => callsQuery.refetch()}
              />
            ) : deduplicatedCalls.length === 0 ? (
              <WorkspaceEmptyBlock
                title={callFilter === 'missed' ? 'No Missed Calls' : 'No Call History'}
                description={
                  callFilter === 'missed'
                    ? 'You have caught up with all incoming team calls.'
                    : 'Audio and video calls with your team members will be logged here.'
                }
              />
            ) : (
              deduplicatedCalls.map((call) => {
                const isMissed = call.status === 'missed';
                const isIncoming = call.direction === 'incoming' || call.computedDirection === 'incoming';
                const isVideo = call.callType === 'video';
                const displayName = call.contactName || (isIncoming ? call.callerName : call.receiverName) || 'Colleague';
                let avatarUri = call.contactAvatarUrl || (isIncoming ? call.callerAvatarUrl : call.receiverAvatarUrl);
                if (avatarUri && avatarUri.includes('api.dicebear.com') && avatarUri.includes('/svg?')) {
                  avatarUri = avatarUri.replace('/svg?', '/png?');
                }
                const otherPartyId = call.otherUserId || (isIncoming ? call.callerId : call.receiverId);

                return (
                  <View key={call.id} style={styles.convCard}>
                    <View style={styles.avatarWrap}>
                      {avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                      ) : (
                        <View style={[styles.avatarCircle, isMissed && { backgroundColor: '#7F1D1D' }]}>
                          <Text style={styles.avatarInitials}>
                            {displayName.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.convDetails}>
                      <Text style={[styles.convName, isMissed && { color: '#EF4444' }]} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        {isMissed ? (
                          <PhoneMissed size={13} color="#EF4444" />
                        ) : isIncoming ? (
                          <PhoneIncoming size={13} color="#10B981" />
                        ) : (
                          <PhoneOutgoing size={13} color="#4F46E5" />
                        )}
                        <Text style={styles.convSnippet}>
                          {isMissed
                            ? 'Missed call'
                            : `${call.durationSeconds ? Math.floor(call.durationSeconds / 60) + 'm ' + (call.durationSeconds % 60) + 's' : 'Connected'} • ${
                                call.callTime ? new Date(call.callTime).toLocaleDateString() : ''
                              }`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.contactQuickActions}>
                      <TouchableOpacity
                        style={styles.quickActionCircle}
                        onPress={() =>
                          navigation.navigate('ChatCall', {
                            receiverId: otherPartyId,
                            receiverName: displayName,
                            receiverAvatar: avatarUri,
                            callType: isVideo ? 'video' : 'audio',
                            isIncoming: false,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Call back ${displayName}`}
                      >
                        {isVideo ? (
                          <Video size={16} color="#10B981" />
                        ) : (
                          <Phone size={16} color="#4F46E5" />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickActionCircle}
                        onPress={() => deleteCallMutation.mutate(call.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Delete call log"
                      >
                        <Trash2 size={15} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  </View>
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

      {/* Call Options Bottom Sheet */}
      <CallOptionsBottomSheet
        visible={!!callOptionsTarget}
        onClose={() => setCallOptionsTarget(null)}
        targetUserName={callOptionsTarget?.name || 'Colleague'}
        onSelectAudioCall={() => {
          if (callOptionsTarget) {
            navigation.navigate('ChatCall', {
              receiverId: callOptionsTarget.userId,
              receiverName: callOptionsTarget.name,
              receiverAvatar: callOptionsTarget.avatar,
              callType: 'audio',
              isIncoming: false,
            });
          }
        }}
        onSelectVideoCall={() => {
          if (callOptionsTarget) {
            navigation.navigate('ChatCall', {
              receiverId: callOptionsTarget.userId,
              receiverName: callOptionsTarget.name,
              receiverAvatar: callOptionsTarget.avatar,
              callType: 'video',
              isIncoming: false,
            });
          }
        }}
        onSelectGroupCall={() => {
          setGroupSetupOpen(true);
        }}
      />

      {/* Group Call Setup Modal */}
      <GroupCallSetupModal
        visible={groupSetupOpen}
        onClose={() => setGroupSetupOpen(false)}
        preselectedUserId={callOptionsTarget?.userId}
        onStartGroupCall={(cType, _selectedUserIds, gMeetingName) => {
          navigation.navigate('ChatCall', {
            callType: cType,
            receiverName: gMeetingName || 'Team Meeting',
            isGroupMeeting: true,
            initialStatus: 'connected',
          });
        }}
      />
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
  callsQuickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    marginBottom: 12,
  },
  callsNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  callsNewBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  callFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#1E293B',
  },
  callFilterChipActive: {
    backgroundColor: '#334155',
  },
  callFilterText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  callFilterTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
});
