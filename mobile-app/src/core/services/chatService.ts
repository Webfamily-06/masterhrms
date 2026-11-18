import { apiClient } from '../api/apiClient';
import {
  classifyAttachmentKind,
  MAX_CHAT_ATTACHMENTS_PER_MESSAGE,
  resolveSafeBackendUrl,
  validateChatAttachmentCandidate,
} from '../storage/attachmentHelper';

export interface ChatParticipant {
  id: string;
  userId?: string;
  name: string;
  avatar?: string;
  email?: string;
  role?: 'owner' | 'admin' | 'moderator' | 'member' | string;
  department?: string;
  designation?: string;
  online?: boolean;
}

export interface ChatAttachment {
  id: string;
  mediaId?: string;
  name: string;
  url: string;
  signedDownloadUrl?: string;
  signedPreviewUrl?: string;
  mimeType?: string;
  kind: 'image' | 'pdf' | 'audio' | 'video' | 'file';
  size?: number;
}

export interface ChatVoiceNote {
  mediaId?: string;
  url: string;
  durationSeconds: number;
  waveform?: number[];
}

export interface ChatReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ChatPollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

export interface ChatPoll {
  id?: string;
  question: string;
  options: ChatPollOption[];
  allowMultiple?: boolean;
  isAnonymous?: boolean;
  closed: boolean;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  isSystemEvent?: boolean;
  isPinned?: boolean;
  isForwarded?: boolean;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  clientTempId?: string;
  mentions?: string[];
  replyToId?: string;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  attachments?: ChatAttachment[];
  voiceNote?: ChatVoiceNote;
  reactions?: ChatReaction[];
  poll?: ChatPoll;
}

export interface ChatConversation {
  id: string;
  threadId: string;
  type: 'direct' | 'group' | 'announcement';
  name: string;
  avatar?: string;
  otherParticipantId?: string;
  groupId?: string;
  ownerId?: string;
  isAnnouncementOnly?: boolean;
  isArchived?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  markedUnread?: boolean;
  notificationLevel?: 'all' | 'mentions' | 'none';
  unreadCount: number;
  memberCount?: number;
  lastMessageText: string;
  lastMessageSender?: string;
  lastMessageTime?: string;
  participants: ChatParticipant[];
  updatedAt: string;
}

export interface ChatContact {
  id: string;
  userId: string;
  employeeId?: string;
  employeeCode?: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  branch?: string;
  designation?: string;
  managerName?: string;
  avatar?: string;
  threadId?: string;
  online?: boolean;
}

export interface ChatParticipantProfile extends ChatContact {
  employmentType?: string;
  joinedAt?: string;
  bio?: string;
  reportingManager?: {
    id: string;
    userId?: string;
    name: string;
    designation?: string;
  } | null;
}

export interface ChatGroupDetail {
  id: string;
  threadId: string;
  name: string;
  description?: string;
  avatar?: string;
  category?: string;
  ownerId: string;
  myRole?: 'owner' | 'admin' | 'moderator' | 'member';
  isAnnouncementOnly: boolean;
  isArchived: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  unreadCount: number;
  memberCount: number;
  inviteToken?: string | null;
  inviteExpiresAt?: string | null;
  hasActiveInvite?: boolean;
  members: ChatParticipant[];
}

export interface OrgGroupTemplate {
  id: string;
  templateType: 'department' | 'branch' | 'project' | 'leadership' | 'hr' | 'management';
  sourceEntityId?: string;
  name: string;
  memberCount?: number;
  description?: string;
}

export interface CallLogItem {
  id: string;
  callSessionId?: string;
  callerId: string;
  callerName: string;
  callerEmail?: string;
  callerAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  direction?: 'incoming' | 'outgoing';
  callType: 'audio' | 'video';
  status: string;
  durationSeconds: number;
  threadId?: string;
  groupId?: string;
  createdAt: string;
}

export interface PaginatedMessagesResult {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
  seenBy: Array<{ userId: string; userName?: string; readAt?: string }>;
}

export interface ChatGlobalSearchResult {
  messages: Array<{
    id: string;
    threadId: string;
    threadName?: string;
    senderName: string;
    content: string;
    createdAt: string;
  }>;
  files: Array<{
    id: string;
    mediaId?: string;
    threadId: string;
    messageId?: string;
    name: string;
    url: string;
    mimeType?: string;
    size?: number;
    createdAt?: string;
  }>;
}

export interface UploadableFileDescriptor {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

function normalizeReactions(raw: any): ChatReaction[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((r) => {
        if (!r || !r.emoji) return null;
        const users = Array.isArray(r.users)
          ? r.users.map(String)
          : Array.isArray(r.userIds)
          ? r.userIds.map(String)
          : [];
        return {
          emoji: String(r.emoji),
          count: typeof r.count === 'number' ? r.count : users.length || 1,
          users,
        };
      })
      .filter(Boolean) as ChatReaction[];
  }
  if (typeof raw === 'object') {
    return Object.entries(raw)
      .map(([emoji, val]: [string, any]) => {
        const users = Array.isArray(val)
          ? val.map(String)
          : Array.isArray(val?.users)
          ? val.users.map(String)
          : [];
        const count = typeof val?.count === 'number' ? val.count : users.length;
        return count > 0 ? { emoji, count, users } : null;
      })
      .filter(Boolean) as ChatReaction[];
  }
  return [];
}

