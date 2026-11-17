import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Image,
  Switch,
  Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '../../../components/common/Text';
import { WorkspaceModuleShell } from '../../../components/workspace/WorkspaceModuleShell';
import { createTenantQueryKey } from '../../../app/providers/QueryProvider';
import { useAuthStore } from '../../../store/authStore';
import { usePermission } from '../../../hooks/usePermission';
import { realtimeManager } from '../../../core/realtime/realtimeManager';
import {
  formatFileSize,
  openOrShareAttachment,
} from '../../../core/storage/attachmentHelper';
import {
  ChatService,
  ChatMessage,
  ChatParticipant,
  UploadableFileDescriptor,
} from '../../../core/services/chatService';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥'];

export const ChatConversationDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();

  const {
    threadId = '',
    title = 'Conversation',
    type = 'direct',
    groupId: paramGroupId,
    otherParticipantId,
    isAnnouncementOnly: paramAnnouncementOnly,
  } = route.params || {};

  const isGroup = type === 'group' || type === 'announcement' || threadId.startsWith('group_');
  const resolvedGroupId =
    paramGroupId || (threadId.startsWith('group_') ? threadId.slice('group_'.length) : undefined);

  const user = useAuthStore((s) => s.user);
  const { activeRole } = usePermission();
  const currentUserId = user?.id || '';

  // Message state (supports cursor pagination + live socket merges)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Composer & Actions state
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyMessage, setReplyMessage] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [stagedAttachments, setStagedAttachments] = useState<UploadableFileDescriptor[]>([]);
  const [failedDrafts, setFailedDrafts] = useState<Array<{ tempId: string; text: string }>>([]);

  // Realtime UI indicators
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [activeGroupCallId, setActiveGroupCallId] = useState<string | null>(null);
  const [pinnedIdx, setPinnedIdx] = useState(0);

  // Thread search
  const [searchOpen, setSearchOpen] = useState(false);
  const [threadSearch, setThreadSearch] = useState('');

  // Modals
  const [actionTargetMsg, setActionTargetMsg] = useState<ChatMessage | null>(null);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardThreadIds, setForwardThreadIds] = useState<string[]>([]);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollAnonymous, setPollAnonymous] = useState(false);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Info & Group Admin Drawer
  const [infoOpen, setInfoOpen] = useState(false);
  const [addMembersModalOpen, setAddMembersModalOpen] = useState(false);
  const [selectedAddMemberIds, setSelectedAddMemberIds] = useState<string[]>([]);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editAnnouncementOnly, setEditAnnouncementOnly] = useState(false);
  const [memberActionTarget, setMemberActionTarget] = useState<ChatParticipant | null>(null);

  const scrollViewRef = useRef<any>(null);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Group details query (for permissions, members, announcement lock, mentions)
  const groupDetailQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'group-detail', resolvedGroupId || 'none']),
    queryFn: () => ChatService.getGroupDetails(resolvedGroupId!),
    enabled: Boolean(isGroup && resolvedGroupId),
  });

  // Contact profile query (for DM info drawer)
  const participantQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'participant', otherParticipantId || 'none']),
    queryFn: () => ChatService.getParticipantProfile(otherParticipantId!),
    enabled: Boolean(!isGroup && otherParticipantId && infoOpen),
  });

  // Shared files query (when info drawer open)
  const sharedFilesQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'thread-files', threadId]),
    queryFn: () => ChatService.getThreadFiles(threadId),
    enabled: Boolean(threadId && infoOpen),
  });

  // Group activity query (when info drawer open)
  const groupActivityQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'group-activity', resolvedGroupId || 'none']),
    queryFn: () => ChatService.getGroupActivity(resolvedGroupId!),
    enabled: Boolean(isGroup && resolvedGroupId && infoOpen),
  });

  // Conversations & contacts for Forward / Add Members modals
  const allConvsQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'conversations', 'active']),
    queryFn: () => ChatService.getConversations(),
    enabled: forwardModalOpen,
  });

  const contactsQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'contacts']),
    queryFn: () => ChatService.getContacts(),
    enabled: addMembersModalOpen,
  });

  const groupData = groupDetailQuery.data;
  useEffect(() => {
    if (groupData) {
      setEditGroupName(groupData.name);
      setEditGroupDesc(groupData.description || '');
      setEditAnnouncementOnly(groupData.isAnnouncementOnly);
    }
  }, [groupData]);

  // Compute group permissions (matches UnifiedChatApp & chat.routes.ts)
  const myGroupRole = useMemo(() => {
    if (!isGroup) return 'member';
    if (groupData?.ownerId === currentUserId) return 'owner';
    if (groupData?.myRole) return groupData.myRole;
    const found = groupData?.members?.find((m) => (m.userId || m.id) === currentUserId);
    return found?.role || 'member';
  }, [isGroup, groupData, currentUserId]);

  const isWorkspaceModerator = activeRole === 'tenant_admin' || activeRole === 'hr_admin';
  const canManageGroup =
    isGroup && (myGroupRole === 'owner' || myGroupRole === 'admin' || isWorkspaceModerator);
  const canModerateMembers = canManageGroup || (isGroup && myGroupRole === 'moderator');

  const effectiveAnnouncementOnly =
    groupData !== undefined ? groupData.isAnnouncementOnly : Boolean(paramAnnouncementOnly);
  const isAnnouncementRestricted =
    isGroup &&
    effectiveAnnouncementOnly &&
    myGroupRole !== 'owner' &&
    myGroupRole !== 'admin' &&
    !isWorkspaceModerator;

  // Initial thread message load
  const loadInitialMessages = useCallback(async () => {
    if (!threadId) return;
    try {
      setInitialLoading(true);
      setLoadError(null);
      const page = await ChatService.getMessagesPage(threadId, { limit: 25 });
      setMessages(page.messages);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      void ChatService.markThreadRead(threadId).catch(() => {});
      void queryClient.invalidateQueries({
        queryKey: createTenantQueryKey(['chat', 'conversations']),
      });
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load conversation messages.');
    } finally {
      setInitialLoading(false);
    }
  }, [threadId, queryClient]);

  useEffect(() => {
    void loadInitialMessages();
  }, [loadInitialMessages]);

  // Load older cursor page
  const handleLoadOlder = async () => {
    if (!threadId || !hasMore || !nextCursor || loadingOlder) return;
    try {
      setLoadingOlder(true);
      const olderPage = await ChatService.getMessagesPage(threadId, {
        limit: 25,
        before: nextCursor,
      });
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueOlder = olderPage.messages.filter((m) => !existingIds.has(m.id));
        return [...uniqueOlder, ...prev];
      });
      setNextCursor(olderPage.nextCursor);
      setHasMore(olderPage.hasMore);
    } catch (err: any) {
      Alert.alert('History Error', err?.message || 'Could not load older messages.');
    } finally {
      setLoadingOlder(false);
    }
  };

  // Join Socket.IO thread room & bind realtime thread listeners with strict cleanup
  useEffect(() => {
    if (!threadId) return;

    const leaveRoom = realtimeManager.joinChatThread(threadId);

    const unsubs = [
      realtimeManager.subscribe('chat:message', (payload) => {
        if (payload?.threadId && payload.threadId !== threadId) return;
        const incoming = payload?.message ? payload.message : payload;
        if (!incoming?.id) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          const normalized = {
            ...incoming,
            id: String(incoming.id),
            threadId: String(incoming.threadId || threadId),
            senderId: String(incoming.senderId || ''),
            senderName: String(incoming.senderName || 'Member'),
            content: String(incoming.content ?? ''),
            createdAt: incoming.createdAt || new Date().toISOString(),
          };
          return [...prev, normalized];
        });

        if (incoming.senderId && incoming.senderId !== currentUserId) {
          realtimeManager.emit('chat:delivered', {
            threadId,
            messageIds: [incoming.id],
          });
          void ChatService.markThreadRead(threadId).catch(() => {});
        }
      }),

      realtimeManager.subscribe('chat:message_edited', (payload) => {
        if (payload?.threadId && payload.threadId !== threadId) return;
        const updated = payload?.message || payload;
        const targetId = String(payload?.id || updated?.id || '');
        if (!targetId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetId
              ? { ...m, content: String(updated?.content ?? m.content), isEdited: true }
              : m
          )
        );
      }),

      realtimeManager.subscribe('chat:message_deleted', (payload) => {
        if (payload?.threadId && payload.threadId !== threadId) return;
        const targetId = String(payload?.id || '');
        if (!targetId) return;
        if (payload?.isDeletedForEveryone) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === targetId
                ? {
                    ...m,
                    isDeleted: true,
                    content: 'This message was deleted',
                    attachments: undefined,
                    poll: undefined,
                  }
                : m
            )
          );
        } else if (payload?.deletedForUserId === currentUserId) {
          setMessages((prev) => prev.filter((m) => m.id !== targetId));
        }
      }),

      realtimeManager.subscribe('chat:message_pinned', (payload) => {
        if (payload?.threadId && payload.threadId !== threadId) return;
        const targetId = String(payload?.id || payload?.message?.id || '');
        if (!targetId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetId ? { ...m, isPinned: Boolean(payload?.isPinned) } : m
          )
        );
      }),

      realtimeManager.subscribe('chat:reaction', (payload) => {
        if (payload?.threadId && payload.threadId !== threadId) return;
        void loadInitialMessages();
      }),

      realtimeManager.subscribe('chat:poll_updated', (payload) => {
        if (payload?.threadId && payload.threadId !== threadId) return;
        void loadInitialMessages();
      }),

      realtimeManager.subscribe('chat:typing', (payload) => {
        if (payload?.threadId !== threadId || payload?.userId === currentUserId) return;
        setTypingUsers((prev) => {
          const next = { ...prev };
          if (payload?.isTyping) {
            next[payload.userId] = payload.name || 'Colleague';
          } else {
            delete next[payload.userId];
          }
          return next;
        });
      }),

      realtimeManager.subscribe('chat:read', (payload) => {
        if (payload?.threadId !== threadId || payload?.userId === currentUserId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === currentUserId ? { ...m, deliveryStatus: 'read' } : m
          )
        );
      }),

      realtimeManager.subscribe('chat:delivered', (payload) => {
        if (payload?.threadId !== threadId || payload?.userId === currentUserId) return;
        const ids = new Set<string>((payload?.messageIds || []).map(String));
        setMessages((prev) =>
          prev.map((m) =>
            ids.has(m.id) && m.deliveryStatus !== 'read'
              ? { ...m, deliveryStatus: 'delivered' }
              : m
          )
        );
      }),

      realtimeManager.subscribe('chat:room_revoked', (payload) => {
        if (payload?.threadId === threadId) {
          Alert.alert('Access Revoked', 'You are no longer a member of this group.');
          navigation.goBack();
        }
      }),

      realtimeManager.subscribe('group-call:incoming', (payload) => {
        if (resolvedGroupId && payload?.groupId === resolvedGroupId && payload?.callId) {
          setActiveGroupCallId(String(payload.callId));
        }
      }),

      realtimeManager.subscribe('group-call:ended', (payload) => {
        if (payload?.callId && payload.callId === activeGroupCallId) {
          setActiveGroupCallId(null);
        }
      }),
    ];

    return () => {
      if (typingStopTimer.current) {
        clearTimeout(typingStopTimer.current);
      }
      realtimeManager.emit('chat:typing', { threadId, isTyping: false });
      leaveRoom();
      unsubs.forEach((u) => u());
    };
  }, [threadId, currentUserId, resolvedGroupId, activeGroupCallId, loadInitialMessages, navigation]);

  // Typing emitter
  const handleComposerChange = (val: string) => {
    setInputText(val);
    if (!threadId) return;
    realtimeManager.emit('chat:typing', { threadId, isTyping: val.trim().length > 0 });
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      realtimeManager.emit('chat:typing', { threadId, isTyping: false });
    }, 2200);
  };

  // @mention candidates in group composer
  const mentionQuery = useMemo(() => {
    if (!isGroup || !groupData?.members?.length) return null;
    const match = inputText.match(/@([a-zA-Z0-9_.\s]*)$/);
    if (!match) return null;
    const q = match[1].toLowerCase();
    return groupData.members
      .filter(
        (m) =>
          (m.userId || m.id) !== currentUserId &&
          m.name.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [isGroup, groupData?.members, inputText, currentUserId]);

  const insertMention = (member: ChatParticipant) => {
    const replaced = inputText.replace(/@([a-zA-Z0-9_.\s]*)$/, `@${member.name} `);
    setInputText(replaced);
  };

  // Send or Save Edit
  const handleSendOrEdit = async () => {
    const trimmed = inputText.trim();
    if ((!trimmed && stagedAttachments.length === 0) || sending) return;

    if (editingMessage) {
      try {
        setSending(true);
        const updated = await ChatService.editMessage(editingMessage.id, trimmed);
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setEditingMessage(null);
        setInputText('');
      } catch (err: any) {
        Alert.alert('Edit Failed', err?.message || 'Unable to edit message.');
      } finally {
        setSending(false);
      }
      return;
    }

    const clientTempId = `mob_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setInputText('');
    const replyId = replyMessage?.id;
    setReplyMessage(null);
    const toUpload = [...stagedAttachments];
    setStagedAttachments([]);

    try {
      setSending(true);
      let uploadedAttachments;
      if (toUpload.length > 0) {
        uploadedAttachments = await ChatService.uploadAttachments(toUpload, threadId);
      }

      const mentions: string[] = [];
      if (isGroup && groupData?.members) {
        for (const m of groupData.members) {
          if (trimmed.includes(`@${m.name}`)) {
            mentions.push(m.userId || m.id);
          }
        }
      }

      const sent = await ChatService.sendMessage({
        threadId,
        content: trimmed,
        replyToId: replyId,
        attachments: uploadedAttachments,
        mentions: mentions.length > 0 ? mentions : undefined,
        clientTempId,
      });

      setMessages((prev) =>
        prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]
      );
      void queryClient.invalidateQueries({
        queryKey: createTenantQueryKey(['chat', 'conversations']),
      });
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err: any) {
      if (trimmed) {
        setFailedDrafts((prev) => [...prev, { tempId: clientTempId, text: trimmed }]);
      }
      Alert.alert('Message Not Sent', err?.message || 'Network error. Saved to retry queue.');
    } finally {
      setSending(false);
    }
  };

  const retryFailedDraft = async (draft: { tempId: string; text: string }) => {
    setFailedDrafts((prev) => prev.filter((d) => d.tempId !== draft.tempId));
    try {
      const sent = await ChatService.sendMessage({
        threadId,
        content: draft.text,
        clientTempId: draft.tempId,
      });
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
    } catch (err: any) {
      setFailedDrafts((prev) => [...prev, draft]);
      Alert.alert('Retry Failed', err?.message || 'Still unable to reach server.');
    }
  };

  // Native file picker dynamic detection (safe across bare RN, custom dev client & Expo Go)
  const handlePickDocumentOrImage = async () => {
    setComposerMenuOpen(false);
    try {
      let dynRequire: any;
      try {
        // eslint-disable-next-line no-eval
        dynRequire = eval('require');
      } catch {
        dynRequire = null;
      }

      if (dynRequire) {
        try {
          const DocPicker = dynRequire('expo-document-picker');
          if (DocPicker?.getDocumentAsync) {
            const res = await DocPicker.getDocumentAsync({ copyToCacheDirectory: true });
            const asset = res?.assets?.[0];
            if (!res.canceled && asset?.uri) {
              setStagedAttachments((prev) => [
                ...prev,
                {
                  uri: asset.uri,
                  name: asset.name || 'document.pdf',
                  type: asset.mimeType || 'application/octet-stream',
                  size: asset.size,
                },
              ]);
              return;
            }
          }
        } catch {
          // Module not linked in current runtime
        }
      }

      Alert.alert(
        'Native File Picker Required',
        'Document/Image selection requires a native development build with document picker permissions enabled. Existing shared files and images can be viewed and downloaded directly in this thread.'
      );
    } catch (err: any) {
      Alert.alert('Attachment Error', err?.message || 'Unable to select attachment.');
    }
  };

  const handleVoiceNoteAction = () => {
    setComposerMenuOpen(false);
    Alert.alert(
      'Voice Recording Hardware',
      'Microphone voice note capture requires a native audio recording module (expo-av / native audio). Existing voice notes in this conversation can be opened and played directly.'
    );
  };

  // Create Poll submit
  const handleCreatePoll = async () => {
    const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || cleanOptions.length < 2) {
      Alert.alert('Poll Validation', 'Enter a question and at least 2 distinct options.');
      return;
    }
    try {
      setSending(true);
      const sent = await ChatService.sendMessage({
        threadId,
        content: `📊 Poll: ${pollQuestion.trim()}`,
        poll: {
          question: pollQuestion.trim(),
          options: cleanOptions,
          allowMultiple: pollAllowMultiple,
          isAnonymous: pollAnonymous,
        },
      });
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setPollModalOpen(false);
      setPollQuestion('');
      setPollOptions(['', '']);
    } catch (err: any) {
      Alert.alert('Poll Error', err?.message || 'Failed to publish poll.');
    } finally {
      setSending(false);
    }
  };

  // Message interactions
  const handleReaction = async (msgId: string, emoji: string) => {
    setActionTargetMsg(null);
    try {
      const updated = await ChatService.reactToMessage(msgId, emoji);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err: any) {
      Alert.alert('Reaction Error', err?.message || 'Unable to react to message.');
    }
  };

  const handleTogglePinMessage = async (msg: ChatMessage) => {
    setActionTargetMsg(null);
    try {
      const updated = await ChatService.pinMessage(msg.id);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err: any) {
      Alert.alert('Pin Error', err?.message || 'Unable to toggle pin.');
    }
  };

  const handleDeleteMessage = async (msg: ChatMessage, mode: 'me' | 'everyone') => {
    setActionTargetMsg(null);
    try {
      const res = await ChatService.deleteMessage(msg.id, mode);
      if (res.mode === 'everyone') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  isDeleted: true,
                  content: 'This message was deleted',
                  attachments: undefined,
                  poll: undefined,
                }
              : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }
    } catch (err: any) {
      Alert.alert('Delete Failed', err?.message || 'Unable to delete message.');
    }
  };

  const handleForwardSubmit = async () => {
    if (!actionTargetMsg || forwardThreadIds.length === 0) return;
    try {
      const res = await ChatService.forwardMessageBatch(actionTargetMsg.id, forwardThreadIds);
      setForwardModalOpen(false);
      setActionTargetMsg(null);
      setForwardThreadIds([]);
      Alert.alert('Forwarded', `Message forwarded to ${res.forwardedCount} conversation(s).`);
    } catch (err: any) {
      Alert.alert('Forward Error', err?.message || 'Unable to forward message.');
    }
  };

  const handleVotePoll = async (msgId: string, optionId: string) => {
    try {
      const updatedPoll = await ChatService.votePoll(msgId, optionId);
      if (updatedPoll) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, poll: updatedPoll } : m))
        );
      }
    } catch (err: any) {
      Alert.alert('Vote Error', err?.message || 'Unable to record vote.');
    }
  };

  const handleClosePoll = async (msgId: string) => {
    try {
      const closedPoll = await ChatService.closePoll(msgId);
      if (closedPoll) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, poll: closedPoll } : m))
        );
      }
    } catch (err: any) {
      Alert.alert('Close Poll Error', err?.message || 'Unable to close poll.');
    }
  };

  // Start Audio/Video Call or Group Meeting
  const handleStartCall = async (callType: 'audio' | 'video') => {
    if (isGroup && resolvedGroupId) {
      try {
        const started = await ChatService.startGroupMeeting({
          groupId: resolvedGroupId,
          callType,
        });
        navigation.navigate('ChatCall', {
          callId: started.callId,
          receiverName: groupData?.name || title,
          callType,
          threadId,
          groupId: resolvedGroupId,
          groupName: groupData?.name || title,
          isGroupMeeting: true,
          isIncoming: false,
        });
      } catch (err: any) {
        Alert.alert('Meeting Error', err?.message || 'Unable to start group meeting.');
      }
      return;
    }

    const peerId =
      otherParticipantId ||
      threadId
        .replace(/^direct_/, '')
        .split('_')
        .find((part: string) => part && part !== currentUserId);

    if (!peerId) {
      Alert.alert('Call Error', 'Recipient user ID could not be resolved for this thread.');
      return;
    }

    navigation.navigate('ChatCall', {
      receiverId: peerId,
      receiverName: title,
      callType,
      threadId,
      isGroupMeeting: false,
      isIncoming: false,
    });
  };

  // Group Admin mutations
  const handleSaveGroupInfo = async () => {
    if (!resolvedGroupId || !editGroupName.trim()) return;
    try {
      await ChatService.updateGroup(resolvedGroupId, {
        name: editGroupName.trim(),
        description: editGroupDesc.trim(),
        isAnnouncementOnly: editAnnouncementOnly,
      });
      await groupDetailQuery.refetch();
      Alert.alert('Saved', 'Group settings updated.');
    } catch (err: any) {
      Alert.alert('Update Error', err?.message || 'Unable to update group settings.');
    }
  };

  const handleGenerateInviteLink = async () => {
    if (!resolvedGroupId) return;
    try {
      const res = await ChatService.generateGroupInviteLink(resolvedGroupId);
      await groupDetailQuery.refetch();
      await Share.share({
        title: `Join ${groupData?.name || title}`,
        message: `Join our MasterHRMS workspace group "${groupData?.name || title}" using invite token: ${res.inviteToken}`,
      });
    } catch (err: any) {
      Alert.alert('Invite Link Error', err?.message || 'Unable to generate invite link.');
    }
  };

  const handleRevokeInviteLink = async () => {
    if (!resolvedGroupId) return;
    try {
      await ChatService.revokeGroupInviteLink(resolvedGroupId);
      await groupDetailQuery.refetch();
      Alert.alert('Revoked', 'Group invite link revoked.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to revoke invite link.');
    }
  };

  const handleAddGroupMembers = async () => {
    if (!resolvedGroupId || selectedAddMemberIds.length === 0) return;
    try {
      const count = await ChatService.addGroupMembers(resolvedGroupId, selectedAddMemberIds);
      setAddMembersModalOpen(false);
      setSelectedAddMemberIds([]);
      await groupDetailQuery.refetch();
      Alert.alert('Members Added', `${count} colleague(s) added to the group.`);
    } catch (err: any) {
      Alert.alert('Add Members Error', err?.message || 'Unable to add members.');
    }
  };

  const handleMemberRoleChange = async (
    target: ChatParticipant,
    role: 'admin' | 'moderator' | 'member'
  ) => {
    if (!resolvedGroupId) return;
    try {
      await ChatService.updateGroupMemberRole(resolvedGroupId, target.userId || target.id, role);
      setMemberActionTarget(null);
      await groupDetailQuery.refetch();
    } catch (err: any) {
      Alert.alert('Role Update Failed', err?.message || 'Unable to change member role.');
    }
  };

  const handleTransferOwnership = async (target: ChatParticipant) => {
    if (!resolvedGroupId) return;
    try {
      await ChatService.transferGroupOwnership(resolvedGroupId, target.userId || target.id);
      setMemberActionTarget(null);
      await groupDetailQuery.refetch();
      Alert.alert('Ownership Transferred', `${target.name} is now the group owner.`);
    } catch (err: any) {
      Alert.alert('Transfer Failed', err?.message || 'Unable to transfer ownership.');
    }
  };

  const handleRemoveMember = async (target: ChatParticipant) => {
    if (!resolvedGroupId) return;
    try {
      await ChatService.removeGroupMember(resolvedGroupId, target.userId || target.id);
      setMemberActionTarget(null);
      await groupDetailQuery.refetch();
    } catch (err: any) {
      Alert.alert('Remove Failed', err?.message || 'Unable to remove member.');
    }
  };

  const handleLeaveGroup = () => {
    if (!resolvedGroupId) return;
    Alert.alert('Leave Group', `Leave "${groupData?.name || title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await ChatService.leaveGroup(resolvedGroupId);
            setInfoOpen(false);
            navigation.goBack();
          } catch (err: any) {
            Alert.alert('Cannot Leave Group', err?.message || 'Transfer ownership before leaving.');
          }
        },
      },
    ]);
  };

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned && !m.isDeleted),
    [messages]
  );

  const displayedMessages = useMemo(() => {
    if (!threadSearch.trim()) return messages;
    const q = threadSearch.trim().toLowerCase();
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q)
    );
  }, [messages, threadSearch]);

  const typingNames = Object.values(typingUsers);
  const subtitleText =
    typingNames.length > 0
      ? `${typingNames.join(', ')} typing...`
      : isGroup
      ? `${groupData?.memberCount ?? groupData?.members?.length ?? ''} members${
          effectiveAnnouncementOnly ? ' • Announcement' : ''
        }`
      : 'Direct Conversation';

  const canEditTarget = Boolean(
    actionTargetMsg &&
      actionTargetMsg.senderId === currentUserId &&
      !actionTargetMsg.isDeleted &&
      !actionTargetMsg.poll &&
      Date.now() - new Date(actionTargetMsg.createdAt).getTime() < 24 * 60 * 60 * 1000
  );

  const canDeleteEveryoneTarget = Boolean(
    actionTargetMsg &&
      !actionTargetMsg.isDeleted &&
      ((actionTargetMsg.senderId === currentUserId &&
        Date.now() - new Date(actionTargetMsg.createdAt).getTime() < 24 * 60 * 60 * 1000) ||
        canModerateMembers)
  );

  return (
    <WorkspaceModuleShell
      activeModule="chat"
      hideModuleTabs
      title={groupData?.name || title}
      subtitle={subtitleText}
      rightActions={
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setSearchOpen((s) => !s)}
            accessibilityRole="button"
            accessibilityLabel="Search in conversation"
          >
            <Text style={styles.iconBtnText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleStartCall('audio')}
            accessibilityRole="button"
            accessibilityLabel="Start audio call"
          >
            <Text style={styles.iconBtnText}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleStartCall('video')}
            accessibilityRole="button"
            accessibilityLabel="Start video call"
          >
            <Text style={styles.iconBtnText}>📹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setInfoOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Conversation info"
          >
            <Text style={styles.iconBtnText}>ⓘ</Text>
          </TouchableOpacity>
        </View>
      }
      subHeader={
        <>
          {searchOpen && (
            <View style={styles.inThreadSearchBar}>
              <TextInput
                style={styles.inThreadSearchInput}
                placeholder="Filter messages in this thread..."
                placeholderTextColor="#94A3B8"
                value={threadSearch}
                onChangeText={setThreadSearch}
                autoFocus
              />
              <TouchableOpacity
                onPress={() => {
                  setThreadSearch('');
                  setSearchOpen(false);
                }}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeGroupCallId && (
            <TouchableOpacity
              style={styles.activeMeetingBanner}
              onPress={() =>
                navigation.navigate('ChatCall', {
                  callId: activeGroupCallId,
                  receiverName: groupData?.name || title,
                  callType: 'video',
                  threadId,
                  groupId: resolvedGroupId,
                  groupName: groupData?.name || title,
                  isGroupMeeting: true,
                  isIncoming: true,
                })
              }
            >
              <Text style={styles.activeMeetingText}>
                🟢 Ongoing Group Meeting — Tap to Join
              </Text>
            </TouchableOpacity>
          )}

          {pinnedMessages.length > 0 && (
            <TouchableOpacity
              style={styles.pinnedBar}
              onPress={() => setPinnedIdx((i) => (i + 1) % pinnedMessages.length)}
            >
              <Text style={styles.pinEmoji}>📌</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pinnedAuthor}>
                  Pinned ({(pinnedIdx % pinnedMessages.length) + 1}/{pinnedMessages.length}) •{' '}
                  {pinnedMessages[pinnedIdx % pinnedMessages.length]?.senderName}
                </Text>
                <Text style={styles.pinnedPreview} numberOfLines={1}>
                  {pinnedMessages[pinnedIdx % pinnedMessages.length]?.content}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </>
      }
    >
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messagesScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Load Older Cursor Button */}
          {hasMore && !threadSearch && (
            <TouchableOpacity
              style={styles.loadOlderBtn}
              onPress={handleLoadOlder}
              disabled={loadingOlder}
            >
              {loadingOlder ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <Text style={styles.loadOlderText}>↑ Load older messages</Text>
              )}
            </TouchableOpacity>
          )}

          {initialLoading ? (
            <ActivityIndicator color="#4F46E5" style={{ marginTop: 48 }} />
          ) : loadError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{loadError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadInitialMessages}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : displayedMessages.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>👋</Text>
              <Text style={styles.emptyLabel}>
                {threadSearch ? 'No matching messages in thread.' : 'No messages yet — say hello!'}
              </Text>
            </View>
          ) : (
            displayedMessages.map((msg) => {
              if (msg.isSystemEvent) {
                return (
                  <View key={msg.id} style={styles.systemPill}>
                    <Text style={styles.systemPillText}>{msg.content}</Text>
                  </View>
                );
              }

              const isMe = msg.senderId === currentUserId;
              return (
                <View
                  key={msg.id}
                  style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onLongPress={() => !msg.isDeleted && setActionTargetMsg(msg)}
                    style={[
                      styles.bubble,
                      isMe ? styles.bubbleMe : styles.bubbleThem,
                      msg.isDeleted && styles.bubbleDeleted,
                    ]}
                  >
                    {!isMe && isGroup && (
                      <Text style={styles.senderLabel}>{msg.senderName}</Text>
                    )}

                    {msg.isForwarded && !msg.isDeleted && (
                      <Text style={[styles.forwardedTag, isMe && { color: '#E0E7FF' }]}>
                        ↪ Forwarded
                      </Text>
                    )}

                    {msg.replyTo && !msg.isDeleted && (
                      <View style={styles.replyQuoteBox}>
                        <Text style={styles.replyQuoteAuthor}>{msg.replyTo.senderName}</Text>
                        <Text style={styles.replyQuoteBody} numberOfLines={2}>
                          {msg.replyTo.content}
                        </Text>
                      </View>
                    )}

                    {msg.content ? (
                      <Text
                        style={[
                          styles.msgBody,
                          isMe ? styles.msgBodyMe : styles.msgBodyThem,
                          msg.isDeleted && styles.deletedItalic,
                        ]}
                      >
                        {msg.content}
                      </Text>
                    ) : null}

                    {/* Attachments */}
                    {msg.attachments &&
                      msg.attachments.map((att) => (
                        <TouchableOpacity
                          key={att.id}
                          style={styles.attachmentCard}
                          onPress={() => {
                            if (att.kind === 'image' && att.url) {
                              setLightboxUrl(att.url);
                            } else {
                              openOrShareAttachment({
                                url: att.signedDownloadUrl || att.url,
                                mediaId: att.mediaId,
                                fileName: att.name,
                              }).catch((e) => Alert.alert('Attachment', e.message));
                            }
                          }}
                        >
                          {att.kind === 'image' && att.url ? (
                            <Image
                              source={{ uri: att.url }}
                              style={styles.attachmentThumb}
                              resizeMode="cover"
                            />
                          ) : null}
                          <Text style={styles.attachmentName} numberOfLines={1}>
                            {att.kind === 'pdf' ? '📄 ' : att.kind === 'audio' ? '🎵 ' : '📎 '}
                            {att.name}
                            {att.size ? ` (${formatFileSize(att.size)})` : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}

                    {/* Voice Note */}
                    {msg.voiceNote && (
                      <TouchableOpacity
                        style={styles.voiceNoteCard}
                        onPress={() =>
                          openOrShareAttachment({
                            url: msg.voiceNote?.url,
                            mediaId: msg.voiceNote?.mediaId,
                            fileName: 'Voice Note',
                          }).catch((e) => Alert.alert('Voice Note', e.message))
                        }
                      >
                        <Text style={styles.voiceNoteText}>
                          🎙️ Voice Note • {Math.round(msg.voiceNote.durationSeconds || 0)}s (Tap to play)
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Poll Card */}
                    {msg.poll && (
                      <View style={styles.pollBox}>
                        <Text style={[styles.pollTitle, isMe && { color: '#FFFFFF' }]}>
                          📊 {msg.poll.question}
                        </Text>
                        {msg.poll.options.map((opt) => {
                          const totalVotes = msg.poll!.options.reduce(
                            (sum, o) => sum + (o.votes || 0),
                            0
                          );
                          const pct =
                            totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                          const voted = opt.voters?.includes(currentUserId);
                          return (
                            <TouchableOpacity
                              key={opt.id}
                              style={[styles.pollOpt, voted && styles.pollOptVoted]}
                              disabled={msg.poll?.closed}
                              onPress={() => handleVotePoll(msg.id, opt.id)}
                            >
                              <Text style={styles.pollOptLabel}>
                                {voted ? '✓ ' : ''}
                                {opt.text}
                              </Text>
                              <Text style={styles.pollOptStat}>
                                {opt.votes} ({pct}%)
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                        <View style={styles.pollFooter}>
                          <Text style={[styles.pollMetaText, isMe && { color: '#C7D2FE' }]}>
                            {msg.poll.closed ? 'Poll Closed' : 'Tap option to vote'}
                          </Text>
                          {!msg.poll.closed &&
                            (msg.senderId === currentUserId || canManageGroup) && (
                              <TouchableOpacity onPress={() => handleClosePoll(msg.id)}>
                                <Text style={styles.closePollLink}>Close Poll</Text>
                              </TouchableOpacity>
                            )}
                        </View>
                      </View>
                    )}

                    {/* Timestamp + Edited + Delivery/Read Receipt */}
                    <View style={styles.metaFooter}>
                      {msg.isPinned && <Text style={styles.pinTiny}>📌 </Text>}
                      {msg.isEdited && !msg.isDeleted && (
                        <Text style={[styles.timeText, isMe && styles.timeTextMe]}>edited • </Text>
                      )}
                      <Text style={[styles.timeText, isMe && styles.timeTextMe]}>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      {isMe && !msg.isDeleted && (
                        <Text
                          style={[
                            styles.tickText,
                            msg.deliveryStatus === 'read' && styles.tickRead,
                          ]}
                        >
                          {msg.deliveryStatus === 'read' || msg.deliveryStatus === 'delivered'
                            ? ' ✓✓'
                            : ' ✓'}
                        </Text>
                      )}
                    </View>

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <View style={styles.reactionsWrap}>
                        {msg.reactions.map((r) => (
                          <TouchableOpacity
                            key={r.emoji}
                            style={styles.reactionPill}
                            onPress={() => handleReaction(msg.id, r.emoji)}
                          >
                            <Text style={styles.reactionPillText}>
                              {r.emoji} {r.count}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          {/* Failed Drafts Queue (No Fake Delivery) */}
          {failedDrafts.map((d) => (
            <View key={d.tempId} style={styles.failedDraftCard}>
              <Text style={styles.failedDraftText} numberOfLines={2}>
                ⚠️ Not delivered: {d.text}
              </Text>
              <View style={styles.failedDraftBtns}>
                <TouchableOpacity onPress={() => retryFailedDraft(d)}>
                  <Text style={styles.retryLink}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setFailedDrafts((prev) => prev.filter((x) => x.tempId !== d.tempId))
                  }
                >
                  <Text style={styles.discardLink}>Discard</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* @Mention Autocomplete Strip */}
        {mentionQuery && mentionQuery.length > 0 && (
          <View style={styles.mentionStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {mentionQuery.map((m) => (
                <TouchableOpacity
                  key={m.userId || m.id}
                  style={styles.mentionChip}
                  onPress={() => insertMention(m)}
                >
                  <Text style={styles.mentionChipText}>@{m.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Reply / Edit Banner */}
        {(replyMessage || editingMessage) && (
          <View style={styles.replyEditBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.replyEditTitle}>
                {editingMessage
                  ? '✏️ Editing message'
                  : `↩ Replying to ${replyMessage?.senderName}`}
              </Text>
              <Text style={styles.replyEditSnippet} numberOfLines={1}>
                {editingMessage ? editingMessage.content : replyMessage?.content}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setReplyMessage(null);
                setEditingMessage(null);
                if (editingMessage) setInputText('');
              }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Staged Attachments Strip */}
        {stagedAttachments.length > 0 && (
          <View style={styles.stagedStrip}>
            {stagedAttachments.map((f, idx) => (
              <View key={`${f.name}-${idx}`} style={styles.stagedChip}>
                <Text style={styles.stagedChipText} numberOfLines={1}>
                  📎 {f.name}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setStagedAttachments((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  <Text style={styles.closeText}> ✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Composer or Announcement-Only Lock Banner */}
        {isAnnouncementRestricted ? (
          <View style={styles.announcementLockBar}>
            <Text style={styles.announcementLockText}>
              📢 Only group owners and administrators can post in this announcement channel.
            </Text>
          </View>
        ) : (
          <View style={styles.composerRow}>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={() => setComposerMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Attachments, polls and voice notes"
            >
              <Text style={styles.attachBtnText}>＋</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.composerInput}
              placeholder={isGroup ? 'Message group (@ to mention)...' : 'Write a message...'}
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={handleComposerChange}
              multiline
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                !inputText.trim() && stagedAttachments.length === 0 && styles.sendBtnDisabled,
              ]}
              onPress={handleSendOrEdit}
              disabled={(!inputText.trim() && stagedAttachments.length === 0) || sending}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendBtnIcon}>{editingMessage ? '✓' : '➤'}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Composer Plus Menu (Attachment / Poll / Voice Note) */}
      <Modal visible={composerMenuOpen} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setComposerMenuOpen(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Share in Conversation</Text>
            <TouchableOpacity style={styles.sheetItem} onPress={handlePickDocumentOrImage}>
              <Text style={styles.sheetItemText}>📎 Attach Image, PDF or Document</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setComposerMenuOpen(false);
                setPollModalOpen(true);
              }}
            >
              <Text style={styles.sheetItemText}>📊 Create Interactive Poll</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetItem} onPress={handleVoiceNoteAction}>
              <Text style={styles.sheetItemText}>🎙️ Record Voice Note</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Message Long-Press Action Modal */}
      <Modal visible={!!actionTargetMsg && !forwardModalOpen} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setActionTargetMsg(null)}
        >
          <View style={styles.sheet}>
            {actionTargetMsg && (
              <>
                <View style={styles.quickEmojiRow}>
                  {QUICK_REACTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.quickEmojiBtn}
                      onPress={() => handleReaction(actionTargetMsg.id, emoji)}
                    >
                      <Text style={styles.quickEmojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => {
                    setReplyMessage(actionTargetMsg);
                    setActionTargetMsg(null);
                  }}
                >
                  <Text style={styles.sheetItemText}>↩ Reply</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => setForwardModalOpen(true)}
                >
                  <Text style={styles.sheetItemText}>↪ Forward to Chats...</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => handleTogglePinMessage(actionTargetMsg)}
                >
                  <Text style={styles.sheetItemText}>
                    {actionTargetMsg.isPinned ? '📌 Unpin Message' : '📌 Pin Message'}
                  </Text>
                </TouchableOpacity>

                {canEditTarget && (
                  <TouchableOpacity
                    style={styles.sheetItem}
                    onPress={() => {
                      setEditingMessage(actionTargetMsg);
                      setInputText(actionTargetMsg.content);
                      setActionTargetMsg(null);
                    }}
                  >
                    <Text style={styles.sheetItemText}>✏️ Edit Message</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => handleDeleteMessage(actionTargetMsg, 'me')}
                >
                  <Text style={[styles.sheetItemText, { color: '#DC2626' }]}>
                    🗑️ Delete for Me
                  </Text>
                </TouchableOpacity>

                {canDeleteEveryoneTarget && (
                  <TouchableOpacity
                    style={styles.sheetItem}
                    onPress={() => handleDeleteMessage(actionTargetMsg, 'everyone')}
                  >
                    <Text style={[styles.sheetItemText, { color: '#DC2626' }]}>
                      🗑️ Delete for Everyone
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Forward Batch Modal */}
      <Modal visible={forwardModalOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { maxHeight: '80%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Forward Message</Text>
              <TouchableOpacity
                onPress={() => {
                  setForwardModalOpen(false);
                  setActionTargetMsg(null);
                }}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {(allConvsQuery.data || []).map((c) => {
                const chosen = forwardThreadIds.includes(c.threadId);
                return (
                  <TouchableOpacity
                    key={c.threadId}
                    style={styles.sheetItem}
                    onPress={() =>
                      setForwardThreadIds((prev) =>
                        prev.includes(c.threadId)
                          ? prev.filter((x) => x !== c.threadId)
                          : [...prev, c.threadId]
                      )
                    }
                  >
                    <Text style={styles.sheetItemText}>
                      {chosen ? '☑️ ' : '⬜ '}
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.primaryBtn}
              disabled={forwardThreadIds.length === 0}
              onPress={handleForwardSubmit}
            >
              <Text style={styles.primaryBtnText}>
                Forward ({forwardThreadIds.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Poll Modal */}
      <Modal visible={pollModalOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { maxHeight: '85%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Create Poll</Text>
              <TouchableOpacity onPress={() => setPollModalOpen(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.fieldLabel}>Question *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ask a question..."
                placeholderTextColor="#94A3B8"
                value={pollQuestion}
                onChangeText={setPollQuestion}
              />
              <Text style={styles.fieldLabel}>Options (2–6)</Text>
              {pollOptions.map((opt, idx) => (
                <TextInput
                  key={idx}
                  style={styles.input}
                  placeholder={`Option ${idx + 1}`}
                  placeholderTextColor="#94A3B8"
                  value={opt}
                  onChangeText={(val) =>
                    setPollOptions((prev) => prev.map((o, i) => (i === idx ? val : o)))
                  }
                />
              ))}
              {pollOptions.length < 6 && (
                <TouchableOpacity
                  onPress={() => setPollOptions((prev) => [...prev, ''])}
                  style={{ marginBottom: 10 }}
                >
                  <Text style={styles.linkText}>+ Add Another Option</Text>
                </TouchableOpacity>
              )}
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Allow Multiple Answers</Text>
                <Switch value={pollAllowMultiple} onValueChange={setPollAllowMultiple} />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Anonymous Voting</Text>
                <Switch value={pollAnonymous} onValueChange={setPollAnonymous} />
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreatePoll}>
                <Text style={styles.primaryBtnText}>Publish Poll</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image Lightbox Modal */}
      <Modal visible={!!lightboxUrl} animationType="fade" transparent>
        <View style={styles.lightboxBackdrop}>
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={() => setLightboxUrl(null)}
          >
            <Text style={styles.lightboxCloseText}>✕ Close</Text>
          </TouchableOpacity>
          {lightboxUrl && (
            <Image
              source={{ uri: lightboxUrl }}
              style={styles.lightboxImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Contact Info / Group Administration Drawer */}
      <Modal visible={infoOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {isGroup ? 'Group Info & Administration' : 'Contact Details'}
              </Text>
              <TouchableOpacity onPress={() => setInfoOpen(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!isGroup ? (
                participantQuery.isLoading ? (
                  <ActivityIndicator color="#4F46E5" style={{ marginVertical: 20 }} />
                ) : participantQuery.data ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.profileTitle}>{participantQuery.data.name}</Text>
                    <Text style={styles.profileMeta}>
                      {participantQuery.data.designation || 'Team Member'}
                      {participantQuery.data.department
                        ? ` • ${participantQuery.data.department}`
                        : ''}
                    </Text>
                    <Text style={styles.profileMeta}>📧 {participantQuery.data.email}</Text>
                    {participantQuery.data.phone && (
                      <Text style={styles.profileMeta}>📱 {participantQuery.data.phone}</Text>
                    )}
                    {participantQuery.data.employeeCode && (
                      <Text style={styles.profileMeta}>
                        🆔 Code: {participantQuery.data.employeeCode}
                      </Text>
                    )}
                    {participantQuery.data.branch && (
                      <Text style={styles.profileMeta}>🏢 Branch: {participantQuery.data.branch}</Text>
                    )}
                    {participantQuery.data.managerName && (
                      <Text style={styles.profileMeta}>
                        👤 Manager: {participantQuery.data.managerName}
                      </Text>
                    )}
                  </View>
                ) : null
              ) : (
                <View style={{ marginBottom: 16 }}>
                  {canManageGroup ? (
                    <>
                      <Text style={styles.fieldLabel}>Group Name</Text>
                      <TextInput
                        style={styles.input}
                        value={editGroupName}
                        onChangeText={setEditGroupName}
                      />
                      <Text style={styles.fieldLabel}>Description</Text>
                      <TextInput
                        style={styles.input}
                        value={editGroupDesc}
                        onChangeText={setEditGroupDesc}
                      />
                      <View style={styles.switchRow}>
                        <Text style={styles.fieldLabel}>Announcement-Only</Text>
                        <Switch
                          value={editAnnouncementOnly}
                          onValueChange={setEditAnnouncementOnly}
                        />
                      </View>
                      <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveGroupInfo}>
                        <Text style={styles.primaryBtnText}>Save Group Settings</Text>
                      </TouchableOpacity>

                      <View style={styles.inviteBtnRow}>
                        <TouchableOpacity
                          style={styles.secondaryBtn}
                          onPress={handleGenerateInviteLink}
                        >
                          <Text style={styles.secondaryBtnText}>🔗 Generate/Share Invite</Text>
                        </TouchableOpacity>
                        {groupData?.hasActiveInvite && (
                          <TouchableOpacity
                            style={styles.dangerBtnSmall}
                            onPress={handleRevokeInviteLink}
                          >
                            <Text style={styles.dangerBtnSmallText}>Revoke Link</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.profileTitle}>{groupData?.name || title}</Text>
                      {groupData?.description ? (
                        <Text style={styles.profileMeta}>{groupData.description}</Text>
                      ) : null}
                    </>
                  )}

                  {/* Group Members Roster */}
                  <View style={[styles.sheetHeader, { marginTop: 16 }]}>
                    <Text style={styles.fieldLabel}>
                      Members ({groupData?.members?.length || 0})
                    </Text>
                    {canModerateMembers && (
                      <TouchableOpacity onPress={() => setAddMembersModalOpen(true)}>
                        <Text style={styles.linkText}>+ Add People</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {(groupData?.members || []).map((m) => (
                    <TouchableOpacity
                      key={m.userId || m.id}
                      style={styles.memberRow}
                      disabled={!canModerateMembers || (m.userId || m.id) === currentUserId}
                      onPress={() => setMemberActionTarget(m)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>
                          {m.name} {(m.userId || m.id) === currentUserId ? '(You)' : ''}
                        </Text>
                        <Text style={styles.profileMeta}>
                          {m.designation || m.department || m.email}
                        </Text>
                      </View>
                      <View style={styles.rolePill}>
                        <Text style={styles.rolePillText}>
                          {(m.role || 'member').toUpperCase()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {/* Recent Group Activity */}
                  {(groupActivityQuery.data || []).length > 0 && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.fieldLabel}>Recent Group Activity</Text>
                      {(groupActivityQuery.data || []).slice(0, 6).map((ev) => (
                        <Text key={ev.id} style={styles.profileMeta}>
                          • {ev.content}
                        </Text>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup}>
                    <Text style={styles.leaveBtnText}>Leave Group</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Shared Media & Documents */}
              <Text style={styles.fieldLabel}>
                Shared Files ({(sharedFilesQuery.data || []).length})
              </Text>
              {(sharedFilesQuery.data || []).length === 0 ? (
                <Text style={styles.profileMeta}>No shared files in this conversation yet.</Text>
              ) : (
                (sharedFilesQuery.data || []).map((file) => (
                  <TouchableOpacity
                    key={file.id}
                    style={styles.sheetItem}
                    onPress={() =>
                      openOrShareAttachment({
                        url: file.url,
                        mediaId: file.mediaId,
                        fileName: file.name,
                      }).catch((e) => Alert.alert('File', e.message))
                    }
                  >
                    <Text style={styles.sheetItemText} numberOfLines={1}>
                      📎 {file.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Member Role / Moderation Action Modal */}
      <Modal visible={!!memberActionTarget} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setMemberActionTarget(null)}
        >
          <View style={styles.sheet}>
            {memberActionTarget && (
              <>
                <Text style={styles.sheetTitle}>{memberActionTarget.name}</Text>
                {canManageGroup && (
                  <>
                    <TouchableOpacity
                      style={styles.sheetItem}
                      onPress={() =>
                        handleMemberRoleChange(
                          memberActionTarget,
                          memberActionTarget.role === 'admin' ? 'member' : 'admin'
                        )
                      }
                    >
                      <Text style={styles.sheetItemText}>
                        {memberActionTarget.role === 'admin'
                          ? 'Demote from Admin'
                          : 'Promote to Group Admin'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sheetItem}
                      onPress={() =>
                        handleMemberRoleChange(
                          memberActionTarget,
                          memberActionTarget.role === 'moderator' ? 'member' : 'moderator'
                        )
                      }
                    >
                      <Text style={styles.sheetItemText}>
                        {memberActionTarget.role === 'moderator'
                          ? 'Remove Moderator Role'
                          : 'Make Moderator'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                {(myGroupRole === 'owner' || isWorkspaceModerator) && (
                  <TouchableOpacity
                    style={styles.sheetItem}
                    onPress={() => handleTransferOwnership(memberActionTarget)}
                  >
                    <Text style={styles.sheetItemText}>👑 Transfer Group Ownership</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => handleRemoveMember(memberActionTarget)}
                >
                  <Text style={[styles.sheetItemText, { color: '#DC2626' }]}>
                    Remove from Group
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Group Members Modal */}
      <Modal visible={addMembersModalOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { maxHeight: '80%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add Group Members</Text>
              <TouchableOpacity onPress={() => setAddMembersModalOpen(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {(contactsQuery.data || [])
                .filter(
                  (c) =>
                    !(groupData?.members || []).some(
                      (gm) => (gm.userId || gm.id) === c.userId
                    )
                )
                .map((c) => {
                  const chosen = selectedAddMemberIds.includes(c.userId);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.sheetItem}
                      onPress={() =>
                        setSelectedAddMemberIds((prev) =>
                          prev.includes(c.userId)
                            ? prev.filter((id) => id !== c.userId)
                            : [...prev, c.userId]
                        )
                      }
                    >
                      <Text style={styles.sheetItemText}>
                        {chosen ? '☑️ ' : '⬜ '}
                        {c.name} ({c.department || c.email})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
            <TouchableOpacity
              style={styles.primaryBtn}
              disabled={selectedAddMemberIds.length === 0}
              onPress={handleAddGroupMembers}
            >
              <Text style={styles.primaryBtnText}>
                Add Selected ({selectedAddMemberIds.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </WorkspaceModuleShell>
  );
};

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  inThreadSearchBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  inThreadSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 6,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    paddingHorizontal: 8,
  },
  activeMeetingBanner: {
    backgroundColor: '#065F46',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  activeMeetingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pinnedBar: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#C7D2FE',
  },
  pinEmoji: {
    fontSize: 15,
    marginRight: 8,
  },
  pinnedAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  pinnedPreview: {
    fontSize: 12,
    color: '#334155',
  },
  messagesScroll: {
    padding: 14,
    paddingBottom: 20,
  },
  loadOlderBtn: {
    alignSelf: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
  },
  loadOlderText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyEmoji: {
    fontSize: 42,
    marginBottom: 8,
  },
  emptyLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  systemPill: {
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: 6,
  },
  systemPillText: {
    fontSize: 11,
    color: '#475569',
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  bubbleMe: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },
  bubbleDeleted: {
    opacity: 0.75,
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 3,
  },
  forwardedTag: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#64748B',
    marginBottom: 3,
  },
  replyQuoteBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#818CF8',
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
  },
  replyQuoteAuthor: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E0E7FF',
  },
  replyQuoteBody: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  msgBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgBodyMe: {
    color: '#FFFFFF',
  },
  msgBodyThem: {
    color: '#0F172A',
  },
  deletedItalic: {
    fontStyle: 'italic',
  },
  attachmentCard: {
    marginTop: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 10,
    padding: 8,
  },
  attachmentThumb: {
    width: 190,
    height: 120,
    borderRadius: 8,
    marginBottom: 6,
  },
  attachmentName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  voiceNoteCard: {
    marginTop: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 10,
    padding: 8,
  },
  voiceNoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  pollBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.3)',
  },
  pollTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  pollOpt: {
    backgroundColor: 'rgba(241, 245, 249, 0.92)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  pollOptVoted: {
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  pollOptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  pollOptStat: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  pollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  pollMetaText: {
    fontSize: 10,
    color: '#64748B',
  },
  closePollLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FCD34D',
  },
  metaFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  pinTiny: {
    fontSize: 10,
  },
  timeText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  timeTextMe: {
    color: '#C7D2FE',
  },
  tickText: {
    fontSize: 10,
    color: '#C7D2FE',
    fontWeight: '700',
  },
  tickRead: {
    color: '#6EE7B7',
  },
  reactionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 5,
  },
  reactionPill: {
    backgroundColor: 'rgba(241, 245, 249, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reactionPillText: {
    fontSize: 11,
    color: '#0F172A',
  },
  failedDraftCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  failedDraftText: {
    fontSize: 12,
    color: '#991B1B',
  },
  failedDraftBtns: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
  },
  retryLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  discardLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  mentionStrip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#C7D2FE',
  },
  mentionChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
  },
  mentionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  replyEditBanner: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#C7D2FE',
  },
  replyEditTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  replyEditSnippet: {
    fontSize: 12,
    color: '#334155',
  },
  stagedStrip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stagedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stagedChipText: {
    fontSize: 11,
    color: '#0F172A',
    maxWidth: 180,
  },
  announcementLockBar: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  announcementLockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
  },
  composerRow: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4F46E5',
  },
  composerInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendBtnIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  sheetItem: {
    minHeight: 46,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  quickEmojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  quickEmojiBtn: {
    padding: 6,
  },
  quickEmojiText: {
    fontSize: 22,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    minHeight: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  primaryBtn: {
    minHeight: 46,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 42,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  secondaryBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  inviteBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  dangerBtnSmall: {
    minHeight: 42,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  dangerBtnSmallText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  profileTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  profileMeta: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  memberRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  rolePill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  leaveBtn: {
    minHeight: 44,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  leaveBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  lightboxCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  lightboxImg: {
    width: '94%',
    height: '75%',
  },
});
