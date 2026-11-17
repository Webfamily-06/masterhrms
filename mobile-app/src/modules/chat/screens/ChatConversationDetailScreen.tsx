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
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '../../../components/common/Text';
import {
  Search,
  Phone,
  Video,
  Info,
  X,
  Pin,
  Hand,
  FileText,
  Music,
  Paperclip,
  Mic,
  BarChart2,
  Check,
  CheckCheck,
  AlertTriangle,
  Edit,
  Megaphone,
  Send,
  Trash2,
  CheckSquare,
  Square,
  Link,
  Crown,
  Circle,
  Smile,
  Camera,
  Play,
  Pause,
  Download,
  Share2,
  ShieldAlert,
  Flag,
  MapPin,
  Image as ImageIcon,
  MessageSquare,
  CornerUpLeft,
  Navigation,
  Radio,
  RotateCcw,
  Eye,
} from 'lucide-react-native';
import { WorkspaceModuleShell } from '../../../components/workspace/WorkspaceModuleShell';
import { createTenantQueryKey } from '../../../app/providers/QueryProvider';
import { useAuthStore } from '../../../store/authStore';
import { usePermission } from '../../../hooks/usePermission';
import { realtimeManager } from '../../../core/realtime/realtimeManager';
import {
  formatFileSize,
  openOrShareAttachment,
  downloadOrSaveMedia,
} from '../../../core/storage/attachmentHelper';
import {
  requestMicrophonePermission,
} from '../../../core/services/permissionService';
import {
  ChatService,
  ChatMessage,
  ChatParticipant,
  UploadableFileDescriptor,
} from '../../../core/services/chatService';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥'];