function normalizePoll(raw: any): ChatPoll | undefined {
  if (!raw || typeof raw !== 'object' || !raw.question) return undefined;
  const rawOptions = Array.isArray(raw.options) ? raw.options : [];
  return {
    id: raw.id ? String(raw.id) : undefined,
    question: String(raw.question),
    allowMultiple: Boolean(raw.allowMultiple ?? raw.isMultiSelect),
    isAnonymous: Boolean(raw.isAnonymous),
    closed: Boolean(raw.closed ?? raw.isClosed),
    options: rawOptions.map((opt: any, idx: number) => {
      const voters = Array.isArray(opt?.voters)
        ? opt.voters.map(String)
        : Array.isArray(opt?.voterIds)
        ? opt.voterIds.map(String)
        : [];
      return {
        id: String(opt?.id ?? idx),
        text: String(opt?.text ?? opt ?? ''),
        votes: typeof opt?.votes === 'number' ? opt.votes : voters.length,
        voters,
      };
    }),
  };
}

export function normalizeChatMessage(raw: any): ChatMessage {
  const attachments: ChatAttachment[] = Array.isArray(raw?.attachments)
    ? raw.attachments.map((att: any, idx: number) => {
        const name = String(att?.name || att?.fileName || `Attachment ${idx + 1}`);
        const mimeType = att?.mimeType || att?.type || '';
        const rawUrl = att?.signedPreviewUrl || att?.signedDownloadUrl || att?.url || '';
        return {
          id: String(att?.id || att?.mediaId || `att-${idx}`),
          mediaId: att?.mediaId ? String(att.mediaId) : att?.id ? String(att.id) : undefined,
          name,
          url: resolveSafeBackendUrl(rawUrl) || rawUrl,
          signedDownloadUrl: resolveSafeBackendUrl(att?.signedDownloadUrl) || undefined,
          signedPreviewUrl: resolveSafeBackendUrl(att?.signedPreviewUrl) || undefined,
          mimeType,
          kind: classifyAttachmentKind(mimeType, name),
          size: typeof att?.size === 'number' ? att.size : att?.fileSize,
        };
      })
    : [];

  const isDeleted = Boolean(raw?.isDeleted || raw?.isDeletedForEveryone);

  return {
    id: String(raw?.id || ''),
    threadId: String(raw?.threadId || ''),
    senderId: String(raw?.senderId || raw?.userId || ''),
    senderName: String(raw?.senderName || raw?.sender?.name || 'Member'),
    senderAvatar: resolveSafeBackendUrl(raw?.senderAvatar || raw?.sender?.avatarUrl) || undefined,
    content: isDeleted ? 'This message was deleted' : String(raw?.content ?? ''),
    createdAt: raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || raw?.editedAt,
    isEdited: Boolean(raw?.isEdited || raw?.editedAt),
    isDeleted,
    isSystemEvent: Boolean(raw?.isSystemEvent),
    isPinned: Boolean(raw?.isPinned),
    isForwarded: Boolean(raw?.isForwarded),
    deliveryStatus: raw?.deliveryStatus || 'sent',
    clientTempId: raw?.clientTempId,
    mentions: Array.isArray(raw?.mentions) ? raw.mentions.map(String) : undefined,
    replyToId: raw?.replyToId ? String(raw.replyToId) : raw?.replyTo?.id ? String(raw.replyTo.id) : undefined,
    replyTo: raw?.replyTo
      ? {
          id: String(raw.replyTo.id || raw?.replyToId || ''),
          senderName: String(raw.replyTo.senderName || raw.replyTo.sender || 'Member'),
          content: String(raw.replyTo.content || ''),
        }
      : undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
    voiceNote: raw?.voiceNote?.url
      ? {
          mediaId: raw.voiceNote.mediaId,
          url: resolveSafeBackendUrl(raw.voiceNote.url) || raw.voiceNote.url,
          durationSeconds: Number(raw.voiceNote.durationSeconds || 0),
          waveform: Array.isArray(raw.voiceNote.waveform) ? raw.voiceNote.waveform : undefined,
        }
      : undefined,
    reactions: normalizeReactions(raw?.reactions),
    poll: normalizePoll(raw?.poll),
  };
}

export function normalizeChatConversation(raw: any): ChatConversation {
  const threadId = String(raw?.threadId || raw?.id || '');
  const isGroup =
    raw?.type === 'group' ||
    raw?.type === 'announcement' ||
    threadId.startsWith('group_') ||
    Boolean(raw?.groupId);
  const isAnnouncement = Boolean(raw?.isAnnouncementOnly || raw?.type === 'announcement');

  const lastMessageText =
    typeof raw?.lastMessage === 'string'
      ? raw.lastMessage
      : typeof raw?.lastMessage?.content === 'string'
      ? raw.lastMessage.content
      : '';

  const lastMessageTime =
    raw?.lastMessageTime ||
    raw?.time ||
    (typeof raw?.lastMessage === 'object' ? raw?.lastMessage?.createdAt : undefined) ||
    raw?.updatedAt ||
    '';

  return {
    id: threadId,
    threadId,
    type: isAnnouncement ? 'announcement' : isGroup ? 'group' : 'direct',
    name: String(raw?.name || raw?.title || 'Conversation'),
    avatar: resolveSafeBackendUrl(raw?.avatarUrl || raw?.avatar) || undefined,
    otherParticipantId: raw?.otherParticipantId || raw?.targetUserId || raw?.userId || undefined,
    groupId:
      raw?.groupId ||
      (threadId.startsWith('group_') ? threadId.slice('group_'.length) : undefined),
    ownerId: raw?.ownerId,
    isAnnouncementOnly: isAnnouncement,
    isArchived: Boolean(raw?.isArchived ?? raw?.isConversationArchived),
    isPinned: Boolean(raw?.isPinned),
    isMuted: Boolean(raw?.isMuted),
    markedUnread: Boolean(raw?.markedUnread),
    notificationLevel: raw?.notificationLevel || 'all',
    unreadCount: Number(raw?.unreadCount ?? raw?.unread ?? 0),
    memberCount: typeof raw?.memberCount === 'number' ? raw.memberCount : raw?.members?.length,
    lastMessageText,
    lastMessageSender:
      raw?.lastMessageSender ||
      (typeof raw?.lastMessage === 'object' ? raw?.lastMessage?.senderName : undefined),
    lastMessageTime,
    participants: Array.isArray(raw?.participants || raw?.members)
      ? (raw.participants || raw.members).map((p: any) => ({
          id: String(p?.userId || p?.id || ''),
          userId: String(p?.userId || p?.id || ''),
          name: String(p?.name || p?.fullName || p?.email || 'Member'),
          avatar: resolveSafeBackendUrl(p?.avatarUrl || p?.avatar) || undefined,
          email: p?.email,
          role: p?.role,
          department: p?.department,
          designation: p?.designation,
          online: Boolean(p?.online ?? p?.isOnline),
        }))
      : [],
    updatedAt: lastMessageTime || new Date().toISOString(),
  };
}

export function normalizeChatGroup(raw: any): ChatGroupDetail {
  const id = String(raw?.id || raw?.groupId || '');
  const threadId = String(raw?.threadId || `group_${id}`);
  const members: ChatParticipant[] = Array.isArray(raw?.members)
    ? raw.members.map((m: any) => ({
        id: String(m?.userId || m?.id || ''),
        userId: String(m?.userId || m?.id || ''),
        name: String(m?.name || m?.fullName || m?.email || 'Member'),
        avatar: resolveSafeBackendUrl(m?.avatarUrl || m?.avatar) || undefined,
        email: m?.email,
        role: m?.role || 'member',
        department: m?.department,
        designation: m?.designation,
        online: Boolean(m?.online ?? m?.isOnline),
      }))
    : [];

  return {
    id,
    threadId,
    name: String(raw?.name || 'Group'),
    description: raw?.description || '',
    avatar: resolveSafeBackendUrl(raw?.avatarUrl || raw?.avatar) || undefined,
    category: raw?.category || 'custom',
    ownerId: String(raw?.ownerId || raw?.createdById || ''),
    myRole: raw?.myRole,
    isAnnouncementOnly: Boolean(raw?.isAnnouncementOnly),
    isArchived: Boolean(raw?.isArchived),
    isPinned: Boolean(raw?.isPinned),
    isMuted: Boolean(raw?.isMuted),
    unreadCount: Number(raw?.unreadCount ?? raw?.unread ?? 0),
    memberCount: typeof raw?.memberCount === 'number' ? raw.memberCount : members.length,
    inviteToken: raw?.inviteToken || null,
    inviteExpiresAt: raw?.inviteExpiresAt || null,
    hasActiveInvite: Boolean(raw?.hasActiveInvite || raw?.inviteToken),
    members,
  };
}

export class ChatService {
  // ── Presence ────────────────────────────────────────────────
  public static async getPresence(passive = false): Promise<string[]> {
    const res = await apiClient.get('/api/chat/presence', {
      params: passive ? { passive: '1' } : undefined,
    });
    return Array.isArray(res.data?.onlineUserIds) ? res.data.onlineUserIds : [];
  }

  public static async updatePresence(status: 'online' | 'offline' = 'online'): Promise<string[]> {
    const res = await apiClient.post('/api/chat/presence', { status });
    return Array.isArray(res.data?.onlineUserIds) ? res.data.onlineUserIds : [];
  }