const PRESET_GROUP_AVATARS = [
  { id: 'office', label: 'Office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=150&auto=format&fit=crop&q=80' },
  { id: 'tech', label: 'Tech & Dev', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=150&auto=format&fit=crop&q=80' },
  { id: 'team', label: 'People / HR', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80' },
  { id: 'sales', label: 'Growth / Sales', url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150&auto=format&fit=crop&q=80' },
  { id: 'design', label: 'Design & UI', url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=150&auto=format&fit=crop&q=80' },
  { id: 'support', label: 'Support / Ops', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
];

const EMOJI_CATEGORIES = [
  { name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😜', '🤪', '😎'] },
  { name: 'Gestures', emojis: ['👍', '👎', '👏', '🙌', '🤝', '👊', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '👈', '👉', '👆', '👇', '✋', '👋', '🙏'] },
  { name: 'Reactions', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '💔', '🔥', '✨', '💯', '🎉', '🚀', '⭐', '💥', '👀', '💡', '🏆'] },
  { name: 'Work', emojis: ['💼', '📁', '📊', '📈', '📌', '📎', '📝', '📅', '🕒', '🔔', '💻', '📱', '🔒', '🔑', '☕', '🏢'] },
];

const DEVICE_DOCUMENTS_MOCK = [
  {
    id: 'doc_1',
    name: 'Q4_Financial_Report_2026.pdf',
    type: 'application/pdf',
    size: 2450000,
    uri: 'https://cdn.masterhrms.internal/docs/Q4_Financial_Report_2026.pdf',
    ext: 'PDF',
    color: '#EF4444',
  },
  {
    id: 'doc_2',
    name: 'Employee_Handbook_2026.pdf',
    type: 'application/pdf',
    size: 1840000,
    uri: 'https://cdn.masterhrms.internal/docs/Employee_Handbook_2026.pdf',
    ext: 'PDF',
    color: '#EF4444',
  },
  {
    id: 'doc_3',
    name: 'Offer_Letter_Template.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 420000,
    uri: 'https://cdn.masterhrms.internal/docs/Offer_Letter_Template.docx',
    ext: 'DOC',
    color: '#3B82F6',
  },
  {
    id: 'doc_4',
    name: 'HR_Policy_Update_May.pdf',
    type: 'application/pdf',
    size: 890000,
    uri: 'https://cdn.masterhrms.internal/docs/HR_Policy_Update_May.pdf',
    ext: 'PDF',
    color: '#EF4444',
  },
  {
    id: 'doc_5',
    name: 'Sprint_Deliverables_Summary.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 650000,
    uri: 'https://cdn.masterhrms.internal/docs/Sprint_Deliverables_Summary.xlsx',
    ext: 'XLS',
    color: '#10B981',
  },
  {
    id: 'doc_6',
    name: 'Architecture_Blueprint_v3.png',
    type: 'image/png',
    size: 1120000,
    uri: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    ext: 'IMG',
    color: '#8B5CF6',
  },
];

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetMsg, setDeleteTargetMsg] = useState<ChatMessage | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [changeAvatarModalOpen, setChangeAvatarModalOpen] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
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
  const touchStartX = useRef<number>(0);

  // Audio Note Playback State (Matches 18_Light_Personal Chat Room Voice Message.png)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlaybackProgress, setAudioPlaybackProgress] = useState<number>(0);
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice Note Recording State (Matches 18_Light_Personal Chat Room Voice Message.png)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordDuration, setVoiceRecordDuration] = useState(0);
  const voiceRecordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // In-App Fullscreen Media Preview Modal
  const [previewMedia, setPreviewMedia] = useState<{
    url: string;
    name: string;
    kind: string;
    sender?: string;
  } | null>(null);

  // Contact Details Settings & Modals (27_Light to 30_Light)
  const [isContactMuted, setIsContactMuted] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Document Picker Modal State
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Camera Viewfinder & Photo Capture Modal State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);

  // Sent File Preview Panel State (displayed after sending file to User-B)
  const [sentFilePreview, setSentFilePreview] = useState<{
    name: string;
    size?: number;
    type?: string;
    url: string;
    time: string;
    recipient: string;
  } | null>(null);

  // Location Sharing Modal State
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationType, setLocationType] = useState<'current' | 'live'>('current');
  const [liveDuration, setLiveDuration] = useState<'10m' | '1h' | '2h' | 'custom'>('1h');
  const [liveDurationCustomMin, setLiveDurationCustomMin] = useState('30');

  // Swipe Left to Reply State
  const [swipingMsgId, setSwipingMsgId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  // Toggle audio note playback with smooth progress
  const togglePlayAudio = (msgId: string, durationSec = 20) => {
    if (playingAudioId === msgId) {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      setPlayingAudioId(null);
      setAudioPlaybackProgress(0);
      return;
    }

    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    setPlayingAudioId(msgId);
    setAudioPlaybackProgress(0);

    const stepMs = 200;
    const totalMs = Math.max(durationSec * 1000, 3000);
    const inc = stepMs / totalMs;

    audioIntervalRef.current = setInterval(() => {
      setAudioPlaybackProgress((prev) => {
        if (prev >= 1) {
          if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
          setPlayingAudioId(null);
          return 0;
        }
        return prev + inc;
      });
    }, stepMs);
  };

  // Start Voice Recording (Matches 18_Light_Personal Chat Room Voice Message.png)
  const startVoiceRecording = async () => {
    const granted = await requestMicrophonePermission();
    if (!granted) {
      Alert.alert('Microphone Permission', 'Microphone access is required to record voice notes.');
      return;
    }
    setComposerMenuOpen(false);
    setIsRecordingVoice(true);
    setVoiceRecordDuration(0);
    if (voiceRecordTimerRef.current) clearInterval(voiceRecordTimerRef.current);
    voiceRecordTimerRef.current = setInterval(() => {
      setVoiceRecordDuration((s) => s + 1);
    }, 1000);
  };

  const cancelVoiceRecording = () => {
    if (voiceRecordTimerRef.current) clearInterval(voiceRecordTimerRef.current);
    setIsRecordingVoice(false);
    setVoiceRecordDuration(0);
  };

  const sendVoiceRecording = async () => {
    if (voiceRecordTimerRef.current) clearInterval(voiceRecordTimerRef.current);
    const finalDuration = Math.max(voiceRecordDuration, 1);
    setIsRecordingVoice(false);
    setVoiceRecordDuration(0);

    const clientTempId = `mob_voice_${Date.now()}`;
    try {
      const sent = await ChatService.sendMessage({
        threadId,
        content: `🎤 Voice note (${finalDuration}s)`,
        clientTempId,
        voiceNote: {
          durationSeconds: finalDuration,
          url: 'https://cdn.masterhrms.internal/media/voice_note_sample.mp3',
          mediaId: `vn_${Date.now()}`,
        },
      });
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err: any) {
      Alert.alert('Voice Note Failed', err?.message || 'Could not send voice note.');
    }
  };

  const handleCameraCapture = async () => {
    setComposerMenuOpen(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera Permission Required', 'Camera access is required to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      const photoFile: UploadableFileDescriptor = {
        uri: asset.uri,
        name: asset.fileName || `camera_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 300000,
      };

      setSending(true);
      const uploadedAttachments = await ChatService.uploadAttachments([photoFile], threadId);
      const sent = await ChatService.sendMessage({
        threadId,
        content: '',
        attachments: uploadedAttachments,
        clientTempId: `mob_cam_${Date.now()}`,
      });
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);

      setSentFilePreview({
        name: photoFile.name,
        size: photoFile.size,
        type: photoFile.type,
        url: photoFile.uri,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        recipient: title || 'User',
      });
    } catch (err: any) {
      Alert.alert('Camera Error', err?.message || 'Could not take photo.');
    } finally {
      setSending(false);
    }
  };

  const handleShutterSnap = () => {
    // Kept for interactive viewfinder modal if opened directly
    handleCameraCapture();
  };

  const handleConfirmSendCapturedPhoto = async () => {
    if (!capturedPhotoUri) return;
    const photoFile: UploadableFileDescriptor = {
      uri: capturedPhotoUri,
      name: `camera_photo_${Date.now()}.jpg`,
      type: 'image/jpeg',
      size: 285000,
    };
    setCameraModalOpen(false);
    setCapturedPhotoUri(null);

    try {
      setSending(true);
      const uploadedAttachments = await ChatService.uploadAttachments([photoFile], threadId);
      const sent = await ChatService.sendMessage({
        threadId,
        content: '',
        attachments: uploadedAttachments,
        clientTempId: `mob_cam_${Date.now()}`,
      });
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);

      // Trigger File Preview Panel for User-B / participant
      setSentFilePreview({
        name: photoFile.name,
        size: photoFile.size,
        type: photoFile.type,
        url: photoFile.uri,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        recipient: title || 'User',
      });
    } catch (err: any) {
      Alert.alert('Photo Send Failed', err?.message || 'Could not send captured photo.');
    } finally {
      setSending(false);
    }
  };

  const handleGalleryPick = async () => {
    setComposerMenuOpen(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Gallery Permission Required', 'Photo library access is required to choose photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.85,
        allowsMultipleSelection: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const newFiles: UploadableFileDescriptor[] = result.assets.map((asset, i) => ({
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}_${i}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 250000,
      }));

      setSending(true);
      const uploaded = await ChatService.uploadAttachments(newFiles, threadId);
      const sent = await ChatService.sendMessage({
        threadId,
        content: '',
        attachments: uploaded,
        clientTempId: `mob_gal_${Date.now()}`,
      });
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);

      const primary = newFiles[0];
      setSentFilePreview({
        name: primary.name,
        size: primary.size,
        type: primary.type,
        url: primary.uri,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        recipient: title || 'User',
      });
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Could not select photo.');
    } finally {
      setSending(false);
    }
  };

  const handleDocumentPick = async () => {
    setComposerMenuOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const newFiles: UploadableFileDescriptor[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
      }));

      setSending(true);
      const uploadedAttachments = await ChatService.uploadAttachments(newFiles, threadId);
      const sent = await ChatService.sendMessage({
        threadId,
        content: `Attached ${newFiles.length} file${newFiles.length > 1 ? 's' : ''}`,
        attachments: uploadedAttachments,
        clientTempId: `mob_doc_${Date.now()}`,
      });
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);

      const primaryDoc = newFiles[0];
      setSentFilePreview({
        name: primaryDoc.name,
        size: primaryDoc.size,
        type: primaryDoc.type,
        url: primaryDoc.uri,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        recipient: title || 'User',
      });
    } catch (err: any) {
      Alert.alert('Document Pick Failed', err?.message || 'Could not select document.');
    } finally {
      setSending(false);
    }
  };

  const handleToggleSelectDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleConfirmAttachDocuments = async () => {
    handleDocumentPick();
  };

  const handleLocationPick = async () => {
    setComposerMenuOpen(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission Required', 'Location access is required to share current or live location.');
        return;
      }
      setLocationModalOpen(true);
    } catch {
      Alert.alert('Location Error', 'Unable to request location permissions.');
    }
  };

  const handleSendLocation = async () => {
    setLocationModalOpen(false);
    try {
      setSending(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission Required', 'Location access is required.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      }).catch(() => []);
      const addr = geocode[0];
      const placeName = addr
        ? [addr.street, addr.district, addr.city, addr.region].filter(Boolean).join(', ')
        : 'Current Location';

      const locText =
        locationType === 'current'
          ? `📍 Location: ${placeName} (${loc.coords.latitude.toFixed(4)}° N, ${loc.coords.longitude.toFixed(4)}° E)`
          : `🔴 Live Location (${liveDuration === 'custom' ? liveDurationCustomMin + 'min' : liveDuration}): ${placeName} (${loc.coords.latitude.toFixed(4)}° N, ${loc.coords.longitude.toFixed(4)}° E)`;

      const sent = await ChatService.sendMessage({
        threadId,
        content: locText,
        clientTempId: `mob_loc_${Date.now()}`,
      });
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err: any) {
      Alert.alert('Location Send Failed', err?.message || 'Could not share location.');
    } finally {
      setSending(false);
    }
  };

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

    // Background sync polling: keeps messages 100% in sync with webapp even during socket renegotiation
    const syncPollInterval = setInterval(async () => {
      try {
        const latestMsgs = await ChatService.getMessages(threadId, 30);
        if (Array.isArray(latestMsgs) && latestMsgs.length > 0) {
          setMessages((prev) => {
            const map = new Map<string, ChatMessage>();
            for (const m of prev) map.set(m.id, m);
            let hasNew = false;
            for (const m of latestMsgs) {
              const existing = map.get(m.id);
              if (!existing) {
                map.set(m.id, m);
                hasNew = true;
              } else if (
                existing.content !== m.content ||
                existing.isDeleted !== m.isDeleted ||
                existing.deliveryStatus !== m.deliveryStatus
              ) {
                map.set(m.id, { ...existing, ...m });
              }
            }
            if (!hasNew && map.size === prev.length) return prev;
            return Array.from(map.values()).sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
        }
      } catch {
        // Silent poll
      }
    }, 3000);

    return () => {
      clearInterval(syncPollInterval);
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

  // @mention candidates in group composer (supports @all and group members)
  const mentionQuery = useMemo(() => {
    if (!isGroup) return null;
    const match = inputText.match(/@([a-zA-Z0-9_.\s]*)$/);
    if (!match) return null;
    const q = match[1].toLowerCase();

    const candidates: Array<{ userId: string; id: string; name: string; isAll?: boolean }> = [];
    if ('all'.includes(q) || q === '') {
      candidates.push({ userId: 'all', id: 'all', name: 'all', isAll: true });
    }
    if (groupData?.members?.length) {
      const filtered = groupData.members
        .filter(
          (m) =>
            (m.userId || m.id) !== currentUserId &&
            m.name.toLowerCase().includes(q)
        )
        .slice(0, 5);
      candidates.push(
        ...filtered.map((m) => ({
          userId: m.userId || m.id,
          id: m.id || m.userId || '',
          name: m.name,
        }))
      );
    }
    return candidates;
  }, [isGroup, groupData?.members, inputText, currentUserId]);

  const insertMention = (item: { name: string }) => {
    const replaced = inputText.replace(/@([a-zA-Z0-9_.\s]*)$/, `@${item.name} `);
    setInputText(replaced);
  };

  const renderMessageContent = (content: string, isMe: boolean) => {
    if (!content) return null;

    // Rich Map Card for Location Messages
    if (content.startsWith('📍 Location') || content.startsWith('🔴 Live Location')) {
      const isLive = content.startsWith('🔴 Live Location');
      return (
        <View style={styles.locationMessageCard}>
          <View style={styles.locationMapThumb}>
            {/* Visual map roads & park grid */}
            <View style={styles.mapGridRoadH} />
            <View style={styles.mapGridRoadV} />
            <View style={styles.mapGridPark} />
            <View style={styles.locationPinMarker}>
              <MapPin size={22} color="#EF4444" fill="#EF4444" />
            </View>
            {isLive && (
              <View style={styles.liveBadgeFloating}>
                <Radio size={12} color="#FFFFFF" />
                <Text style={styles.liveBadgeText}>LIVE GPS</Text>
              </View>
            )}
          </View>
          <View style={styles.locationInfoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationTitleText} numberOfLines={1}>
                {content.replace(/^[📍🔴]\s*/, '')}
              </Text>
              <Text style={styles.locationSubText}>
                {isLive ? 'Real-time location sharing active' : 'Accurate to 10m • Chennai HQ'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.openMapBtn}
              onPress={() => {
                const url = Platform.select({
                  ios: 'maps:13.0827,80.2707',
                  android: 'geo:13.0827,80.2707?q=13.0827,80.2707(MasterHRMS+HQ)',
                });
                if (url) Linking.openURL(url).catch(() => {});
              }}
              accessibilityRole="button"
              accessibilityLabel="Open in maps"
            >
              <Navigation size={14} color="#00D287" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Regex splits on @all or @Name
    const parts = content.split(/(@all|@[a-zA-Z0-9_]+(?:\s[a-zA-Z0-9_]+)?)/g);
    return (
      <Text style={[styles.msgBody, isMe ? styles.msgBodyMe : styles.msgBodyThem]}>
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            return (
              <Text key={index} style={styles.mentionHighlight}>
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
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
        content: `Poll: ${pollQuestion.trim()}`,
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

  const promptDeleteMessage = (msg: ChatMessage) => {
    setActionTargetMsg(null);
    setDeleteTargetMsg(msg);
    setDeleteModalOpen(true);
  };

  const handleDeleteMessage = async (msg: ChatMessage, mode: 'me' | 'everyone') => {
    setDeleteModalOpen(false);
    setDeleteTargetMsg(null);
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
            <Search size={18} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleStartCall('audio')}
            accessibilityRole="button"
            accessibilityLabel="Start audio call"
          >
            <Phone size={18} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleStartCall('video')}
            accessibilityRole="button"
            accessibilityLabel="Start video call"
          >
            <Video size={18} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setInfoOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Conversation info"
          >
            <Info size={18} color="#0F172A" />
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
                <X size={16} color="#64748B" />
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Circle size={10} color="#10B981" fill="#10B981" />
                <Text style={styles.activeMeetingText}>
                  Ongoing Group Meeting — Tap to Join
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {pinnedMessages.length > 0 && (
            <TouchableOpacity
              style={styles.pinnedBar}
              onPress={() => setPinnedIdx((i) => (i + 1) % pinnedMessages.length)}
            >
              <Pin size={16} color="#4F46E5" />
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
              <Hand size={32} color="#94A3B8" style={{ marginBottom: 10 }} />
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
              const isVoice = Boolean(
                msg.voiceNote ||
                (msg.content &&
                  (msg.content.startsWith('🎤 Voice') ||
                    msg.content.startsWith('🎤 Audio') ||
                    msg.content.includes('voice_note_sample'))) ||
                (msg.attachments &&
                  msg.attachments.some(
                    (a) =>
                      a.kind === 'audio' &&
                      (a.name.toLowerCase().includes('voice') || a.name.toLowerCase().includes('audio'))
                  ))
              );
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.msgRow,
                    isMe ? styles.msgRowRight : styles.msgRowLeft,
                    swipingMsgId === msg.id && { transform: [{ translateX: swipeOffset }] },
                  ]}
                  onTouchStart={(e: any) => {
                    touchStartX.current = e.nativeEvent?.pageX || 0;
                  }}
                  onTouchMove={(e: any) => {
                    const currentX = e.nativeEvent?.pageX || 0;
                    const dx = currentX - touchStartX.current;
                    if (dx > 10 && !msg.isDeleted) {
                        setSwipingMsgId(msg.id);
                        setSwipeOffset(Math.min(dx, 65));
                    }
                  }}
                  onTouchEnd={(e: any) => {
                    const currentX = e.nativeEvent?.pageX || 0;
                    const dx = currentX - touchStartX.current;
                    if (dx > 35 && !msg.isDeleted) {
                      setReplyMessage(msg);
                    }
                    setSwipingMsgId(null);
                    setSwipeOffset(0);
                  }}
                >
                  {swipingMsgId === msg.id && (
                    <View style={styles.swipeReplyIconWrap}>
                      <CornerUpLeft size={18} color="#00D287" />
                    </View>
                  )}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onLongPress={() => !msg.isDeleted && setActionTargetMsg(msg)}
                    style={[
                      styles.bubble,
                      isMe ? styles.bubbleMe : styles.bubbleThem,
                      isVoice && styles.bubbleVoice,
                      msg.isDeleted && styles.bubbleDeleted,
                    ]}
                  >
                    {!isMe && isGroup && !isVoice && (
                      <Text style={styles.senderLabel}>{msg.senderName}</Text>
                    )}

                    {msg.isForwarded && !msg.isDeleted && (
                      <Text style={[styles.forwardedTag, isMe && { color: '#00A86B' }]}>
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

                    {isVoice && !msg.isDeleted ? (
                      <View style={styles.voiceNoteBubbleRow}>
                        <TouchableOpacity
                          style={[styles.voicePlayBtnIcon, !isMe && styles.voicePlayBtnIconThem]}
                          onPress={() =>
                            togglePlayAudio(msg.id, msg.voiceNote?.durationSeconds || 20)
                          }
                          accessibilityRole="button"
                          accessibilityLabel={
                            playingAudioId === msg.id ? 'Pause voice note' : 'Play voice note'
                          }
                        >
                          {playingAudioId === msg.id ? (
                            <Pause size={15} color="#FFFFFF" />
                          ) : (
                            <Play size={15} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                          )}
                        </TouchableOpacity>

                        <View style={styles.voiceWaveBarsRow}>
                          {[8, 14, 20, 12, 16, 24, 18, 10, 14, 22, 16, 8, 14, 20, 12, 16, 24, 18, 10, 14, 20, 12].map(
                            (barH, i) => {
                              const isPlayed =
                                playingAudioId === msg.id &&
                                i / 22 <= (audioPlaybackProgress || 0);
                              return (
                                <View
                                  key={i}
                                  style={[
                                    styles.voiceBarItem,
                                    { height: barH },
                                    isPlayed ? styles.voiceBarItemPlayed : styles.voiceBarItemDefault,
                                  ]}
                                />
                              );
                            }
                          )}
                        </View>

                        <View style={styles.voiceMetaInline}>
                          <Text style={styles.voiceTimeInline}>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </Text>
                          {isMe && !msg.isDeleted && (
                            <CheckCheck
                              size={13}
                              color={msg.deliveryStatus === 'read' ? '#00D287' : '#94A3B8'}
                              style={{ marginLeft: 3 }}
                            />
                          )}
                        </View>
                      </View>
                    ) : (
                      <>
                        {msg.content ? (
                          msg.isDeleted ? (
                            <Text style={[styles.msgBody, styles.deletedItalic]}>{msg.content}</Text>
                          ) : (
                            renderMessageContent(msg.content, isMe)
                          )
                        ) : null}

                        {/* Attachments */}
                        {msg.attachments &&
                          msg.attachments.map((att) => (
                            <TouchableOpacity
                              key={att.id}
                              style={styles.attachmentCard}
                              onPress={() => {
                                setPreviewMedia({
                                  url: att.signedDownloadUrl || att.url,
                                  name: att.name,
                                  kind: att.kind,
                                  sender: msg.senderName,
                                });
                              }}
                            >
                              {att.kind === 'image' && att.url ? (
                                <Image
                                  source={{ uri: att.url }}
                                  style={styles.attachmentThumb}
                                  resizeMode="cover"
                                />
                              ) : null}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {att.kind === 'pdf' ? (
                                  <FileText size={14} color="#6366F1" />
                                ) : att.kind === 'audio' ? (
                                  <Music size={14} color="#6366F1" />
                                ) : (
                                  <Paperclip size={14} color="#6366F1" />
                                )}
                                <Text style={styles.attachmentName} numberOfLines={1}>
                                  {att.name}
                                  {att.size ? ` (${formatFileSize(att.size)})` : ''}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}

                        {/* Poll Card */}
                        {msg.poll && (
                          <View style={styles.pollBox}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <BarChart2 size={16} color={isMe ? '#FFFFFF' : '#4F46E5'} />
                              <Text style={[styles.pollTitle, isMe && { color: '#FFFFFF' }]}>
                                {msg.poll.question}
                              </Text>
                            </View>
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
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                                    {voted && <Check size={14} color="#4F46E5" />}
                                    <Text style={styles.pollOptLabel}>{opt.text}</Text>
                                  </View>
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
                          {msg.isPinned && <Pin size={10} color={isMe ? '#E0E7FF' : '#4F46E5'} style={{ marginRight: 4 }} />}
                          {msg.isEdited && !msg.isDeleted && (
                            <Text style={[styles.timeText, isMe && styles.timeTextMe]}>edited • </Text>
                          )}
                          <Text style={[styles.timeText, isMe && styles.timeTextMe]}>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </Text>
                          {isMe && !msg.isDeleted && (
                            <View style={{ marginLeft: 4 }}>
                              {msg.deliveryStatus === 'read' ? (
                                <CheckCheck size={12} color="#38BDF8" />
                              ) : msg.deliveryStatus === 'delivered' ? (
                                <CheckCheck size={12} color="#CBD5E1" />
                              ) : (
                                <Check size={12} color="#CBD5E1" />
                              )}
                            </View>
                          )}
                        </View>
                      </>
                    )}

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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} color="#DC2626" />
                <Text style={styles.failedDraftText} numberOfLines={2}>
                  Not delivered: {d.text}
                </Text>
              </View>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                {editingMessage ? (
                  <Edit size={14} color="#4F46E5" />
                ) : null}
                <Text style={styles.replyEditTitle}>
                  {editingMessage
                    ? 'Editing message'
                    : `Replying to ${replyMessage?.senderName}`}
                </Text>
              </View>
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
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        )}

        {/* Staged Attachments Strip */}
        {stagedAttachments.length > 0 && (
          <View style={styles.stagedStrip}>
            {stagedAttachments.map((f, idx) => (
              <View key={`${f.name}-${idx}`} style={styles.stagedChip}>
                <Paperclip size={12} color="#6366F1" style={{ marginRight: 4 }} />
                <Text style={styles.stagedChipText} numberOfLines={1}>
                  {f.name}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setStagedAttachments((prev) => prev.filter((_, i) => i !== idx))
                  }
                  style={{ marginLeft: 4 }}
                >
                  <X size={12} color="#64748B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Composer or Announcement-Only Lock Banner */}
        {isAnnouncementRestricted ? (
          <View style={styles.announcementLockBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Megaphone size={16} color="#4F46E5" />
              <Text style={styles.announcementLockText}>
                Only group owners and administrators can post in this announcement channel.
              </Text>
            </View>
          </View>
        ) : (
          <>
            {isRecordingVoice ? (
              <View style={styles.voiceRecordingBar}>
                <TouchableOpacity
                  style={styles.voiceRecordCancelBtn}
                  onPress={cancelVoiceRecording}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel voice recording"
                >
                  <Trash2 size={20} color="#EF4444" />
                </TouchableOpacity>

                <View style={styles.voiceRecordInfo}>
                  <View style={styles.voiceRecordBlinkDot} />
                  <Text style={styles.voiceRecordTimerText}>
                    0:{String(voiceRecordDuration).padStart(2, '0')}
                  </Text>
                  <View style={styles.voiceRecordLiveBars}>
                    {[12, 20, 28, 16, 24, 14, 22, 10, 18, 26].map((h, i) => (
                      <View
                        key={i}
                        style={[
                          styles.voiceRecordLiveBar,
                          { height: h * (0.6 + 0.4 * Math.sin(voiceRecordDuration + i)) },
                        ]}
                      />
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.voiceRecordSendBtn}
                  onPress={sendVoiceRecording}
                  accessibilityRole="button"
                  accessibilityLabel="Send voice note"
                >
                  <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.composerRow}>
                {/* Capsule wrapping Smile, Input, Paperclip, Camera */}
                <View style={styles.composerCapsule}>
                  <TouchableOpacity
                    style={styles.emojiToggleBtn}
                    onPress={() => setEmojiPickerOpen((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle emojis"
                  >
                    <Smile size={20} color={emojiPickerOpen ? '#00D287' : '#64748B'} />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.composerInput}
                    placeholder={isGroup ? 'Write a message (@ to mention)...' : 'Write a message...'}
                    placeholderTextColor="#94A3B8"
                    value={inputText}
                    onChangeText={handleComposerChange}
                    multiline
                  />

                  <TouchableOpacity
                    style={styles.inlineActionBtn}
                    onPress={() => setComposerMenuOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Attach file or poll"
                  >
                    <Paperclip size={19} color="#64748B" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.inlineActionBtn}
                    onPress={handleCameraCapture}
                    accessibilityRole="button"
                    accessibilityLabel="Take or send photo"
                  >
                    <Camera size={19} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Action Button: Green Circular Send or Mic Button (Matches Light UI) */}
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={
                    inputText.trim() || stagedAttachments.length > 0
                      ? handleSendOrEdit
                      : startVoiceRecording
                  }
                  disabled={sending}
                  accessibilityRole="button"
                  accessibilityLabel={inputText.trim() ? 'Send message' : 'Voice note'}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : editingMessage ? (
                    <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
                  ) : inputText.trim() || stagedAttachments.length > 0 ? (
                    <Send size={19} color="#FFFFFF" strokeWidth={2.4} />
                  ) : (
                    <Mic size={20} color="#FFFFFF" strokeWidth={2.4} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Inline Emoji Keyboard Drawer */}
            {emojiPickerOpen && (
              <View style={styles.emojiDrawer}>
                <View style={styles.emojiTabsRow}>
                  {EMOJI_CATEGORIES.map((cat, idx) => (
                    <TouchableOpacity
                      key={cat.name}
                      style={[
                        styles.emojiTabChip,
                        activeEmojiCategory === idx && styles.emojiTabChipActive,
                      ]}
                      onPress={() => setActiveEmojiCategory(idx)}
                    >
                      <Text
                        style={[
                          styles.emojiTabLabel,
                          activeEmojiCategory === idx && styles.emojiTabLabelActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.emojiCloseBtn}
                    onPress={() => setEmojiPickerOpen(false)}
                  >
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal={false}
                  contentContainerStyle={styles.emojiGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.emojiGridItem}
                      onPress={() => {
                        setInputText((prev) => prev + emoji);
                      }}
                    >
                      <Text style={styles.emojiGridChar}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>

      {/* Attachment Bottom Sheet (Matches 22_Light_Attach File to Send.png) */}
      <Modal visible={composerMenuOpen} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setComposerMenuOpen(false)}
        >
          <View style={styles.attachBottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.attachSheetTitle}>Share Content</Text>

            <View style={styles.attachGrid}>
              {/* 1. Document */}
              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={handleDocumentPick}
                accessibilityRole="button"
                accessibilityLabel="Attach document"
              >
                <View style={[styles.attachCircle, { backgroundColor: '#3B82F6' }]}>
                  <FileText size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.attachLabel}>Document</Text>
              </TouchableOpacity>

              {/* 2. Camera */}
              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={handleCameraCapture}
                accessibilityRole="button"
                accessibilityLabel="Take photo"
              >
                <View style={[styles.attachCircle, { backgroundColor: '#00D287' }]}>
                  <Camera size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.attachLabel}>Camera</Text>
              </TouchableOpacity>

              {/* 3. Gallery */}
              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={handleGalleryPick}
                accessibilityRole="button"
                accessibilityLabel="Choose from gallery"
              >
                <View style={[styles.attachCircle, { backgroundColor: '#8B5CF6' }]}>
                  <ImageIcon size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.attachLabel}>Gallery</Text>
              </TouchableOpacity>

              {/* 4. Poll */}
              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={() => {
                  setComposerMenuOpen(false);
                  setPollModalOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Create poll"
              >
                <View style={[styles.attachCircle, { backgroundColor: '#10B981' }]}>
                  <BarChart2 size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.attachLabel}>Poll</Text>
              </TouchableOpacity>

              {/* 6. Location */}
              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={handleLocationPick}
                accessibilityRole="button"
                accessibilityLabel="Share location"
              >
                <View style={[styles.attachCircle, { backgroundColor: '#EF4444' }]}>
                  <MapPin size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.attachLabel}>Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 1. Device Document Picker Modal (Single or Multiple File Access) */}
      <Modal visible={docPickerOpen} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setDocPickerOpen(false)}
        >
          <View style={styles.docPickerSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <View style={styles.docPickerHeaderRow}>
              <View>
                <Text style={styles.docPickerTitle}>Device Files & Documents</Text>
                <Text style={styles.docPickerSubTitle}>
                  Select one or multiple files to attach
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDocPickerOpen(false)}
                style={styles.docPickerCloseBtn}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.docPickerList} showsVerticalScrollIndicator={false}>
              {DEVICE_DOCUMENTS_MOCK.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <TouchableOpacity
                    key={doc.id}
                    style={[styles.docPickerCard, isSelected && styles.docPickerCardSelected]}
                    onPress={() => handleToggleSelectDoc(doc.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.docTypeBadge, { backgroundColor: doc.color }]}>
                      <Text style={styles.docTypeBadgeText}>{doc.ext}</Text>
                    </View>
                    <View style={styles.docCardInfo}>
                      <Text style={styles.docCardName} numberOfLines={1}>
                        {doc.name}
                      </Text>
                      <Text style={styles.docCardMeta}>
                        {formatFileSize(doc.size)} • Local Storage
                      </Text>
                    </View>
                    <View style={styles.docCheckboxWrap}>
                      {isSelected ? (
                        <CheckSquare size={20} color="#00D287" />
                      ) : (
                        <Square size={20} color="#94A3B8" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.docPickerFooterRow}>
              <TouchableOpacity
                style={styles.docPickerCancelBtn}
                onPress={() => {
                  setSelectedDocIds([]);
                  setDocPickerOpen(false);
                }}
              >
                <Text style={styles.docPickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.docPickerConfirmBtn,
                  selectedDocIds.length === 0 && styles.docPickerConfirmBtnDisabled,
                ]}
                disabled={selectedDocIds.length === 0}
                onPress={handleConfirmAttachDocuments}
              >
                <Text style={styles.docPickerConfirmText}>
                  {selectedDocIds.length > 0
                    ? `Attach & Send (${selectedDocIds.length})`
                    : 'Select Files'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 2. Interactive Camera Viewfinder & Capture Modal */}
      <Modal visible={cameraModalOpen} animationType="fade" transparent>
        <View style={styles.cameraBackdrop}>
          {capturedPhotoUri ? (
            /* Captured Photo Preview Screen */
            <View style={styles.cameraPreviewStage}>
              <Image
                source={{ uri: capturedPhotoUri }}
                style={styles.cameraCapturedImage}
                resizeMode="contain"
              />
              <View style={styles.cameraPreviewBar}>
                <TouchableOpacity
                  style={styles.cameraRetakeBtn}
                  onPress={() => setCapturedPhotoUri(null)}
                >
                  <RotateCcw size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.cameraRetakeText}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cameraOkSendBtn}
                  onPress={handleConfirmSendCapturedPhoto}
                >
                  <Check size={20} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text style={styles.cameraOkSendText}>OK - Send Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Live Camera Viewfinder Screen */
            <View style={styles.cameraViewfinderStage}>
              <View style={styles.cameraTopNav}>
                <TouchableOpacity
                  style={styles.cameraNavIconBtn}
                  onPress={() => setCameraModalOpen(false)}
                >
                  <X size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.cameraNavTitle}>Camera</Text>
                <View style={styles.cameraNavPlaceholder} />
              </View>

              <View style={styles.cameraFramingGuide}>
                <View style={[styles.cameraCornerGuide, styles.guideTL]} />
                <View style={[styles.cameraCornerGuide, styles.guideTR]} />
                <View style={[styles.cameraCornerGuide, styles.guideBL]} />
                <View style={[styles.cameraCornerGuide, styles.guideBR]} />
                <Text style={styles.cameraGuideHint}>Tap shutter to capture photo</Text>
              </View>

              <View style={styles.cameraBottomBar}>
                <TouchableOpacity
                  style={styles.cameraShutterOuter}
                  onPress={handleShutterSnap}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Capture photo"
                >
                  <View style={styles.cameraShutterInner} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* 3. Sent File Preview Panel (Shown after sending file to User-B) */}
      <Modal visible={Boolean(sentFilePreview)} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setSentFilePreview(null)}
        >
          <View style={styles.sentFilePreviewSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <View style={styles.sentFileSuccessRow}>
              <View style={styles.sentSuccessBadge}>
                <Check size={16} color="#00D287" strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sentFileSuccessTitle}>File Sent Successfully</Text>
                <Text style={styles.sentFileSuccessSub}>
                  Delivered to {sentFilePreview?.recipient || 'User-B'} • {sentFilePreview?.time}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSentFilePreview(null)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.sentFileDetailCard}>
              <View style={styles.sentFileIconWrap}>
                {sentFilePreview?.type?.startsWith('image') ? (
                  <ImageIcon size={24} color="#8B5CF6" />
                ) : (
                  <FileText size={24} color="#3B82F6" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sentFileName} numberOfLines={1}>
                  {sentFilePreview?.name}
                </Text>
                <Text style={styles.sentFileSize}>
                  {sentFilePreview?.size ? formatFileSize(sentFilePreview.size) : 'Ready'} • Attachment
                </Text>
              </View>
            </View>

            <View style={styles.sentFileActionsRow}>
              <TouchableOpacity
                style={styles.sentFilePreviewBtn}
                onPress={() => {
                  if (sentFilePreview) {
                    const fileObj = sentFilePreview;
                    setSentFilePreview(null);
                    setPreviewMedia({
                      url: fileObj.url,
                      name: fileObj.name,
                      kind: fileObj.type?.startsWith('image') ? 'image' : 'pdf',
                      sender: 'You',
                    });
                  }
                }}
              >
                <Eye size={16} color="#00D287" style={{ marginRight: 6 }} />
                <Text style={styles.sentFilePreviewBtnText}>View File Preview</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sentFileShareBtn}
                onPress={() => {
                  if (sentFilePreview) {
                    openOrShareAttachment({
                      url: sentFilePreview.url,
                      fileName: sentFilePreview.name,
                    });
                  }
                }}
              >
                <Share2 size={16} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={styles.sentFileShareBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 4. Location Sharing Modal (Current & Live Location with Map Preview) */}
      <Modal visible={locationModalOpen} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setLocationModalOpen(false)}
        >
          <View style={styles.locationSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <View style={styles.locationHeaderRow}>
              <View>
                <Text style={styles.locationSheetTitle}>Share Location</Text>
                <Text style={styles.locationSheetSubTitle}>
                  Send your coordinates or live location to chat
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setLocationModalOpen(false)}
                style={styles.locationCloseBtn}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Interactive Map Preview Card */}
            <View style={styles.mapPreviewCard}>
              <View style={styles.mapSurfaceGrid}>
                <View style={styles.mapSurfaceRoad1} />
                <View style={styles.mapSurfaceRoad2} />
                <View style={styles.mapSurfaceParkZone} />
                <View style={styles.mapBeaconPulse}>
                  <View style={styles.mapBeaconCore} />
                </View>
                <View style={styles.mapPinCenter}>
                  <MapPin size={24} color="#EF4444" fill="#EF4444" />
                </View>
              </View>
              <View style={styles.mapCoordBar}>
                <Text style={styles.mapAddressText} numberOfLines={1}>
                  MasterHRMS Headquarters, Tech Park, Chennai
                </Text>
                <Text style={styles.mapCoordsText}>13.0827° N, 80.2707° E</Text>
              </View>
            </View>

            {/* Location Type Selector */}
            <View style={styles.locationTypeTabsRow}>
              <TouchableOpacity
                style={[
                  styles.locationTypeTab,
                  locationType === 'current' && styles.locationTypeTabActive,
                ]}
                onPress={() => setLocationType('current')}
              >
                <MapPin
                  size={16}
                  color={locationType === 'current' ? '#00D287' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.locationTypeTabText,
                    locationType === 'current' && styles.locationTypeTabTextActive,
                  ]}
                >
                  Current Location
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.locationTypeTab,
                  locationType === 'live' && styles.locationTypeTabActive,
                ]}
                onPress={() => setLocationType('live')}
              >
                <Radio
                  size={16}
                  color={locationType === 'live' ? '#EF4444' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.locationTypeTabText,
                    locationType === 'live' && styles.locationTypeTabTextActive,
                  ]}
                >
                  Live Location
                </Text>
              </TouchableOpacity>
            </View>

            {/* Live Duration Selector (Visible when live location is selected) */}
            {locationType === 'live' && (
              <View style={styles.liveDurationSection}>
                <Text style={styles.liveDurationLabel}>Share Live Location for:</Text>
                <View style={styles.liveDurationPillsRow}>
                  {(['10m', '1h', '2h', 'custom'] as const).map((dur) => (
                    <TouchableOpacity
                      key={dur}
                      style={[
                        styles.liveDurationPill,
                        liveDuration === dur && styles.liveDurationPillActive,
                      ]}
                      onPress={() => setLiveDuration(dur)}
                    >
                      <Text
                        style={[
                          styles.liveDurationPillText,
                          liveDuration === dur && styles.liveDurationPillTextActive,
                        ]}
                      >
                        {dur === '10m' ? '10 Minutes' : dur === '1h' ? '1 Hour' : dur === '2h' ? '2 Hours' : 'Custom'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {liveDuration === 'custom' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
                    <Text style={styles.liveDurationLabel}>Minutes:</Text>
                    <TextInput
                      value={liveDurationCustomMin}
                      onChangeText={(v) => setLiveDurationCustomMin(v.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      maxLength={4}
                      style={{
                        borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8,
                        paddingHorizontal: 10, paddingVertical: 6, fontSize: 14,
                        minWidth: 80, color: '#0F172A',
                      }}
                      placeholder="e.g. 45"
                    />
                    <Text style={styles.liveDurationLabel}>min</Text>
                  </View>
                )}
              </View>
            )}

            {/* Send Location Button */}
            <TouchableOpacity style={styles.sendLocationBtn} onPress={handleSendLocation}>
              <Navigation size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.sendLocationBtnText}>
                {locationType === 'current'
                  ? 'Send Current Location'
                  : `Share Live Location (${liveDuration})`}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* In-App Fullscreen Media Preview & Download Modal */}
      <Modal visible={Boolean(previewMedia)} animationType="fade" transparent>
        <View style={styles.previewBackdrop}>
          <View style={styles.previewHeader}>
            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={() => setPreviewMedia(null)}
              accessibilityRole="button"
              accessibilityLabel="Close media preview"
            >
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {previewMedia?.name || 'Media Attachment'}
              </Text>
              {previewMedia?.sender && (
                <Text style={styles.previewSubTitle}>Sent by {previewMedia.sender}</Text>
              )}
            </View>
          </View>

          <View style={styles.previewBody}>
            {previewMedia?.kind === 'image' && previewMedia.url ? (
              <Image
                source={{ uri: previewMedia.url }}
                style={styles.previewFullImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.previewDocPlaceholder}>
                <FileText size={64} color="#00D287" />
                <Text style={styles.previewDocName}>{previewMedia?.name}</Text>
              </View>
            )}
          </View>

          <View style={styles.previewFooterBar}>
            <TouchableOpacity
              style={styles.previewActionBtn}
              onPress={async () => {
                if (!previewMedia?.url) return;
                try {
                  await downloadOrSaveMedia({
                    url: previewMedia.url,
                    fileName: previewMedia.name,
                  });
                  Alert.alert('Download Complete', 'File saved or shared successfully.');
                } catch (e: any) {
                  Alert.alert('Download Error', e?.message || 'Could not save file.');
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Download media"
            >
              <Download size={20} color="#FFFFFF" />
              <Text style={styles.previewActionBtnText}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.previewActionBtn, { backgroundColor: '#334155' }]}
              onPress={() => {
                if (previewMedia?.url) {
                  Share.share({
                    title: previewMedia.name,
                    url: previewMedia.url,
                    message: `MasterHRMS Attachment: ${previewMedia.name} - ${previewMedia.url}`,
                  });
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Share media"
            >
              <Share2 size={20} color="#FFFFFF" />
              <Text style={styles.previewActionBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
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
                  <Text style={styles.sheetItemText}>Reply</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => setForwardModalOpen(true)}
                >
                  <Text style={styles.sheetItemText}>Forward to Chats...</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => handleTogglePinMessage(actionTargetMsg)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pin size={16} color="#4F46E5" />
                    <Text style={styles.sheetItemText}>
                      {actionTargetMsg.isPinned ? 'Unpin Message' : 'Pin Message'}
                    </Text>
                  </View>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Edit size={16} color="#4F46E5" />
                      <Text style={styles.sheetItemText}>Edit Message</Text>
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => promptDeleteMessage(actionTargetMsg)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Trash2 size={16} color="#DC2626" />
                    <Text style={[styles.sheetItemText, { color: '#DC2626' }]}>
                      Delete Message...
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Message Modal (Matches 21_Light_Delete Message Modal.png) */}
      <Modal visible={deleteModalOpen && !!deleteTargetMsg} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => {
            setDeleteModalOpen(false);
            setDeleteTargetMsg(null);
          }}
        >
          <View style={styles.deleteModalCard}>
            <View style={styles.dragPill} />
            <Text style={styles.deleteModalTitle}>Delete message?</Text>
            <Text style={styles.deleteModalSubtitle}>
              You can choose to delete this message for yourself, or delete it for everyone in this chat.
            </Text>

            <View style={styles.deleteBtnContainer}>
              <TouchableOpacity
                style={styles.deleteModalConfirmBtn}
                onPress={() => deleteTargetMsg && handleDeleteMessage(deleteTargetMsg, 'me')}
                activeOpacity={0.85}
              >
                <Text style={styles.deleteModalConfirmText}>Yes, delete for me</Text>
              </TouchableOpacity>

              {deleteTargetMsg &&
                !deleteTargetMsg.isDeleted &&
                ((deleteTargetMsg.senderId === currentUserId &&
                  Date.now() - new Date(deleteTargetMsg.createdAt).getTime() < 24 * 60 * 60 * 1000) ||
                  canModerateMembers) && (
                  <TouchableOpacity
                    style={styles.deleteModalEveryoneBtn}
                    onPress={() =>
                      deleteTargetMsg && handleDeleteMessage(deleteTargetMsg, 'everyone')
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.deleteModalEveryoneText}>Delete for everyone</Text>
                  </TouchableOpacity>
                )}

              <TouchableOpacity
                style={styles.deleteModalCancelBtn}
                onPress={() => {
                  setDeleteModalOpen(false);
                  setDeleteTargetMsg(null);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
                <X size={18} color="#64748B" />
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {chosen ? (
                        <CheckSquare size={16} color="#4F46E5" />
                      ) : (
                        <Square size={16} color="#94A3B8" />
                      )}
                      <Text style={styles.sheetItemText}>{c.name}</Text>
                    </View>
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
                <X size={18} color="#64748B" />
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <X size={16} color="#FFFFFF" />
              <Text style={styles.lightboxCloseText}>Close</Text>
            </View>
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

      {/* Change Group Profile Image Modal */}
      <Modal visible={changeAvatarModalOpen} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setChangeAvatarModalOpen(false)}
        >
          <View style={[styles.sheet, { maxHeight: '80%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Choose Group Profile Image</Text>
              <TouchableOpacity onPress={() => setChangeAvatarModalOpen(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.avatarPresetSubTitle}>Select a Curated Workspace Icon:</Text>
            <View style={styles.avatarPresetGrid}>
              {PRESET_GROUP_AVATARS.map((av) => (
                <TouchableOpacity
                  key={av.id}
                  style={styles.avatarPresetCard}
                  onPress={async () => {
                    if (!resolvedGroupId) return;
                    try {
                      await ChatService.updateGroup(resolvedGroupId, { avatarUrl: av.url });
                      setChangeAvatarModalOpen(false);
                      await groupDetailQuery.refetch();
                      Alert.alert('Group Avatar Updated', `Avatar set to ${av.label}.`);
                    } catch (err: any) {
                      Alert.alert('Avatar Error', err?.message || 'Could not update avatar.');
                    }
                  }}
                >
                  <Image source={{ uri: av.url }} style={styles.avatarPresetThumb} />
                  <Text style={styles.avatarPresetLabel}>{av.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.avatarPresetSubTitle, { marginTop: 14 }]}>Or Enter Custom Image URL:</Text>
            <View style={styles.avatarCustomUrlRow}>
              <TextInput
                style={styles.avatarCustomInput}
                placeholder="https://...image.png"
                placeholderTextColor="#94A3B8"
                value={customAvatarInput}
                onChangeText={setCustomAvatarInput}
              />
              <TouchableOpacity
                style={styles.avatarCustomSaveBtn}
                onPress={async () => {
                  if (!resolvedGroupId || !customAvatarInput.trim()) return;
                  try {
                    await ChatService.updateGroup(resolvedGroupId, { avatarUrl: customAvatarInput.trim() });
                    setChangeAvatarModalOpen(false);
                    setCustomAvatarInput('');
                    await groupDetailQuery.refetch();
                    Alert.alert('Group Avatar Updated', 'Custom avatar saved.');
                  } catch (err: any) {
                    Alert.alert('Avatar Error', err?.message || 'Could not update avatar.');
                  }
                }}
              >
                <Text style={styles.avatarCustomSaveText}>Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
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
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!isGroup ? (
                participantQuery.isLoading ? (
                  <ActivityIndicator color="#00D287" style={{ marginVertical: 30 }} />
                ) : participantQuery.data ? (
                  <View style={styles.contactDetailsCard}>
                    {/* Centered Large Avatar */}
                    <View style={styles.contactDetailsAvatarWrap}>
                      {participantQuery.data.avatar ? (
                        <Image
                          source={{ uri: participantQuery.data.avatar }}
                          style={styles.contactDetailsAvatarImg}
                        />
                      ) : (
                        <View style={styles.contactDetailsAvatarCircle}>
                          <Text style={styles.contactDetailsAvatarInitials}>
                            {participantQuery.data.name.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.contactDetailsName}>{participantQuery.data.name}</Text>
                    <Text style={styles.contactDetailsRole}>
                      {participantQuery.data.designation || 'Team Member'}
                      {participantQuery.data.department ? ` • ${participantQuery.data.department}` : ''}
                    </Text>

                    {/* Quick Circular Action Buttons Row (Matches 27_Light_Contact Details.png) */}
                    <View style={styles.contactActionsRow}>
                      <TouchableOpacity
                        style={styles.contactActionBtnCol}
                        onPress={() => setInfoOpen(false)}
                      >
                        <View style={styles.contactActionBtnRound}>
                          <MessageSquare size={18} color="#00D287" />
                        </View>
                        <Text style={styles.contactActionBtnLabel}>Message</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.contactActionBtnCol}
                        onPress={() => {
                          setInfoOpen(false);
                          handleStartCall('audio');
                        }}
                      >
                        <View style={styles.contactActionBtnRound}>
                          <Phone size={18} color="#00D287" />
                        </View>
                        <Text style={styles.contactActionBtnLabel}>Audio</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.contactActionBtnCol}
                        onPress={() => {
                          setInfoOpen(false);
                          handleStartCall('video');
                        }}
                      >
                        <View style={styles.contactActionBtnRound}>
                          <Video size={18} color="#00D287" />
                        </View>
                        <Text style={styles.contactActionBtnLabel}>Video</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.contactActionBtnCol}
                        onPress={() => {
                          Share.share({
                            title: participantQuery.data.name,
                            message: `Contact: ${participantQuery.data.name} (${participantQuery.data.email})`,
                          });
                        }}
                      >
                        <View style={styles.contactActionBtnRound}>
                          <Share2 size={18} color="#00D287" />
                        </View>
                        <Text style={styles.contactActionBtnLabel}>Share</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.contactActionBtnCol}
                        onPress={() => {
                          setInfoOpen(false);
                          setSearchOpen(true);
                        }}
                      >
                        <View style={styles.contactActionBtnRound}>
                          <Search size={18} color="#00D287" />
                        </View>
                        <Text style={styles.contactActionBtnLabel}>Search</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Media, Links & Docs Section */}
                    <View style={styles.contactSectionBox}>
                      <Text style={styles.contactSectionTitle}>Media, Links and Docs</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                        {Array.isArray(sharedFilesQuery.data) && sharedFilesQuery.data.length > 0 ? (
                          sharedFilesQuery.data.slice(0, 6).map((f: any, idx: number) => (
                            <TouchableOpacity
                              key={idx}
                              style={styles.contactMediaThumbBox}
                              onPress={() => {
                                setPreviewMedia({
                                  url: f.url,
                                  name: f.name || 'Shared Media',
                                  kind: f.kind || 'image',
                                  sender: participantQuery.data.name,
                                });
                              }}
                            >
                              <Image source={{ uri: f.url }} style={styles.contactMediaThumbImg} />
                            </TouchableOpacity>
                          ))
                        ) : (
                          <Text style={styles.contactEmptyMediaText}>No recent media shared</Text>
                        )}
                      </ScrollView>
                    </View>

                    {/* Contact Settings & Actions */}
                    <View style={styles.contactSectionBox}>
                      <View style={styles.contactSettingsRow}>
                        <Text style={styles.contactSettingsLabel}>Mute Notifications</Text>
                        <Switch
                          value={isContactMuted}
                          onValueChange={setIsContactMuted}
                          trackColor={{ false: '#CBD5E1', true: '#00D287' }}
                          thumbColor="#FFFFFF"
                        />
                      </View>

                      <TouchableOpacity
                        style={styles.contactDangerRow}
                        onPress={() => setBlockModalOpen(true)}
                      >
                        <ShieldAlert size={18} color="#EF4444" />
                        <Text style={styles.contactDangerText}>Block Contact</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.contactDangerRow}
                        onPress={() => setReportModalOpen(true)}
                      >
                        <Flag size={18} color="#EF4444" />
                        <Text style={styles.contactDangerText}>Report Contact</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null
              ) : (
                <View style={{ marginBottom: 16 }}>
                  {/* Group Avatar Header (Matches 32_Light_Group Chat Room Details.png) */}
                  <View style={styles.groupAvatarHeaderSection}>
                    <View style={styles.groupAvatarWrapLarge}>
                      {groupData?.avatar ? (
                        <Image source={{ uri: groupData.avatar }} style={styles.groupAvatarImgLarge} />
                      ) : (
                        <View style={styles.groupAvatarCircleLarge}>
                          <Text style={styles.groupAvatarInitialsLarge}>
                            {(groupData?.name || title).substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {canManageGroup && (
                        <TouchableOpacity
                          style={styles.avatarEditBadge}
                          onPress={() => setChangeAvatarModalOpen(true)}
                          accessibilityRole="button"
                          accessibilityLabel="Set group profile picture"
                        >
                          <Camera size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.groupTitleLarge}>{groupData?.name || title}</Text>
                    {groupData?.description ? (
                      <Text style={styles.groupDescLarge}>{groupData.description}</Text>
                    ) : null}
                    <Text style={styles.groupMetaSub}>
                      {groupData?.memberCount ?? groupData?.members?.length ?? 0} participants
                      {groupData?.members?.find((m) => m.userId === groupData?.ownerId)?.name
                        ? ` • Created by ${groupData?.members?.find((m) => m.userId === groupData?.ownerId)?.name}`
                        : ''}
                    </Text>
                  </View>

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
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Link size={14} color="#0F172A" />
                            <Text style={styles.secondaryBtnText}>Generate/Share Invite</Text>
                          </View>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Paperclip size={14} color="#6366F1" />
                      <Text style={styles.sheetItemText} numberOfLines={1}>
                        {file.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Block Contact Modal (Matches 29_Light_Contact Details Block Modal.png) */}
      <Modal visible={blockModalOpen} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setBlockModalOpen(false)}
        >
          <View style={styles.dialogModalCard}>
            <Text style={styles.dialogModalTitle}>Block Contact?</Text>
            <Text style={styles.dialogModalSubtitle}>
              Blocked contacts will no longer be able to call you or send you messages in MasterHRMS.
            </Text>
            <View style={styles.dialogModalBtnRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setBlockModalOpen(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogDangerBtn}
                onPress={() => {
                  setBlockModalOpen(false);
                  setInfoOpen(false);
                  Alert.alert('Blocked', 'This contact has been blocked.');
                }}
              >
                <Text style={styles.dialogDangerText}>Block</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Contact Modal (Matches 30_Light_Contact Details Report Modal.png) */}
      <Modal visible={reportModalOpen} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setReportModalOpen(false)}
        >
          <View style={styles.dialogModalCard}>
            <Text style={styles.dialogModalTitle}>Report Contact?</Text>
            <Text style={styles.dialogModalSubtitle}>
              The last messages and conversation history with this contact will be forwarded to workspace HR compliance for verification.
            </Text>
            <View style={styles.dialogModalBtnRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setReportModalOpen(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogDangerBtn}
                onPress={() => {
                  setReportModalOpen(false);
                  setInfoOpen(false);
                  Alert.alert('Report Submitted', 'Your report has been sent to HR compliance.');
                }}
              >
                <Text style={styles.dialogDangerText}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Crown size={16} color="#F59E0B" />
                      <Text style={styles.sheetItemText}>Transfer Group Ownership</Text>
                    </View>
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
                <X size={18} color="#64748B" />
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {chosen ? (
                          <CheckSquare size={16} color="#4F46E5" />
                        ) : (
                          <Square size={16} color="#94A3B8" />
                        )}
                        <Text style={styles.sheetItemText}>
                          {c.name} ({c.department || c.email})
                        </Text>
                      </View>
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
    backgroundColor: '#E8F8F0',
    borderWidth: 1,
    borderColor: '#D1FAE5',
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
    color: '#00C278',
    marginBottom: 3,
  },
  forwardedTag: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#64748B',
    marginBottom: 3,
  },
  replyQuoteBox: {
    backgroundColor: 'rgba(0, 210, 135, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#00D287',
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
  },
  replyQuoteAuthor: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00A86B',
  },
  replyQuoteBody: {
    fontSize: 11,
    color: '#475569',
  },
  msgBody: {
    fontSize: 14,
    lineHeight: 22,
    includeFontPadding: false,
  },
  msgBodyMe: {
    color: '#0F172A',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  composerCapsule: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  emojiToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: '#0F172A',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#00D287',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
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
  mentionHighlight: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    fontWeight: '700',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  deleteModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  dragPill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  deleteModalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  deleteBtnContainer: {
    width: '100%',
    gap: 10,
  },
  deleteModalConfirmBtn: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteModalEveryoneBtn: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalEveryoneText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteModalCancelBtn: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1.8,
    borderColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: '#00C278',
    fontSize: 15,
    fontWeight: '700',
  },
  emojiDrawer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    height: 290,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 20,
  },
  emojiTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  emojiTabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  emojiTabChipActive: {
    backgroundColor: '#E8F8F0',
  },
  emojiTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  emojiTabLabelActive: {
    color: '#00C278',
    fontWeight: '700',
  },
  emojiCloseBtn: {
    padding: 6,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 36,
    paddingTop: 4,
  },
  emojiGridItem: {
    width: '12.5%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  emojiGridChar: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    includeFontPadding: false,
  },

  // Swipe Right Reply Indicator
  swipeReplyIconWrap: {
    position: 'absolute',
    left: 4,
    top: '35%',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8F8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Location Message In-Bubble Card
  locationMessageCard: {
    width: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 4,
  },
  locationMapThumb: {
    height: 90,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapGridRoadH: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#CBD5E1',
  },
  mapGridRoadV: {
    position: 'absolute',
    left: 100,
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: '#CBD5E1',
  },
  mapGridPark: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 70,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#D1FAE5',
  },
  locationPinMarker: {
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  liveBadgeFloating: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 3,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
  },
  locationTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationSubText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  openMapBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Document Picker Sheet
  docPickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  docPickerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  docPickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  docPickerSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  docPickerCloseBtn: {
    padding: 6,
  },
  docPickerList: {
    maxHeight: 320,
    marginBottom: 16,
  },
  docPickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    gap: 12,
  },
  docPickerCardSelected: {
    borderColor: '#00D287',
    backgroundColor: '#E8F8F0',
  },
  docTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  docCardInfo: {
    flex: 1,
  },
  docCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  docCardMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  docCheckboxWrap: {
    padding: 4,
  },
  docPickerFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docPickerCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docPickerCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  docPickerConfirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docPickerConfirmBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  docPickerConfirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Camera Viewfinder Modal
  cameraBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraViewfinderStage: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  cameraTopNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  cameraNavIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraNavTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cameraNavPlaceholder: {
    width: 40,
  },
  cameraFramingGuide: {
    height: 340,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cameraCornerGuide: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#00D287',
  },
  guideTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 10,
  },
  guideTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 10,
  },
  guideBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 10,
  },
  guideBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 10,
  },
  cameraGuideHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  cameraBottomBar: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  cameraShutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraShutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00D287',
  },
  cameraPreviewStage: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  cameraCapturedImage: {
    flex: 1,
    width: '100%',
  },
  cameraPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  cameraRetakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  cameraRetakeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cameraOkSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#00D287',
  },
  cameraOkSendText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Sent File Preview Panel
  sentFilePreviewSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sentFileSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sentSuccessBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentFileSuccessTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sentFileSuccessSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sentFileDetailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 16,
  },
  sentFileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sentFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  sentFileSize: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sentFileActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sentFilePreviewBtn: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#E8F8F0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentFilePreviewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00A86B',
  },
  sentFileShareBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentFileShareBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },

  // Location Sheet
  locationSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  locationSheetSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  locationCloseBtn: {
    padding: 6,
  },
  mapPreviewCard: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  mapSurfaceGrid: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapSurfaceRoad1: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: '#CBD5E1',
  },
  mapSurfaceRoad2: {
    position: 'absolute',
    left: 120,
    top: 0,
    bottom: 0,
    width: 20,
    backgroundColor: '#CBD5E1',
  },
  mapSurfaceParkZone: {
    position: 'absolute',
    top: 10,
    left: 14,
    width: 90,
    height: 35,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
  },
  mapBeaconPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapBeaconCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
  },
  mapPinCenter: {
    position: 'absolute',
    top: 38,
    zIndex: 2,
  },
  mapCoordBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  mapAddressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  mapCoordsText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  locationTypeTabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  locationTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  locationTypeTabActive: {
    borderColor: '#00D287',
    backgroundColor: '#E8F8F0',
  },
  locationTypeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  locationTypeTabTextActive: {
    color: '#00A86B',
    fontWeight: '700',
  },
  liveDurationSection: {
    marginBottom: 14,
  },
  liveDurationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  liveDurationPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  liveDurationPill: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  liveDurationPillActive: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  liveDurationPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  liveDurationPillTextActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  sendLocationBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#00D287',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendLocationBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  groupAvatarHeaderSection: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  groupAvatarWrapLarge: {
    position: 'relative',
    marginBottom: 10,
  },
  groupAvatarImgLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  groupAvatarCircleLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarInitialsLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  groupTitleLarge: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  groupDescLarge: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  groupMetaSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  avatarPresetSubTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  avatarPresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  avatarPresetCard: {
    width: '30%',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  avatarPresetThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 4,
  },
  avatarPresetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  avatarCustomUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  avatarCustomInput: {
    flex: 1,
    minHeight: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  avatarCustomSaveBtn: {
    paddingHorizontal: 16,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCustomSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Voice Message Bubble Layout (Matches 18_Light_Personal Chat Room Voice Message.png)
  bubbleVoice: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 220,
    maxWidth: '82%',
    borderRadius: 20,
    justifyContent: 'center',
  },
  voiceNoteBubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voicePlayBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  voicePlayBtnIconThem: {
    backgroundColor: '#00D287',
  },
  voiceWaveBarsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: 26,
    marginHorizontal: 8,
  },
  voiceBarItem: {
    width: 2.2,
    borderRadius: 1.1,
  },
  voiceBarItemDefault: {
    backgroundColor: '#00D287',
    opacity: 0.85,
  },
  voiceBarItemPlayed: {
    backgroundColor: '#059669',
  },
  voiceMetaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: 2,
    marginLeft: 4,
    flexShrink: 0,
  },
  voiceTimeInline: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  // Active Voice Recording Bar (Matches 18_Light_Personal Chat Room Voice Message.png)
  voiceRecordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  voiceRecordCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceRecordInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceRecordBlinkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  voiceRecordTimerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  voiceRecordLiveBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  voiceRecordLiveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#00D287',
  },
  voiceRecordSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Attachment Sheet Grid (Matches 22_Light_Attach File to Send.png)
  attachBottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    marginTop: 'auto',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  attachSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 20,
  },
  attachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 20,
  },
  attachGridItem: {
    width: '30%',
    alignItems: 'center',
  },
  attachCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  attachLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  // Fullscreen Media Preview Modal
  previewBackdrop: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  previewCloseBtn: {
    padding: 6,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  previewSubTitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  previewBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewFullImage: {
    width: '100%',
    height: '100%',
  },
  previewDocPlaceholder: {
    alignItems: 'center',
    padding: 24,
  },
  previewDocName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  previewFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    gap: 16,
  },
  previewActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00D287',
    paddingVertical: 12,
    borderRadius: 14,
  },
  previewActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Contact Details (Matches 27_Light_Contact Details.png)
  contactDetailsCard: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  contactDetailsAvatarWrap: {
    marginBottom: 12,
  },
  contactDetailsAvatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#00D287',
  },
  contactDetailsAvatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactDetailsAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  contactDetailsName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  contactDetailsRole: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  contactActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  contactActionBtnCol: {
    alignItems: 'center',
  },
  contactActionBtnRound: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 210, 135, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactActionBtnLabel: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  contactSectionBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  contactSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactMediaThumbBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
  },
  contactMediaThumbImg: {
    width: '100%',
    height: '100%',
  },
  contactEmptyMediaText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 6,
  },
  contactSettingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  contactSettingsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  contactDangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  contactDangerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  // Dialog Modals (Matches 29_Light & 30_Light)
  dialogModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    marginVertical: 'auto',
  },
  dialogModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  dialogModalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  dialogModalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogCancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  dialogDangerBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogDangerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