  // ── Conversations & Preferences ─────────────────────────────
  public static async getConversations(params?: {
    filter?: 'all' | 'unread' | 'archived' | 'muted' | 'groups' | 'direct';
    includeArchived?: boolean;
  }): Promise<ChatConversation[]> {
    const res = await apiClient.get('/api/chat/conversations', {
      params: {
        filter: params?.filter,
        includeArchived: params?.includeArchived ? 'true' : undefined,
      },
    });
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.conversations)
      ? res.data.conversations
      : [];
    return list.map(normalizeChatConversation);
  }

  public static async createDirectConversation(targetUserId: string): Promise<ChatConversation> {
    const res = await apiClient.post('/api/chat/conversations/direct', {
      targetUserId,
      participantId: targetUserId,
    });
    const raw = res.data?.thread || res.data?.conversation || res.data;
    return normalizeChatConversation({ ...raw, type: 'direct' });
  }

  public static async pinConversation(threadId: string): Promise<{ isPinned: boolean }> {
    const res = await apiClient.post(`/api/chat/conversations/${encodeURIComponent(threadId)}/pin`, {});
    return { isPinned: Boolean(res.data?.isPinned) };
  }

  public static async updateConversationPreferences(
    threadId: string,
    prefs: {
      isMuted?: boolean;
      durationHours?: number;
      isArchived?: boolean;
      markedUnread?: boolean;
      notificationLevel?: 'all' | 'mentions' | 'none';
    }
  ): Promise<any> {
    const res = await apiClient.patch(
      `/api/chat/conversations/${encodeURIComponent(threadId)}/preferences`,
      prefs
    );
    return res.data;
  }

  // ── Contacts & Directory Profile ────────────────────────────
  public static async getContacts(search?: string): Promise<ChatContact[]> {
    const res = await apiClient.get('/api/chat/contacts', {
      params: search ? { search } : undefined,
    });
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.contacts)
      ? res.data.contacts
      : [];
    return list.map((c: any) => ({
      id: String(c?.userId || c?.id || ''),
      userId: String(c?.userId || c?.id || ''),
      employeeId: c?.employeeId,
      employeeCode: c?.employeeCode,
      name: String(c?.name || c?.email || 'Colleague'),
      email: String(c?.email || ''),
      phone: c?.phone,
      department: c?.department,
      branch: c?.branch,
      designation: c?.designation || c?.title,
      managerName: c?.managerName,
      avatar: resolveSafeBackendUrl(c?.avatarUrl || c?.avatar) || undefined,
      threadId: c?.threadId,
      online: c?.status === 'online' || Boolean(c?.online),
    }));
  }

  public static async getParticipantProfile(userId: string): Promise<ChatParticipantProfile> {
    const res = await apiClient.get(`/api/chat/participant/${encodeURIComponent(userId)}`);
    const p = res.data?.data || res.data;
    return {
      id: String(p?.userId || p?.id || userId),
      userId: String(p?.userId || p?.id || userId),
      employeeId: p?.employeeId,
      employeeCode: p?.employeeCode,
      name: String(p?.name || p?.email || 'Colleague'),
      email: String(p?.email || ''),
      phone: p?.phone,
      department: p?.department,
      branch: p?.branch,
      designation: p?.designation,
      managerName: p?.reportingManager?.name || p?.managerName,
      reportingManager: p?.reportingManager || null,
      avatar: resolveSafeBackendUrl(p?.avatarUrl) || undefined,
      online: Boolean(p?.isOnline || p?.status === 'online'),
      employmentType: p?.employmentType,
      joinedAt: p?.joinedAt,
      bio: p?.bio,
    };
  }

  // ── Groups, Org Templates & Administration ──────────────────
  public static async getGroups(params?: {
    search?: string;
    includeArchived?: boolean;
  }): Promise<ChatGroupDetail[]> {
    const res = await apiClient.get('/api/chat/groups', {
      params: {
        search: params?.search,
        includeArchived: params?.includeArchived ? 'true' : undefined,
      },
    });
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.groups)
      ? res.data.groups
      : [];
    return list.map(normalizeChatGroup);
  }

  public static async getGroupDetails(groupId: string): Promise<ChatGroupDetail> {
    const res = await apiClient.get(`/api/chat/groups/${encodeURIComponent(groupId)}`);
    return normalizeChatGroup(res.data?.group || res.data);
  }

  public static async createGroup(payload: {
    name: string;
    description?: string;
    memberIds: string[];
    isAnnouncementOnly?: boolean;
    category?: string;
  }): Promise<ChatGroupDetail> {
    const res = await apiClient.post('/api/chat/groups', payload);
    return normalizeChatGroup(res.data?.group || res.data);
  }

  public static async getOrgGroupTemplates(): Promise<OrgGroupTemplate[]> {
    const res = await apiClient.get('/api/chat/hrms/group-templates');
    const raw = res.data || {};
    if (Array.isArray(raw.templates) && raw.templates.length > 0) {
      return raw.templates.map((t: any) => ({
        id: String(t.id || `${t.templateType}-${t.sourceEntityId || t.name}`),
        templateType: t.templateType || t.type || 'department',
        sourceEntityId: t.sourceEntityId || t.entityId || t.id,
        name: String(t.name || t.label || 'Organization Group'),
        memberCount: t.memberCount ?? t.count,
        description: t.description,
      }));
    }

    const combined: OrgGroupTemplate[] = [];
    for (const dept of raw.departments || []) {
      combined.push({
        id: `dept-${dept.id}`,
        templateType: 'department',
        sourceEntityId: dept.id,
        name: dept.name,
        memberCount: dept.memberCount ?? dept._count?.employees,
      });
    }
    for (const br of raw.branches || []) {
      combined.push({
        id: `branch-${br.id}`,
        templateType: 'branch',
        sourceEntityId: br.id,
        name: br.name,
        memberCount: br.memberCount,
      });
    }
    for (const sp of raw.special || raw.cohorts || []) {
      combined.push({
        id: `cohort-${sp.templateType || sp.type || sp.id}`,
        templateType: sp.templateType || sp.type || 'leadership',
        name: sp.name || sp.label,
        memberCount: sp.memberCount,
        description: sp.description,
      });
    }
    return combined;
  }

  public static async createGroupFromOrg(payload: {
    templateType: OrgGroupTemplate['templateType'];
    sourceEntityId?: string;
    name?: string;
    description?: string;
    isAnnouncementOnly?: boolean;
  }): Promise<ChatGroupDetail> {
    const res = await apiClient.post('/api/chat/hrms/groups/from-org', payload);
    return normalizeChatGroup(res.data?.group || res.data);
  }

  public static async updateGroup(
    groupId: string,
    payload: {
      name?: string;
      description?: string;
      avatarUrl?: string | null;
      isAnnouncementOnly?: boolean;
    }
  ): Promise<ChatGroupDetail> {
    const res = await apiClient.patch(`/api/chat/groups/${encodeURIComponent(groupId)}`, payload);
    return normalizeChatGroup(res.data?.group || res.data);
  }

  public static async archiveGroup(
    groupId: string,
    isArchived?: boolean
  ): Promise<{ isArchived: boolean }> {
    const res = await apiClient.post(
      `/api/chat/groups/${encodeURIComponent(groupId)}/archive`,
      isArchived !== undefined ? { isArchived } : {}
    );
    return { isArchived: Boolean(res.data?.isArchived) };
  }

  public static async muteGroup(groupId: string, isMuted?: boolean): Promise<{ isMuted: boolean }> {
    const res = await apiClient.post(
      `/api/chat/groups/${encodeURIComponent(groupId)}/mute`,
      isMuted !== undefined ? { isMuted } : {}
    );
    return { isMuted: Boolean(res.data?.isMuted) };
  }

  public static async leaveGroup(groupId: string): Promise<boolean> {
    await apiClient.post(`/api/chat/groups/${encodeURIComponent(groupId)}/leave`, {});
    return true;
  }

  public static async transferGroupOwnership(groupId: string, newOwnerId: string): Promise<boolean> {
    await apiClient.post(
      `/api/chat/groups/${encodeURIComponent(groupId)}/transfer-ownership`,
      { newOwnerId }
    );
    return true;
  }

  public static async addGroupMembers(groupId: string, memberIds: string[]): Promise<number> {
    const res = await apiClient.post(`/api/chat/groups/${encodeURIComponent(groupId)}/members`, {
      memberIds,
    });
    return Number(res.data?.addedCount ?? memberIds.length);
  }

  public static async updateGroupMemberRole(
    groupId: string,
    userId: string,
    role: 'admin' | 'moderator' | 'member'
  ): Promise<boolean> {
    await apiClient.patch(
      `/api/chat/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/role`,
      { role }
    );
    return true;
  }

  public static async removeGroupMember(groupId: string, userId: string): Promise<boolean> {
    await apiClient.delete(
      `/api/chat/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`
    );
    return true;
  }

  public static async generateGroupInviteLink(
    groupId: string
  ): Promise<{ inviteToken: string; inviteExpiresAt?: string }> {
    const res = await apiClient.post(
      `/api/chat/groups/${encodeURIComponent(groupId)}/invite-link`,
      {}
    );
    return {
      inviteToken: String(res.data?.inviteToken || res.data?.token || ''),
      inviteExpiresAt: res.data?.inviteExpiresAt,
    };
  }

  public static async revokeGroupInviteLink(groupId: string): Promise<boolean> {
    await apiClient.delete(`/api/chat/groups/${encodeURIComponent(groupId)}/invite-link`);
    return true;
  }

  public static async joinGroupByInvite(inviteToken: string): Promise<ChatGroupDetail> {
    const res = await apiClient.post('/api/chat/groups/join-by-invite', { inviteToken });
    return normalizeChatGroup(res.data?.group || res.data);
  }

  public static async getGroupActivity(groupId: string): Promise<ChatMessage[]> {
    const res = await apiClient.get(`/api/chat/groups/${encodeURIComponent(groupId)}/activity`);
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.events)
      ? res.data.events
      : [];
    return list.map(normalizeChatMessage);
  }

  // ── Messages, Pagination, Search, Polls & Attachments ───────
  public static async getMessagesPage(
    threadId: string,
    params?: { limit?: number; before?: string; after?: string; markRead?: boolean }
  ): Promise<PaginatedMessagesResult> {
    const res = await apiClient.get(`/api/chat/messages/${encodeURIComponent(threadId)}`, {
      params: {
        limit: params?.limit ?? 25,
        before: params?.before,
        after: params?.after,
        markRead: params?.markRead === false ? 'false' : undefined,
      },
    });
    const rawMsgs = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.messages)
      ? res.data.messages
      : [];

    return {
      messages: rawMsgs.map(normalizeChatMessage),
      nextCursor: res.data?.nextCursor ?? null,
      hasMore: Boolean(res.data?.hasMore),
      seenBy: Array.isArray(res.data?.seenBy) ? res.data.seenBy : [],
    };
  }

  public static async getMessages(
    threadId: string,
    limit = 25,
    before?: string
  ): Promise<ChatMessage[]> {
    const page = await this.getMessagesPage(threadId, { limit, before });
    return page.messages;
  }

  public static async getThreadFiles(threadId: string): Promise<ChatAttachment[]> {
    const res = await apiClient.get(`/api/chat/messages/${encodeURIComponent(threadId)}/files`);
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.files)
      ? res.data.files
      : [];
    return list.map((f: any, idx: number) => {
      const name = String(f?.name || f?.fileName || `File ${idx + 1}`);
      const mimeType = f?.mimeType || f?.type || '';
      const rawUrl = f?.signedPreviewUrl || f?.signedDownloadUrl || f?.url || '';
      return {
        id: String(f?.id || f?.mediaId || idx),
        mediaId: f?.mediaId || f?.id,
        name,
        url: resolveSafeBackendUrl(rawUrl) || rawUrl,
        mimeType,
        kind: classifyAttachmentKind(mimeType, name),
        size: f?.size || f?.fileSize,
      };
    });
  }

  public static async searchGlobal(query: string, limit = 25): Promise<ChatGlobalSearchResult> {
    const res = await apiClient.get('/api/chat/search', {
      params: { q: query, limit },
    });
    const rawMsgs = Array.isArray(res.data?.messages)
      ? res.data.messages
      : Array.isArray(res.data?.results)
      ? res.data.results
      : [];
    const rawFiles = Array.isArray(res.data?.files) ? res.data.files : [];

    return {
      messages: rawMsgs.map((m: any) => ({
        id: String(m.id),
        threadId: String(m.threadId),
        threadName: m.threadName,
        senderName: String(m.senderName || 'Member'),
        content: String(m.content || ''),
        createdAt: m.createdAt || new Date().toISOString(),
      })),
      files: rawFiles.map((f: any) => ({
        id: String(f.id || f.mediaId),
        mediaId: f.mediaId || f.id,
        threadId: String(f.threadId || ''),
        messageId: f.messageId,
        name: String(f.name || f.fileName || 'Attachment'),
        url: resolveSafeBackendUrl(f.url) || f.url,
        mimeType: f.mimeType,
        size: f.size,
        createdAt: f.createdAt,
      })),
    };
  }

  public static async uploadAttachments(
    files: UploadableFileDescriptor[],
    threadId?: string
  ): Promise<ChatAttachment[]> {
    if (!files || files.length === 0) return [];
    if (files.length > MAX_CHAT_ATTACHMENTS_PER_MESSAGE) {
      throw new Error(`Maximum ${MAX_CHAT_ATTACHMENTS_PER_MESSAGE} attachments allowed per message.`);
    }

    for (const file of files) {
      const check = validateChatAttachmentCandidate({
        name: file.name,
        size: file.size,
        mimeType: file.type,
      });
      if (!check.valid) {
        throw new Error(check.reason || 'Invalid attachment.');
      }
    }

    const formData = new FormData();
    if (threadId) {
      formData.append('threadId', threadId);
    }
    for (const file of files) {
      formData.append('files', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      } as any);
    }

    const res = await apiClient.post('/api/chat/upload', formData, {
      headers: {
        Accept: 'application/json',
      },
      transformRequest: (data) => data,
    });

    const saved = Array.isArray(res.data?.files) ? res.data.files : [];
    return saved.map((f: any, idx: number) => {
      const name = String(f?.name || f?.fileName || files[idx]?.name || 'Attachment');
      const mimeType = f?.mimeType || f?.type || files[idx]?.type || '';
      const rawUrl = f?.signedPreviewUrl || f?.signedDownloadUrl || f?.url || '';
      return {
        id: String(f?.id || f?.mediaId || idx),
        mediaId: f?.mediaId || f?.id,
        name,
        url: resolveSafeBackendUrl(rawUrl) || rawUrl,
        signedDownloadUrl: resolveSafeBackendUrl(f?.signedDownloadUrl) || undefined,
        signedPreviewUrl: resolveSafeBackendUrl(f?.signedPreviewUrl) || undefined,
        mimeType,
        kind: classifyAttachmentKind(mimeType, name),
        size: f?.size ?? f?.fileSize ?? files[idx]?.size,
      };
    });
  }

  public static async sendMessage(payload: {
    threadId: string;
    content?: string;
    replyToId?: string;
    attachments?: any[];
    voiceNote?: ChatVoiceNote;
    poll?: {
      question: string;
      options: string[];
      allowMultiple?: boolean;
      isAnonymous?: boolean;
    };
    mentions?: string[];
    clientTempId?: string;
  }): Promise<ChatMessage> {
    const res = await apiClient.post('/api/chat/messages', payload);
    return normalizeChatMessage(res.data?.message || res.data);
  }

  public static async editMessage(id: string, content: string): Promise<ChatMessage> {
    const res = await apiClient.patch(`/api/chat/messages/${encodeURIComponent(id)}`, { content });
    return normalizeChatMessage(res.data?.message || res.data);
  }

  public static async deleteMessage(
    id: string,
    mode: 'me' | 'everyone' = 'me'
  ): Promise<{ mode: 'me' | 'everyone' }> {
    const res = await apiClient.delete(`/api/chat/messages/${encodeURIComponent(id)}`, {
      params: {
        mode,
        forEveryone: mode === 'everyone' ? 'true' : undefined,
      },
    });
    return { mode: res.data?.mode === 'everyone' ? 'everyone' : 'me' };
  }

  public static async pinMessage(id: string): Promise<ChatMessage> {
    const res = await apiClient.post(`/api/chat/messages/${encodeURIComponent(id)}/pin`, {});
    return normalizeChatMessage(res.data?.message || res.data);
  }

  public static async reactToMessage(id: string, emoji: string): Promise<ChatMessage> {
    const res = await apiClient.post(`/api/chat/messages/${encodeURIComponent(id)}/react`, {
      emoji,
    });
    return normalizeChatMessage(res.data?.message || res.data);
  }

  public static async forwardMessageBatch(
    messageId: string,
    targetThreadIds: string[]
  ): Promise<{ forwardedCount: number }> {
    const res = await apiClient.post('/api/chat/messages/forward-batch', {
      messageId,
      targetThreadIds,
    });
    return { forwardedCount: Number(res.data?.forwardedCount ?? targetThreadIds.length) };
  }

  public static async votePoll(messageId: string, optionId: string): Promise<ChatPoll | undefined> {
    const res = await apiClient.post(
      `/api/chat/messages/${encodeURIComponent(messageId)}/poll/vote`,
      { optionId }
    );
    return normalizePoll(res.data?.poll);
  }

  public static async closePoll(messageId: string): Promise<ChatPoll | undefined> {
    const res = await apiClient.post(
      `/api/chat/messages/${encodeURIComponent(messageId)}/poll/close`,
      {}
    );
    return normalizePoll(res.data?.poll);
  }

  public static async markDelivered(messageIds: string[], threadId?: string): Promise<void> {
    if (!messageIds.length) return;
    await apiClient.post('/api/chat/messages/delivered', { messageIds, threadId });
  }

  public static async markThreadRead(threadId: string): Promise<boolean> {
    await apiClient.post(`/api/chat/messages/${encodeURIComponent(threadId)}/read`, {});
    return true;
  }

  // ── 1:1 / Mesh Calls, Multiparty Meetings & Call History ────
  public static async initiateCall(
    targetUserId: string,
    callType: 'audio' | 'video',
    threadId?: string
  ): Promise<{ callId: string; status: string }> {
    const clientCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const res = await apiClient.post('/api/calls/invite', {
      targetUserId,
      callType,
      callId: clientCallId,
      threadId,
    });
    const data = res.data?.data || res.data;
    return {
      callId: String(data?.callId || clientCallId),
      status: String(data?.status || 'ringing'),
    };
  }

  public static async getCallStatus(callId: string): Promise<any> {
    const res = await apiClient.get(`/api/calls/${encodeURIComponent(callId)}/status`);
    return res.data?.data || res.data;
  }

  public static async acceptCall(callId: string): Promise<any> {
    const res = await apiClient.post(`/api/calls/${encodeURIComponent(callId)}/accept`, {});
    return res.data?.data || res.data;
  }

  public static async rejectCall(callId: string, reason = 'declined'): Promise<void> {
    await apiClient.post(`/api/calls/${encodeURIComponent(callId)}/reject`, { reason });
  }

  public static async cancelCall(callId: string): Promise<void> {
    await apiClient.post(`/api/calls/${encodeURIComponent(callId)}/cancel`, {});
  }

  public static async endCall(callId: string, durationSeconds = 0): Promise<void> {
    await apiClient.post(`/api/calls/${encodeURIComponent(callId)}/end`, { durationSeconds });
  }

  public static async sendCallHeartbeat(callId: string): Promise<{
    active: boolean;
    status?: string;
    peerLeft?: boolean;
  }> {
    const res = await apiClient.post(`/api/calls/${encodeURIComponent(callId)}/heartbeat`, {});
    return {
      active: Boolean(res.data?.active ?? res.data?.ok),
      status: res.data?.status,
      peerLeft: Boolean(res.data?.peerLeft),
    };
  }

  public static async updateCallMediaState(
    callId: string,
    type: 'audio-mute' | 'video-mute' | 'call-hold' | 'screen-share',
    active: boolean
  ): Promise<void> {
    await apiClient.post(`/api/calls/${encodeURIComponent(callId)}/media-state`, { type, active });
  }

  public static async inviteColleagueToCall(callId: string, targetUserId: string): Promise<any> {
    const res = await apiClient.post(
      `/api/calls/${encodeURIComponent(callId)}/invite-colleague`,
      { targetUserId }
    );
    return res.data?.data || res.data;
  }

  public static async startGroupMeeting(params: {
    groupId: string;
    callType: 'audio' | 'video';
    invitedUserIds?: string[];
  }): Promise<{ callId: string; status: string }> {
    const callId = `meet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const res = await apiClient.post('/api/chat/meetings/start', {
      groupId: params.groupId,
      callId,
      callType: params.callType,
      invitedUserIds: params.invitedUserIds,
    });
    return {
      callId: String(res.data?.callId || callId),
      status: String(res.data?.status || 'connected'),
    };
  }

  public static async joinGroupMeeting(callId: string, groupId?: string): Promise<any> {
    const res = await apiClient.post(`/api/chat/meetings/${encodeURIComponent(callId)}/join`, {
      groupId,
    });
    return res.data;
  }

  public static async getGroupMeetingParticipants(callId: string): Promise<any> {
    const res = await apiClient.get(
      `/api/chat/meetings/${encodeURIComponent(callId)}/participants`
    );
    return res.data;
  }

  public static async updateGroupMeetingMediaState(
    callId: string,
    state: { isMuted?: boolean; isVideoOff?: boolean; isScreenSharing?: boolean }
  ): Promise<void> {
    await apiClient.post(`/api/chat/meetings/${encodeURIComponent(callId)}/media-state`, state);
  }

  public static async inviteUsersToGroupMeeting(callId: string, userIds: string[]): Promise<void> {
    await apiClient.post(`/api/chat/meetings/${encodeURIComponent(callId)}/invite`, { userIds });
  }

  public static async removeGroupMeetingParticipant(
    callId: string,
    targetUserId: string
  ): Promise<void> {
    await apiClient.post(`/api/chat/meetings/${encodeURIComponent(callId)}/remove`, {
      targetUserId,
    });
  }

  public static async leaveGroupMeeting(callId: string): Promise<void> {
    await apiClient.post(`/api/chat/meetings/${encodeURIComponent(callId)}/leave`, {});
  }

  public static async endGroupMeetingForAll(callId: string): Promise<void> {
    await apiClient.post(`/api/chat/meetings/${encodeURIComponent(callId)}/end`, {});
  }

  public static async getCalls(params?: {
    search?: string;
    callType?: 'audio' | 'video';
    status?: string;
    page?: number;
    limit?: number;
    sort?: 'asc' | 'desc';
  }): Promise<{ calls: CallLogItem[]; total: number; totalPages: number }> {
    const res = await apiClient.get('/api/chat/calls', {
      params: {
        search: params?.search || undefined,
        callType: params?.callType || undefined,
        status: params?.status || undefined,
        page: params?.page ?? 1,
        limit: params?.limit ?? 30,
        sort: params?.sort ?? 'desc',
      },
    });
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.calls)
      ? res.data.calls
      : [];

    const calls: CallLogItem[] = list.map((c: any) => ({
      id: String(c?.id || ''),
      callSessionId: c?.callSessionId,
      callerId: String(c?.callerId || ''),
      callerName: String(c?.callerName || 'Colleague'),
      callerEmail: c?.callerEmail,
      callerAvatar: resolveSafeBackendUrl(c?.callerAvatarUrl || c?.callerAvatar) || undefined,
      receiverId: String(c?.receiverId || ''),
      receiverName: String(c?.receiverName || 'Colleague'),
      receiverAvatar: resolveSafeBackendUrl(c?.receiverAvatarUrl || c?.receiverAvatar) || undefined,
      direction: c?.direction,
      callType: c?.callType === 'video' ? 'video' : 'audio',
      status: String(c?.status || 'COMPLETED').toUpperCase(),
      durationSeconds: Number(c?.durationSeconds ?? 0),
      threadId: c?.threadId,
      groupId: c?.groupId,
      createdAt: c?.createdAt || new Date().toISOString(),
    }));

    return {
      calls,
      total: Number(res.data?.total ?? calls.length),
      totalPages: Number(res.data?.totalPages ?? 1),
    };
  }

  public static async deleteCallLog(id: string): Promise<boolean> {
    await apiClient.delete(`/api/chat/calls/${encodeURIComponent(id)}`);
    return true;
  }
}
