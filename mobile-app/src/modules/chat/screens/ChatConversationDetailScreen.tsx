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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAudioPlayer,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  RecordingPresets,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import { Text } from '../../../components/common/Text';
import {
  Search,
  Video,
  Phone,
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
  Eye,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Archive,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { WorkspaceModuleShell } from '../../../components/workspace/WorkspaceModuleShell';
import { createTenantQueryKey } from '../../../core/query/tenantQueryKeys';
import { useAuthStore } from '../../../store/authStore';
import { usePermission } from '../../../hooks/usePermission';
import { realtimeManager } from '../../../core/realtime/realtimeManager';
import {
  formatFileSize,
  openOrShareAttachment,
  downloadOrSaveMedia,
  resolveAttachmentFileType,
  MAX_CHAT_ATTACHMENTS_PER_MESSAGE,
  MAX_CHAT_FILE_SIZE_BYTES,
} from '../../../core/storage/attachmentHelper';
import { ChatImageAlbum } from '../components/ChatImageAlbum';
import {
  requestMicrophonePermission,
} from '../../../core/services/permissionService';
import {
  ChatService,
  ChatMessage,
  ChatParticipant,
  ChatAttachment,
  UploadableFileDescriptor,
  normalizeChatMessage,
  deduplicateMessages,
  prependOlderMessages,
} from '../../../core/services/chatService';
import { CallOptionsBottomSheet } from '../../../components/calling/CallOptionsBottomSheet';
import { GroupCallSetupModal } from '../../../components/calling/GroupCallSetupModal';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export const format12HourTime = (dateInput?: string | Date | number): string => {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${minutesStr} ${ampm}`;
  } catch {
    return '';
  }
};

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥'];

const PRESET_GROUP_AVATARS = [
  { id: 'office', label: 'Office', url: 'https://api.dicebear.com/7.x/identicon/png?seed=office&backgroundColor=00d287' },
  { id: 'tech', label: 'Tech & Dev', url: 'https://api.dicebear.com/7.x/identicon/png?seed=tech&backgroundColor=4f46e5' },
  { id: 'team', label: 'People / HR', url: 'https://api.dicebear.com/7.x/identicon/png?seed=people&backgroundColor=f59e0b' },
  { id: 'sales', label: 'Growth / Sales', url: 'https://api.dicebear.com/7.x/identicon/png?seed=sales&backgroundColor=10b981' },
  { id: 'design', label: 'Design & UI', url: 'https://api.dicebear.com/7.x/identicon/png?seed=design&backgroundColor=ec4899' },
  { id: 'support', label: 'Support / Ops', url: 'https://api.dicebear.com/7.x/identicon/png?seed=support&backgroundColor=06b6d4' },
];

const EMOJI_CATEGORIES = [
  { name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😜', '🤪', '😎'] },
  { name: 'Gestures', emojis: ['👍', '👎', '👏', '🙌', '🤝', '👊', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '👈', '👉', '👆', '👇', '✋', '👋', '🙏'] },
  { name: 'Reactions', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '💔', '🔥', '✨', '💯', '🎉', '🚀', '⭐', '💥', '👀', '💡', '🏆'] },
  { name: 'Work', emojis: ['💼', '📁', '📊', '📈', '📌', '📎', '📝', '📅', '🕒', '🔔', '💻', '📱', '🔒', '🔑', '☕', '🏢'] },
];

export const ChatConversationDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    insets = useSafeAreaInsets();
  } catch {
    // Fallback if rendered outside SafeAreaProvider
  }

  const {
    threadId = '',
    title = 'Conversation',
    type = 'direct',
    groupId: paramGroupId,
    otherParticipantId,
    avatarUrl,
    isAnnouncementOnly: paramAnnouncementOnly,
  } = route.params || {};

  const isGroup = type === 'group' || type === 'announcement' || threadId.startsWith('group_');
  const resolvedGroupId =
    paramGroupId || (threadId.startsWith('group_') ? threadId.slice('group_'.length) : undefined);

  const user = useAuthStore((s) => s.user);
  const { activeRole } = usePermission();
  const currentUserId = user?.id || '';

  const handleStartCall = useCallback(
    (callType: 'audio' | 'video') => {
      if (isGroup) {
        navigation.navigate('ChatCall', {
          threadId,
          groupId: resolvedGroupId,
          groupName: title,
          callType,
          isGroupMeeting: true,
          initialStatus: 'connected',
        });
      } else {
        const receiverId = otherParticipantId || threadId;
        navigation.navigate('ChatCall', {
          receiverId,
          receiverName: title || 'Colleague',
          receiverAvatar: avatarUrl,
          callType,
          threadId,
          isIncoming: false,
        });
      }
    },
    [isGroup, resolvedGroupId, title, otherParticipantId, threadId, avatarUrl, navigation]
  );

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

  // Calling Sheets
  const [callOptionsOpen, setCallOptionsOpen] = useState(false);
  const [groupSetupOpen, setGroupSetupOpen] = useState(false);
  const [addMembersModalOpen, setAddMembersModalOpen] = useState(false);
  const [selectedAddMemberIds, setSelectedAddMemberIds] = useState<string[]>([]);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editAnnouncementOnly, setEditAnnouncementOnly] = useState(false);
  const [memberActionTarget, setMemberActionTarget] = useState<ChatParticipant | null>(null);

  const scrollViewRef = useRef<any>(null);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number>(0);

  // Audio Note Playback State via expo-audio (Matches 18_Light_Personal Chat Room Voice Message.png)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlaybackProgress, setAudioPlaybackProgress] = useState<number>(0);
  const activePlayerRef = useRef<AudioPlayer | null>(null);
  const activePlayerSubRef = useRef<{ remove: () => void } | null>(null);

  // Voice Note Recording State via expo-audio (Matches 18_Light_Personal Chat Room Voice Message.png)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordDuration, setVoiceRecordDuration] = useState(0);
  const voiceRecordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    if (status.hasError && status.error) {
      console.warn('[AudioRecorder] Recording status error:', status.error);
    }
  });

  // In-App Fullscreen Multi-Image & Media Gallery State (WhatsApp style)
  const [galleryViewer, setGalleryViewer] = useState<{
    items: ChatAttachment[];
    currentIndex: number;
    senderName?: string;
  } | null>(null);

  const setPreviewMedia = (media: { url: string; name: string; kind: string; sender?: string } | null) => {
    if (!media) {
      setGalleryViewer(null);
    } else {
      setGalleryViewer({
        items: [
          {
            id: 'preview_single',
            name: media.name,
            url: media.url,
            kind: (media.kind as any) || 'image',
          },
        ],
        currentIndex: 0,
        senderName: media.sender,
      });
    }
  };

  // Contact Details Settings & Modals (27_Light to 30_Light)
  const [isContactMuted, setIsContactMuted] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Pre-Send Media Preview State (WhatsApp style: Select -> Preview -> Send)
  const [pendingSendMedia, setPendingSendMedia] = useState<{
    files: UploadableFileDescriptor[];
    kind: 'image' | 'document' | 'camera';
  } | null>(null);
  const [currentCarouselIdx, setCurrentCarouselIdx] = useState(0);
  const [mediaCaptionText, setMediaCaptionText] = useState('');
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');

  // Message layout tracker for auto-scrolling to pinned / quoted messages
  const messageLayouts = useRef<Record<string, number>>({});

  const scrollToMessage = useCallback((msgId: string) => {
    const y = messageLayouts.current[msgId];
    if (typeof y === 'number' && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, y - 50), animated: true });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (activePlayerSubRef.current) {
        activePlayerSubRef.current.remove();
        activePlayerSubRef.current = null;
      }
      if (activePlayerRef.current) {
        try {
          activePlayerRef.current.pause();
          activePlayerRef.current.remove?.();
          (activePlayerRef.current as any)?.release?.();
        } catch (_) {}
        activePlayerRef.current = null;
      }
      if (voiceRecordTimerRef.current) clearInterval(voiceRecordTimerRef.current);
      if (audioRecorder.isRecording) {
        audioRecorder.stop().catch(() => {});
      }
    };
  }, []);

  // Sent File Preview Panel State (displayed after sending file to User-B)
  const [sentFilePreview, setSentFilePreview] = useState<{
    name: string;
    size?: number;
    type?: string;
    url: string;
    time: string;
    recipient: string;
  } | null>(null);

  // Swipe Right to Reply State
  const [swipingMsgId, setSwipingMsgId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  // Toggle audio note playback with real sound via expo-audio
  const togglePlayAudio = async (msgId: string, _durationSec = 20, audioUrl?: string) => {
    // If currently playing this message, pause and release
    if (playingAudioId === msgId) {
      if (activePlayerSubRef.current) {
        activePlayerSubRef.current.remove();
        activePlayerSubRef.current = null;
      }
      if (activePlayerRef.current) {
        try {
          activePlayerRef.current.pause();
          activePlayerRef.current.remove?.();
          (activePlayerRef.current as any)?.release?.();
        } catch (_) {}
        activePlayerRef.current = null;
      }
      setPlayingAudioId(null);
      setAudioPlaybackProgress(0);
      return;
    }

    // Stop and release any existing player before playing a different voice note
    if (activePlayerSubRef.current) {
      activePlayerSubRef.current.remove();
      activePlayerSubRef.current = null;
    }
    if (activePlayerRef.current) {
      try {
        activePlayerRef.current.pause();
        activePlayerRef.current.remove?.();
        (activePlayerRef.current as any)?.release?.();
      } catch (_) {}
      activePlayerRef.current = null;
    }

    if (!audioUrl) {
      setPlayingAudioId(null);
      setAudioPlaybackProgress(0);
      Alert.alert('Playback Error', 'Voice note audio URL is missing or unavailable.');
      return;
    }

    setPlayingAudioId(msgId);
    setAudioPlaybackProgress(0);

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
      }).catch(() => {});

      const player = createAudioPlayer(audioUrl, { updateInterval: 100 });
      activePlayerRef.current = player;

      const sub = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (status.isLoaded) {
          if (status.duration && status.duration > 0) {
            const prog = Math.min(Math.max(status.currentTime / status.duration, 0), 1);
            setAudioPlaybackProgress(prog);
          }
          if (status.didJustFinish) {
            setPlayingAudioId(null);
            setAudioPlaybackProgress(0);
            sub.remove();
            activePlayerSubRef.current = null;
            try {
              player.remove?.();
              (player as any)?.release?.();
            } catch (_) {}
            activePlayerRef.current = null;
          }
        }
        if (status.error) {
          console.warn('[Audio] Playback status error:', status.error);
          setPlayingAudioId(null);
          setAudioPlaybackProgress(0);
          sub.remove();
          activePlayerSubRef.current = null;
          try {
            player.remove?.();
            (player as any)?.release?.();
          } catch (_) {}
          activePlayerRef.current = null;
          Alert.alert('Audio Playback Error', status.error || 'Failed to play audio.');
        }
      });
      activePlayerSubRef.current = sub;

      player.play();
    } catch (err: any) {
      console.warn('[Audio] Failed to create or play audio player:', err);
      setPlayingAudioId(null);
      setAudioPlaybackProgress(0);
      if (activePlayerSubRef.current) {
        activePlayerSubRef.current.remove();
        activePlayerSubRef.current = null;
      }
      activePlayerRef.current = null;
      Alert.alert('Playback Failed', err?.message || 'Could not play voice note.');
    }
  };

  // Start Voice Recording (Matches 18_Light_Personal Chat Room Voice Message.png)
  const startVoiceRecording = async () => {
    try {
      let isGranted = false;
      try {
        const perm = await requestRecordingPermissionsAsync();
        isGranted = Boolean(perm?.granted);
      } catch (_) {
        isGranted = false;
      }

      if (!isGranted) {
        const fallbackGranted = await requestMicrophonePermission();
        if (!fallbackGranted) {
          Alert.alert('Microphone Permission', 'Microphone access is required to record voice notes.');
          return;
        }
      }

      // Stop any active audio playback before recording
      if (activePlayerSubRef.current) {
        activePlayerSubRef.current.remove();
        activePlayerSubRef.current = null;
      }
      if (activePlayerRef.current) {
        try {
          activePlayerRef.current.pause();
          activePlayerRef.current.remove?.();
          (activePlayerRef.current as any)?.release?.();
        } catch (_) {}
        activePlayerRef.current = null;
      }
      setPlayingAudioId(null);
      setAudioPlaybackProgress(0);

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      }).catch(() => {});

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setComposerMenuOpen(false);
      setIsRecordingVoice(true);
      setVoiceRecordDuration(0);
      if (voiceRecordTimerRef.current) clearInterval(voiceRecordTimerRef.current);
      voiceRecordTimerRef.current = setInterval(() => {
        setVoiceRecordDuration((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('[AudioRecorder] Start voice recording error:', err);
      Alert.alert('Recording Error', err?.message || 'Could not start audio recording.');
      setIsRecordingVoice(false);
      setVoiceRecordDuration(0);
    }
  };

  const cancelVoiceRecording = async () => {
    if (voiceRecordTimerRef.current) clearInterval(voiceRecordTimerRef.current);
    try {
      if (audioRecorder.isRecording) {
        await audioRecorder.stop().catch(() => {});
      }
    } catch (_) {}
    setIsRecordingVoice(false);
    setVoiceRecordDuration(0);
  };

  const sendVoiceRecording = async () => {
    if (voiceRecordTimerRef.current) clearInterval(voiceRecordTimerRef.current);
    const finalDuration = Math.max(voiceRecordDuration, 1);
    setIsRecordingVoice(false);
    setVoiceRecordDuration(0);

    try {
      if (audioRecorder.isRecording) {
        await audioRecorder.stop();
      }

      const recordedUri = audioRecorder.uri;
      if (!recordedUri) {
        Alert.alert('Recording Failed', 'No audio file recorded from microphone.');
        return;
      }

      const fileName = `voice_note_${Date.now()}.m4a`;
      const uploadCandidate: UploadableFileDescriptor = {
        uri: recordedUri,
        name: fileName,
        type: 'audio/m4a',
      };

      // Upload recorded audio to the existing backend upload endpoint
      const uploadedAttachments = await ChatService.uploadAttachments([uploadCandidate], threadId);
      if (!uploadedAttachments || uploadedAttachments.length === 0) {
        Alert.alert('Upload Failed', 'Failed to upload voice note to the server.');
        return;
      }

      const uploadedAudio = uploadedAttachments[0];
      const clientTempId = `mob_voice_${Date.now()}`;

      const sent = await ChatService.sendMessage({
        threadId,
        content: `🎤 Voice note (${finalDuration}s)`,
        clientTempId,
        voiceNote: {
          durationSeconds: finalDuration,
          url: uploadedAudio.url,
          mediaId: uploadedAudio.mediaId || uploadedAudio.id,
        },
        attachments: uploadedAttachments,
      });

      setMessages((prev) => deduplicateMessages([sent], prev));
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err: any) {
      console.warn('[AudioRecorder] Send voice note failed:', err);
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
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];

      let realSize = asset.fileSize;
      if (!realSize || realSize <= 0) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(asset.uri);
          if (fileInfo.exists && typeof (fileInfo as any).size === 'number') {
            realSize = (fileInfo as any).size;
          }
        } catch {
          realSize = undefined;
        }
      }

      const photoFile: UploadableFileDescriptor = {
        uri: asset.uri,
        name: asset.fileName || `camera_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        size: realSize || 0,
      };

      // WhatsApp flow: Show full-screen pre-send preview BEFORE sending
      setPendingSendMedia({
        files: [photoFile],
        kind: 'camera',
      });
      setMediaCaptionText('');
    } catch (err: any) {
      Alert.alert('Camera Error', err?.message || 'Could not access camera.');
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
        mediaTypes: ['images', 'videos'],
        quality: 0.85,
        allowsMultipleSelection: true,
        selectionLimit: MAX_CHAT_ATTACHMENTS_PER_MESSAGE,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      if (result.assets.length > MAX_CHAT_ATTACHMENTS_PER_MESSAGE) {
        Alert.alert(
          'Attachment Limit Exceeded',
          `You can select up to ${MAX_CHAT_ATTACHMENTS_PER_MESSAGE} images at once. Please re-select.`
        );
        return;
      }

      const newFiles: UploadableFileDescriptor[] = await Promise.all(
        result.assets.map(async (asset, i) => {
          let realSize = asset.fileSize;
          if (!realSize || realSize <= 0) {
            try {
              const fileInfo = await FileSystem.getInfoAsync(asset.uri);
              if (fileInfo.exists && typeof (fileInfo as any).size === 'number') {
                realSize = (fileInfo as any).size;
              }
            } catch {
              realSize = undefined;
            }
          }
          return {
            uri: asset.uri,
            name: asset.fileName || `photo_${Date.now()}_${i}.jpg`,
            type: asset.mimeType || 'image/jpeg',
            size: realSize || 0,
          };
        })
      );

      const oversized = newFiles.find((f) => (f.size || 0) > MAX_CHAT_FILE_SIZE_BYTES);
      if (oversized) {
        Alert.alert(
          'File Size Limit Exceeded',
          `"${oversized.name}" exceeds the maximum allowed upload limit of 30 MB.`
        );
        return;
      }

      // WhatsApp flow: Show pre-send preview BEFORE sending
      setPendingSendMedia({
        files: newFiles,
        kind: 'image',
      });
      setMediaCaptionText('');
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Could not select photo.');
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

      // WhatsApp flow: Show pre-send preview BEFORE sending
      setPendingSendMedia({
        files: newFiles,
        kind: 'document',
      });
      setMediaCaptionText('');
    } catch (err: any) {
      Alert.alert('Document Pick Failed', err?.message || 'Could not select document.');
    }
  };

  const handleConfirmSendPendingMedia = async () => {
    if (!pendingSendMedia || pendingSendMedia.files.length === 0 || sending) return;
    const { files, kind } = pendingSendMedia;
    const caption = mediaCaptionText.trim();
    setSending(true);

    try {
      const uploadedAttachments = await ChatService.uploadAttachments(files, threadId);
      const prefix = kind === 'camera' ? 'mob_cam_' : kind === 'document' ? 'mob_doc_' : 'mob_gal_';
      const defaultContent =
        kind === 'document' && !caption
          ? `Attached ${files.length} file${files.length > 1 ? 's' : ''}`
          : caption;

      const sent = await ChatService.sendMessage({
        threadId,
        content: defaultContent,
        attachments: uploadedAttachments,
        clientTempId: `${prefix}${Date.now()}`,
      });
      setMessages((prev) => deduplicateMessages([sent], prev));
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);

      const primary = files[0];
      setSentFilePreview({
        name: primary.name,
        size: primary.size,
        type: primary.type,
        url: primary.uri,
        time: format12HourTime(new Date()),
        recipient: title || 'User',
      });

      setPendingSendMedia(null);
      setMediaCaptionText('');
    } catch (err: any) {
      Alert.alert('Send Failed', err?.message || 'Could not send attachment.');
    } finally {
      setSending(false);
    }
  };

  const handleCancelPendingMedia = () => {
    setPendingSendMedia(null);
    setCurrentCarouselIdx(0);
    setMediaCaptionText('');
  };

  const handleRemoveCurrentPendingFile = () => {
    if (!pendingSendMedia) return;
    const updated = pendingSendMedia.files.filter((_, idx) => idx !== currentCarouselIdx);
    if (updated.length === 0) {
      setPendingSendMedia(null);
      setCurrentCarouselIdx(0);
      setMediaCaptionText('');
    } else {
      setPendingSendMedia({ ...pendingSendMedia, files: updated });
      if (currentCarouselIdx >= updated.length) {
        setCurrentCarouselIdx(updated.length - 1);
      }
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
    enabled: addMembersModalOpen || forwardModalOpen,
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
      setMessages(deduplicateMessages(page.messages));
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
      setMessages((prev) => prependOlderMessages(olderPage.messages, prev));
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
        const incomingRaw = payload?.message ? payload.message : payload;
        if (!incomingRaw) return;
        const incoming = normalizeChatMessage(incomingRaw);
        if (!incoming.id && !incoming.clientTempId) return;

        setMessages((prev) => deduplicateMessages([incoming], prev));

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
    ];

    // Background sync polling: keeps messages 100% in sync with webapp even during socket renegotiation
    const syncPollInterval = setInterval(async () => {
      try {
        const latestMsgs = await ChatService.getMessages(threadId, 30);
        if (Array.isArray(latestMsgs) && latestMsgs.length > 0) {
          setMessages((prev) => deduplicateMessages(latestMsgs, prev));
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
  }, [threadId, currentUserId, resolvedGroupId, loadInitialMessages, navigation]);

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
      const bracketMatch = content.match(/\[([+-]?\d+(?:\.\d+)?),\s*([+-]?\d+(?:\.\d+)?)\]/);
      const degreeMatch = content.match(/([+-]?\d+(?:\.\d+)?)°\s*([NS])?,\s*([+-]?\d+(?:\.\d+)?)°\s*([EW])?/i);
      let parsedLat: number | null = null;
      let parsedLng: number | null = null;
      if (bracketMatch) {
        parsedLat = parseFloat(bracketMatch[1]);
        parsedLng = parseFloat(bracketMatch[2]);
      } else if (degreeMatch) {
        parsedLat = parseFloat(degreeMatch[1]);
        if (degreeMatch[2]?.toUpperCase() === 'S') parsedLat = -parsedLat;
        parsedLng = parseFloat(degreeMatch[3]);
        if (degreeMatch[4]?.toUpperCase() === 'W') parsedLng = -parsedLng;
      }

      const displayTitle = content
        .replace(/^[📍🔴]\s*(?:Location:\s*)?/, '')
        .replace(/\s*\[.*?\]/, '')
        .replace(/\s*\(.*?°.*?\)/, '')
        .trim();

      const subtitle = parsedLat !== null && parsedLng !== null
        ? `${parsedLat.toFixed(4)}°, ${parsedLng.toFixed(4)}° • GPS Location`
        : 'Shared GPS Location';

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
                {displayTitle || 'Current Location'}
              </Text>
              <Text style={styles.locationSubText}>{subtitle}</Text>
            </View>
            <TouchableOpacity
              style={styles.openMapBtn}
              onPress={() => {
                if (parsedLat !== null && parsedLng !== null) {
                  const queryLabel = encodeURIComponent(displayTitle || 'Shared Location');
                  const url = Platform.select({
                    ios: `maps:${parsedLat},${parsedLng}?q=${queryLabel}`,
                    android: `geo:${parsedLat},${parsedLng}?q=${parsedLat},${parsedLng}(${queryLabel})`,
                  });
                  if (url) Linking.openURL(url).catch(() => {});
                }
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

  const isPlaceholderContent = (content?: string) => {
    if (!content) return true;
    const trimmed = content.trim();
    if (!trimmed) return true;
    if (/^attached\s+\d+\s+files?$/i.test(trimmed)) return true;
    if (/^attached\s+file$/i.test(trimmed)) return true;
    if (/^mob_(cam|doc|gal)_\d+$/i.test(trimmed)) return true;
    if (trimmed.toLowerCase() === 'attachment' || trimmed.toLowerCase() === 'attached') return true;
    return false;
  };

  const shouldRenderContent = (content?: string) => {
    if (!content) return false;
    return !isPlaceholderContent(content);
  };

  const renderFileTypeIcon = (_kind?: string, mimeType?: string, fileName?: string, size = 18) => {
    const fileType = resolveAttachmentFileType(mimeType, fileName);
    switch (fileType) {
      case 'pdf':
        return <FileText size={size} color="#EF4444" />;
      case 'word':
        return <FileText size={size} color="#2563EB" />;
      case 'excel':
        return <FileSpreadsheet size={size} color="#10B981" />;
      case 'ppt':
        return <Presentation size={size} color="#F97316" />;
      case 'txt':
        return <FileCode size={size} color="#64748B" />;
      case 'archive':
        return <Archive size={size} color="#D97706" />;
      case 'audio':
        return <Music size={size} color="#8B5CF6" />;
      case 'video':
        return <Video size={size} color="#EC4899" />;
      case 'image':
        return <ImageIcon size={size} color="#06B6D4" />;
      default:
        return <FileText size={size} color="#64748B" />;
    }
  };

  const getFileTypeBadge = (mimeType?: string, fileName?: string) => {
    const fileType = resolveAttachmentFileType(mimeType, fileName);
    switch (fileType) {
      case 'pdf':
        return { label: 'PDF', bg: '#FEE2E2', color: '#EF4444' };
      case 'word':
        return { label: 'DOC', bg: '#DBEAFE', color: '#2563EB' };
      case 'excel':
        return { label: 'XLS', bg: '#D1FAE5', color: '#10B981' };
      case 'ppt':
        return { label: 'PPT', bg: '#FFEDD5', color: '#F97316' };
      case 'txt':
        return { label: 'TXT', bg: '#F1F5F9', color: '#64748B' };
      case 'archive':
        return { label: 'ZIP', bg: '#FEF3C7', color: '#D97706' };
      case 'audio':
        return { label: 'AUDIO', bg: '#EDE9FE', color: '#8B5CF6' };
      case 'video':
        return { label: 'VIDEO', bg: '#FCE7F3', color: '#EC4899' };
      case 'image':
        return { label: 'IMG', bg: '#CFFAFE', color: '#06B6D4' };
      default:
        return { label: 'FILE', bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  const renderSingleAttachment = (att: any, senderName: string, isMe?: boolean, customStyle?: any) => {
    const fileType = resolveAttachmentFileType(att.mimeType, att.name);
    const badge = getFileTypeBadge(att.mimeType, att.name);
    const isImg = fileType === 'image' && Boolean(att.url);

    return (
      <TouchableOpacity
        key={att.id || att.mediaId || att.name}
        style={[
          styles.attachmentCard,
          isMe ? styles.attachmentCardMe : styles.attachmentCardThem,
          customStyle,
        ]}
        activeOpacity={0.88}
        onPress={() => {
          if (isImg) {
            setGalleryViewer({
              items: [att],
              currentIndex: 0,
              senderName,
            });
          } else {
            void openOrShareAttachment({
              url: att.signedDownloadUrl || att.url,
              mediaId: att.mediaId,
              fileName: att.name,
            });
          }
        }}
      >
        {isImg ? (
          <Image
            source={{ uri: att.url || att.signedPreviewUrl || att.signedDownloadUrl }}
            style={styles.attachmentThumb}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.docAttachmentHeader}>
            <View style={[styles.fileTypeBadge, { backgroundColor: badge.bg }]}>
              {renderFileTypeIcon(att.kind, att.mimeType, att.name, 16)}
              <Text style={[styles.fileTypeBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
            <View style={styles.docAttachmentMeta}>
              <Text style={styles.attachmentName} numberOfLines={1}>
                {att.name}
              </Text>
              <Text style={styles.attachmentSizeText}>
                {formatFileSize(att.size)} • Tap to open
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderAttachmentsGrid = (attachments: any[], senderName: string, isMe?: boolean) => {
    if (!attachments || attachments.length === 0) return null;

    const imageAttachments = attachments.filter((a) => a.kind === 'image');
    const otherAttachments = attachments.filter((a) => a.kind !== 'image');

    return (
      <View style={styles.attachmentGridContainer}>
        {imageAttachments.length > 0 && (
          <ChatImageAlbum
            images={imageAttachments}
            isMe={isMe}
            onPressImage={(index) => {
              setGalleryViewer({
                items: imageAttachments,
                currentIndex: index,
                senderName,
              });
            }}
          />
        )}
        {otherAttachments.length > 0 && (
          <View style={imageAttachments.length > 0 ? { marginTop: 6 } : undefined}>
            {otherAttachments.map((att) =>
              renderSingleAttachment(att, senderName, isMe)
            )}
          </View>
        )}
      </View>
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

      setMessages((prev) => deduplicateMessages([sent], prev));
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
      setMessages((prev) => deduplicateMessages([sent], prev));
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
      setMessages((prev) => deduplicateMessages([sent], prev));
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
      const finalThreadIds: string[] = [];
      for (const tid of forwardThreadIds) {
        if (tid.startsWith('user_')) {
          const targetUserId = tid.slice('user_'.length);
          const directConv = await ChatService.createDirectConversation(targetUserId);
          finalThreadIds.push(directConv.threadId);
        } else {
          finalThreadIds.push(tid);
        }
      }

      const res = await ChatService.forwardMessageBatch(actionTargetMsg.id, finalThreadIds);
      setForwardModalOpen(false);
      setActionTargetMsg(null);
      setForwardThreadIds([]);
      setForwardSearchQuery('');
      Alert.alert('Forwarded', `Message forwarded to ${res.forwardedCount} recipient(s).`);
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
    // Canonical entity ID deduplication ensuring unique keys
    const seen = new Set<string>();
    const unique: ChatMessage[] = [];
    for (const m of messages) {
      const canonicalKey = String(m.id || m.clientTempId || '').trim();
      if (!canonicalKey || seen.has(canonicalKey)) continue;
      seen.add(canonicalKey);
      if (m.clientTempId) {
        seen.add(String(m.clientTempId).trim());
      }
      unique.push(m);
    }

    if (!threadSearch.trim()) return unique;
    const q = threadSearch.trim().toLowerCase();
    return unique.filter(
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
      hideBottomNav
      backgroundColor="#0B141A"
      headerBackgroundColor="#101820"
      title={groupData?.name || title}
      subtitle={subtitleText}
      rightActions={
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleStartCall('video')}
            onLongPress={() => setCallOptionsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Video Call"
          >
            <Video size={19} color="#E9EDEF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleStartCall('audio')}
            onLongPress={() => setCallOptionsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Audio Call"
          >
            <Phone size={18} color="#E9EDEF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setSearchOpen((s) => !s)}
            accessibilityRole="button"
            accessibilityLabel="Search in conversation"
          >
            <Search size={18} color="#E9EDEF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setInfoOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Conversation info"
          >
            <Info size={18} color="#E9EDEF" />
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
              const msgKey = String(msg.id || msg.clientTempId || '').trim();
              if (msg.isSystemEvent) {
                return (
                  <View key={msgKey} style={styles.systemPill}>
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
                  key={msgKey}
                  onLayout={(e) => {
                    if (msgKey) {
                      messageLayouts.current[msgKey] = e.nativeEvent.layout.y;
                    }
                  }}
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
                      <TouchableOpacity
                        style={styles.replyQuoteBox}
                        activeOpacity={0.8}
                        onPress={() => {
                          const targetId = msg.replyTo?.id || msg.replyToId;
                          if (targetId) scrollToMessage(targetId);
                        }}
                      >
                        <Text style={styles.replyQuoteAuthor}>{msg.replyTo.senderName}</Text>
                        <Text style={styles.replyQuoteBody} numberOfLines={2}>
                          {msg.replyTo.content || '[Attachment]'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {isVoice && !msg.isDeleted ? (
                      <View style={styles.voiceNoteBubbleRow}>
                        <TouchableOpacity
                          style={[styles.voicePlayBtnIcon, !isMe && styles.voicePlayBtnIconThem]}
                          onPress={() => {
                            const audioUrl =
                              msg.voiceNote?.url ||
                              (msg.attachments && msg.attachments.find((a) => a.kind === 'audio')?.url);
                            togglePlayAudio(msg.id, msg.voiceNote?.durationSeconds || 20, audioUrl);
                          }}
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
                            {format12HourTime(msg.createdAt)}
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
                        {/* 1. ATTACHMENTS FIRST (GAP 1.3 & GAP 1.5) */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <View style={styles.bubbleAttachmentsWrap}>
                            {renderAttachmentsGrid(msg.attachments, msg.senderName, isMe)}
                          </View>
                        )}

                        {/* 2. CAPTION / TEXT CONTENT BELOW ATTACHMENT (GAP 1.3 & Phase 3) */}
                        {shouldRenderContent(msg.content) ? (
                          msg.isDeleted ? (
                            <Text style={[styles.msgBody, styles.deletedItalic]}>{msg.content}</Text>
                          ) : (
                            renderMessageContent(msg.content, isMe)
                          )
                        ) : null}

                        {/* Poll Card */}
                        {msg.poll && (
                          <View style={styles.pollBox}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <BarChart2 size={16} color={isMe ? '#FFFFFF' : '#4F46E5'} />
                              <Text style={[styles.pollTitle, isMe && { color: '#FFFFFF' }]}>
                                {msg.poll.question}
                              </Text>
                            </View>
                            {msg.poll.options.map((opt, optIdx) => {
                              const totalVotes = msg.poll!.options.reduce(
                                (sum, o) => sum + (o.votes || 0),
                                0
                              );
                              const pct =
                                totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                              const voted = opt.voters?.includes(currentUserId);
                              return (
                                <TouchableOpacity
                                  key={opt.id || `opt_${optIdx}`}
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
                            {format12HourTime(msg.createdAt)}
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
                        {msg.reactions.map((r, rIdx) => (
                          <TouchableOpacity
                            key={`${r.emoji}_${rIdx}`}
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
          {failedDrafts.map((d, dIdx) => (
            <View key={d.tempId || `draft_${dIdx}`} style={styles.failedDraftCard}>
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
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* WhatsApp Pre-Send Media Preview Modal */}
      <Modal visible={Boolean(pendingSendMedia)} animationType="fade" transparent={false}>
        <View
          style={[
            styles.preSendModalContainer,
            {
              paddingTop: insets.top > 0 ? insets.top + 10 : 36,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 20,
            },
          ]}
        >
          {/* Top Bar with Pagination and Delete Option */}
          <View style={styles.preSendHeader}>
            <TouchableOpacity
              onPress={handleCancelPendingMedia}
              style={styles.preSendCancelBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel send"
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.preSendTitle}>
                {pendingSendMedia && pendingSendMedia.files.length > 1
                  ? pendingSendMedia.kind === 'document'
                    ? `Send ${pendingSendMedia.files.length} Documents`
                    : `Send ${pendingSendMedia.files.length} Photos`
                  : pendingSendMedia?.kind === 'document'
                  ? 'Send Document'
                  : 'Send Photo'}
              </Text>
              {pendingSendMedia && pendingSendMedia.files.length > 1 && (
                <Text style={styles.preSendCounter}>
                  {currentCarouselIdx + 1} / {pendingSendMedia.files.length}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handleRemoveCurrentPendingFile}
              style={styles.preSendDeleteBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Remove file"
            >
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* Media Center Preview Carousel Stage */}
          <View
            style={styles.preSendStage}
            onTouchStart={(e: any) => {
              touchStartX.current = e.nativeEvent?.pageX || 0;
            }}
            onTouchEnd={(e: any) => {
              const dx = (e.nativeEvent?.pageX || 0) - touchStartX.current;
              if (pendingSendMedia && pendingSendMedia.files.length > 1) {
                if (dx < -40 && currentCarouselIdx < pendingSendMedia.files.length - 1) {
                  setCurrentCarouselIdx((i) => i + 1);
                } else if (dx > 40 && currentCarouselIdx > 0) {
                  setCurrentCarouselIdx((i) => i - 1);
                }
              }
            }}
          >
            {/* Left Chevron */}
            {pendingSendMedia && pendingSendMedia.files.length > 1 && currentCarouselIdx > 0 && (
              <TouchableOpacity
                style={styles.carouselNavLeft}
                onPress={() => setCurrentCarouselIdx((i) => Math.max(0, i - 1))}
                accessibilityLabel="Previous attachment"
              >
                <ChevronLeft size={28} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Current Active File View */}
            {pendingSendMedia && pendingSendMedia.files[currentCarouselIdx] && (() => {
              const activeFile = pendingSendMedia.files[currentCarouselIdx];
              const fileType = resolveAttachmentFileType(activeFile.type, activeFile.name);
              const badge = getFileTypeBadge(activeFile.type, activeFile.name);
              const isImg = fileType === 'image';

              return isImg ? (
                <Image
                  source={{ uri: activeFile.uri }}
                  style={styles.preSendFullImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.preSendDocCard}>
                  <View style={[styles.preSendDocIconCircle, { backgroundColor: badge.bg }]}>
                    {renderFileTypeIcon(activeFile.type, activeFile.type, activeFile.name, 48)}
                  </View>
                  <Text style={styles.preSendDocName} numberOfLines={2}>
                    {activeFile.name}
                  </Text>
                  <Text style={styles.preSendDocSize}>
                    {formatFileSize(activeFile.size || 0)} • {badge.label}
                  </Text>
                </View>
              );
            })()}

            {/* Right Chevron */}
            {pendingSendMedia &&
              pendingSendMedia.files.length > 1 &&
              currentCarouselIdx < pendingSendMedia.files.length - 1 && (
                <TouchableOpacity
                  style={styles.carouselNavRight}
                  onPress={() =>
                    setCurrentCarouselIdx((i) =>
                      Math.min((pendingSendMedia?.files.length || 1) - 1, i + 1)
                    )
                  }
                  accessibilityLabel="Next attachment"
                >
                  <ChevronRight size={28} color="#FFFFFF" />
                </TouchableOpacity>
              )}
          </View>

          {/* Bottom Thumbnail Strip (when multiple files selected) */}
          {pendingSendMedia && pendingSendMedia.files.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbStripContainer}
              style={styles.thumbStripScroll}
            >
              {pendingSendMedia.files.map((file, idx) => {
                const isSelected = idx === currentCarouselIdx;
                const fileType = resolveAttachmentFileType(file.type, file.name);
                const isImg = fileType === 'image';
                const badge = getFileTypeBadge(file.type, file.name);

                return (
                  <TouchableOpacity
                    key={`${file.uri}_${idx}`}
                    onPress={() => setCurrentCarouselIdx(idx)}
                    style={[styles.thumbStripItem, isSelected && styles.thumbStripItemSelected]}
                  >
                    {isImg ? (
                      <Image source={{ uri: file.uri }} style={styles.thumbStripImage} />
                    ) : (
                      <View style={[styles.thumbStripDocBox, { backgroundColor: badge.bg }]}>
                        {renderFileTypeIcon(file.type, file.type, file.name, 16)}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* WhatsApp Style Bottom Caption & Send Bar */}
          <View style={styles.preSendBottomBar}>
            <View style={styles.preSendCaptionInputWrap}>
              <Smile size={20} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.preSendCaptionInput}
                placeholder="Add a caption..."
                placeholderTextColor="#94A3B8"
                value={mediaCaptionText}
                onChangeText={setMediaCaptionText}
                multiline
                maxLength={500}
              />
            </View>

            <TouchableOpacity
              style={[styles.preSendConfirmBtn, sending && { opacity: 0.7 }]}
              onPress={handleConfirmSendPendingMedia}
              disabled={sending}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Send media"
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={22} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
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

      {/* In-App Fullscreen Media Preview & Gallery Modal */}
      <Modal visible={Boolean(galleryViewer)} animationType="fade" transparent>
        <View style={styles.previewBackdrop}>
          <View style={styles.previewHeader}>
            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={() => setGalleryViewer(null)}
              accessibilityRole="button"
              accessibilityLabel="Close media preview"
            >
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {galleryViewer && galleryViewer.items.length > 1
                  ? `${galleryViewer.currentIndex + 1} of ${galleryViewer.items.length} • ${galleryViewer.items[galleryViewer.currentIndex]?.name || 'Photo'}`
                  : galleryViewer?.items[0]?.name || 'Media Attachment'}
              </Text>
              {galleryViewer?.senderName && (
                <Text style={styles.previewSubTitle}>Sent by {galleryViewer.senderName}</Text>
              )}
            </View>
          </View>

          <View
            style={styles.previewBody}
            onTouchStart={(e: any) => {
              touchStartX.current = e.nativeEvent?.pageX || 0;
            }}
            onTouchEnd={(e: any) => {
              const dx = (e.nativeEvent?.pageX || 0) - touchStartX.current;
              if (galleryViewer && galleryViewer.items.length > 1) {
                if (dx < -40 && galleryViewer.currentIndex < galleryViewer.items.length - 1) {
                  setGalleryViewer((prev) =>
                    prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null
                  );
                } else if (dx > 40 && galleryViewer.currentIndex > 0) {
                  setGalleryViewer((prev) =>
                    prev ? { ...prev, currentIndex: prev.currentIndex - 1 } : null
                  );
                }
              }
            }}
          >
            {/* Left Chevron */}
            {galleryViewer && galleryViewer.items.length > 1 && galleryViewer.currentIndex > 0 && (
              <TouchableOpacity
                style={styles.carouselNavLeft}
                onPress={() =>
                  setGalleryViewer((prev) =>
                    prev ? { ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) } : null
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Previous photo"
              >
                <ChevronLeft size={28} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {galleryViewer && galleryViewer.items[galleryViewer.currentIndex] && (() => {
              const cur = galleryViewer.items[galleryViewer.currentIndex];
              const isImg = cur.kind === 'image' || Boolean(cur.url);
              const imgUri = cur.url || cur.signedDownloadUrl || cur.signedPreviewUrl || '';

              return isImg ? (
                <Image
                  source={{ uri: imgUri }}
                  style={styles.previewFullImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.previewDocPlaceholder}>
                  <FileText size={64} color="#00D287" />
                  <Text style={styles.previewDocName}>{cur.name}</Text>
                </View>
              );
            })()}

            {/* Right Chevron */}
            {galleryViewer &&
              galleryViewer.items.length > 1 &&
              galleryViewer.currentIndex < galleryViewer.items.length - 1 && (
                <TouchableOpacity
                  style={styles.carouselNavRight}
                  onPress={() =>
                    setGalleryViewer((prev) =>
                      prev
                        ? {
                            ...prev,
                            currentIndex: Math.min(prev.items.length - 1, prev.currentIndex + 1),
                          }
                        : null
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Next photo"
                >
                  <ChevronRight size={28} color="#FFFFFF" />
                </TouchableOpacity>
              )}
          </View>

          {/* Bottom Thumbnail Strip (when galleryViewer has multiple photos) */}
          {galleryViewer && galleryViewer.items.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbStripContainer}
              style={styles.thumbStripScroll}
            >
              {galleryViewer.items.map((item, idx) => {
                const isSelected = idx === galleryViewer.currentIndex;
                const thumbUri = item.url || item.signedDownloadUrl || item.signedPreviewUrl || '';
                return (
                  <TouchableOpacity
                    key={`${item.id || idx}`}
                    onPress={() =>
                      setGalleryViewer((prev) => (prev ? { ...prev, currentIndex: idx } : null))
                    }
                    style={[styles.thumbStripItem, isSelected && styles.thumbStripItemSelected]}
                  >
                    <Image source={{ uri: thumbUri }} style={styles.thumbStripImage} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.previewFooterBar}>
            <TouchableOpacity
              style={styles.previewActionBtn}
              onPress={async () => {
                const cur = galleryViewer?.items[galleryViewer.currentIndex];
                const uri = cur?.url || cur?.signedDownloadUrl;
                if (!uri) return;
                try {
                  await downloadOrSaveMedia({
                    url: uri,
                    fileName: cur.name,
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
                const cur = galleryViewer?.items[galleryViewer.currentIndex];
                const uri = cur?.url || cur?.signedDownloadUrl;
                if (uri) {
                  Share.share({
                    title: cur.name,
                    url: uri,
                    message: `MasterHRMS Attachment: ${cur.name} - ${uri}`,
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

      {/* Forward Batch Modal (GAP 2.3: Org Directory Selection Screen) */}
      <Modal visible={forwardModalOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { maxHeight: '85%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Forward Message</Text>
              <TouchableOpacity
                onPress={() => {
                  setForwardModalOpen(false);
                  setActionTargetMsg(null);
                  setForwardSearchQuery('');
                }}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Input for Org Directory */}
            <View style={styles.forwardSearchBox}>
              <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.forwardSearchInput}
                placeholder="Search colleagues or chats..."
                placeholderTextColor="#94A3B8"
                value={forwardSearchQuery}
                onChangeText={setForwardSearchQuery}
              />
              {Boolean(forwardSearchQuery) && (
                <TouchableOpacity onPress={() => setForwardSearchQuery('')}>
                  <X size={14} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {/* 1. Active Chats */}
              {((allConvsQuery.data || []) as any[])
                .filter((c) =>
                  !forwardSearchQuery ||
                  c.name?.toLowerCase().includes(forwardSearchQuery.toLowerCase())
                )
                .map((c) => {
                  const targetId = c.threadId;
                  const chosen = forwardThreadIds.includes(targetId);
                  return (
                    <TouchableOpacity
                      key={targetId}
                      style={styles.forwardListItem}
                      onPress={() =>
                        setForwardThreadIds((prev) =>
                          prev.includes(targetId)
                            ? prev.filter((x) => x !== targetId)
                            : [...prev, targetId]
                        )
                      }
                    >
                      <View style={styles.forwardAvatarBox}>
                        {c.avatar ? (
                          <Image source={{ uri: c.avatar }} style={styles.forwardAvatarImg} />
                        ) : (
                          <View style={styles.forwardAvatarInitials}>
                            <Text style={styles.forwardAvatarText}>
                              {(c.name || 'C').slice(0, 2).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.forwardItemName} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.forwardItemSub} numberOfLines={1}>
                          {c.type === 'group' ? 'Group Chat' : 'Active Conversation'}
                        </Text>
                      </View>

                      {chosen ? (
                        <CheckSquare size={18} color="#00D287" />
                      ) : (
                        <Square size={18} color="#CBD5E1" />
                      )}
                    </TouchableOpacity>
                  );
                })}

              {/* 2. Organization Colleagues */}
              {((contactsQuery.data || []) as any[])
                .filter((contact) => {
                  if (contact.userId === currentUserId) return false;
                  if (!forwardSearchQuery) return true;
                  const q = forwardSearchQuery.toLowerCase();
                  return (
                    contact.name?.toLowerCase().includes(q) ||
                    contact.department?.toLowerCase().includes(q) ||
                    contact.designation?.toLowerCase().includes(q) ||
                    contact.email?.toLowerCase().includes(q)
                  );
                })
                .map((contact) => {
                  const targetId = contact.threadId || `user_${contact.userId}`;
                  const chosen = forwardThreadIds.includes(targetId);
                  return (
                    <TouchableOpacity
                      key={`contact_${contact.userId}`}
                      style={styles.forwardListItem}
                      onPress={() =>
                        setForwardThreadIds((prev) =>
                          prev.includes(targetId)
                            ? prev.filter((x) => x !== targetId)
                            : [...prev, targetId]
                        )
                      }
                    >
                      <View style={styles.forwardAvatarBox}>
                        {contact.avatar ? (
                          <Image source={{ uri: contact.avatar }} style={styles.forwardAvatarImg} />
                        ) : (
                          <View style={styles.forwardAvatarInitials}>
                            <Text style={styles.forwardAvatarText}>
                              {(contact.name || 'E').slice(0, 2).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.forwardItemName} numberOfLines={1}>
                          {contact.name}
                        </Text>
                        <Text style={styles.forwardItemSub} numberOfLines={1}>
                          {[contact.designation, contact.department].filter(Boolean).join(' • ') ||
                            contact.email ||
                            'Employee'}
                        </Text>
                      </View>

                      {chosen ? (
                        <CheckSquare size={18} color="#00D287" />
                      ) : (
                        <Square size={18} color="#CBD5E1" />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                forwardThreadIds.length === 0 && { opacity: 0.5, backgroundColor: '#94A3B8' },
              ]}
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
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.contactSectionTitle}>Media, Links and Docs</Text>
                        <Text style={styles.contactMediaCountText}>
                          {(sharedFilesQuery.data || []).length} items
                        </Text>
                      </View>

                      {Array.isArray(sharedFilesQuery.data) && sharedFilesQuery.data.length > 0 ? (
                        <>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                            {sharedFilesQuery.data.slice(0, 8).map((f: any, idx: number) => (
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
                                {f.kind === 'image' || (f.url && f.url.match(/\.(jpg|jpeg|png|webp|gif)/i)) ? (
                                  <Image source={{ uri: f.url }} style={styles.contactMediaThumbImg} />
                                ) : (
                                  <View style={[styles.contactMediaThumbImg, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                                    <FileText size={20} color="#3B82F6" />
                                  </View>
                                )}
                              </TouchableOpacity>
                            ))}
                          </ScrollView>

                          {/* Shared Files List in Profile Screen */}
                          <View style={{ marginTop: 12 }}>
                            {sharedFilesQuery.data.slice(0, 8).map((file: any, fileIdx: number) => (
                              <TouchableOpacity
                                key={file.id || file.url || fileIdx}
                                style={styles.contactSharedFileRow}
                                onPress={() =>
                                  openOrShareAttachment({
                                    url: file.url,
                                    mediaId: file.mediaId,
                                    fileName: file.name,
                                  }).catch((e) => Alert.alert('File', e.message))
                                }
                              >
                                <View style={styles.contactSharedFileIconBox}>
                                  {file.kind === 'pdf' || file.name?.endsWith('.pdf') ? (
                                    <FileText size={16} color="#EF4444" />
                                  ) : file.kind === 'image' ? (
                                    <ImageIcon size={16} color="#8B5CF6" />
                                  ) : (
                                    <Paperclip size={16} color="#6366F1" />
                                  )}
                                </View>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                  <Text style={styles.contactSharedFileName} numberOfLines={1}>
                                    {file.name}
                                  </Text>
                                  {Boolean(file.size) && (
                                    <Text style={styles.contactSharedFileSize}>
                                      {formatFileSize(file.size)}
                                    </Text>
                                  )}
                                </View>
                                <Download size={15} color="#94A3B8" />
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      ) : (
                        <Text style={styles.contactEmptyMediaText}>No shared media, links, or docs</Text>
                      )}
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
      {/* Call Options Bottom Sheet */}
      <CallOptionsBottomSheet
        visible={callOptionsOpen}
        onClose={() => setCallOptionsOpen(false)}
        targetUserName={groupData?.name || title}
        onSelectAudioCall={() => handleStartCall('audio')}
        onSelectVideoCall={() => handleStartCall('video')}
        onSelectGroupCall={() => setGroupSetupOpen(true)}
      />

      {/* Group Call Setup Modal */}
      <GroupCallSetupModal
        visible={groupSetupOpen}
        onClose={() => setGroupSetupOpen(false)}
        preselectedUserId={otherParticipantId}
        onStartGroupCall={(cType, _selectedUserIds, gMeetingName) => {
          navigation.navigate('ChatCall', {
            callType: cType,
            receiverName: gMeetingName || (groupData?.name || title),
            isGroupMeeting: true,
            initialStatus: 'connected',
          });
        }}
      />
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
    backgroundColor: '#101820',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#202C33',
  },
  inThreadSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#E9EDEF',
    paddingVertical: 6,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8696A0',
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
    backgroundColor: '#101820',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#202C33',
  },
  pinEmoji: {
    fontSize: 15,
    marginRight: 8,
  },
  pinnedAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: '#53BDEB',
  },
  pinnedPreview: {
    fontSize: 12,
    color: '#AEBAC1',
  },
  messagesScroll: {
    padding: 14,
    paddingBottom: 20,
    backgroundColor: '#0B141A',
  },
  loadOlderBtn: {
    alignSelf: 'center',
    backgroundColor: '#182229',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
  },
  loadOlderText: {
    color: '#00D287',
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
    color: '#8696A0',
  },
  systemPill: {
    alignSelf: 'center',
    backgroundColor: '#182229',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: 6,
  },
  systemPillText: {
    fontSize: 11,
    color: '#8696A0',
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
    backgroundColor: '#005C4B',
    borderWidth: 0,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#202C33',
    borderWidth: 0,
    borderBottomLeftRadius: 4,
  },
  bubbleDeleted: {
    opacity: 0.75,
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#53BDEB',
    marginBottom: 3,
  },
  forwardedTag: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#8696A0',
    marginBottom: 3,
  },
  replyQuoteBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderLeftWidth: 3,
    borderLeftColor: '#00D287',
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
  },
  replyQuoteAuthor: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00D287',
  },
  replyQuoteBody: {
    fontSize: 11,
    color: '#AEBAC1',
  },
  msgBody: {
    fontSize: 14,
    lineHeight: 22,
    includeFontPadding: false,
  },
  msgBodyMe: {
    color: '#E9EDEF',
  },
  msgBodyThem: {
    color: '#E9EDEF',
  },
  deletedItalic: {
    fontStyle: 'italic',
    color: '#8696A0',
  },
  bubbleAttachmentsWrap: {
    marginBottom: 6,
    width: '100%',
  },
  attachmentCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 10,
    padding: 8,
    width: '100%',
    marginBottom: 4,
  },
  attachmentCardMe: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  attachmentCardThem: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  attachmentThumb: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#182229',
  },
  docAttachmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fileTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  docAttachmentMeta: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E9EDEF',
  },
  attachmentSizeText: {
    fontSize: 10,
    color: '#AEBAC1',
    marginTop: 2,
  },
  attachmentGridContainer: {
    width: '100%',
  },
  attachmentGridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  attachmentGridCol2: {
    flex: 1,
  },
  attachmentGridCard: {
    padding: 4,
    borderRadius: 8,
  },
  attachmentGridCardFull: {
    width: '100%',
    padding: 6,
    borderRadius: 8,
  },
  moreAttachmentsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreAttachmentsText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  preSendDeleteBtn: {
    padding: 8,
  },
  carouselNavLeft: {
    position: 'absolute',
    left: 12,
    top: '48%',
    zIndex: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 20,
    padding: 6,
  },
  carouselNavRight: {
    position: 'absolute',
    right: 12,
    top: '48%',
    zIndex: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 20,
    padding: 6,
  },
  thumbStripScroll: {
    maxHeight: 64,
    marginVertical: 8,
    paddingHorizontal: 12,
  },
  thumbStripContainer: {
    alignItems: 'center',
    gap: 8,
  },
  thumbStripItem: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#1E293B',
  },
  thumbStripItemSelected: {
    borderColor: '#00D287',
  },
  thumbStripImage: {
    width: '100%',
    height: '100%',
  },
  thumbStripDocBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forwardSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  forwardSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  forwardListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  forwardAvatarBox: {
    marginRight: 10,
  },
  forwardAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
  },
  forwardAvatarInitials: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forwardAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  forwardItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  forwardItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
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
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  pollTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E9EDEF',
    marginBottom: 6,
  },
  pollOpt: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  pollOptVoted: {
    borderWidth: 1.5,
    borderColor: '#00D287',
  },
  pollOptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E9EDEF',
    flex: 1,
  },
  pollOptStat: {
    fontSize: 11,
    fontWeight: '700',
    color: '#53BDEB',
  },
  pollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  pollMetaText: {
    fontSize: 10,
    color: '#8696A0',
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
    color: '#8696A0',
  },
  timeTextMe: {
    color: '#AEBAC1',
  },
  tickText: {
    fontSize: 10,
    color: '#AEBAC1',
    fontWeight: '700',
  },
  tickRead: {
    color: '#53BDEB',
  },
  reactionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 5,
  },
  reactionPill: {
    backgroundColor: '#182229',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reactionPillText: {
    fontSize: 11,
    color: '#E9EDEF',
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
    backgroundColor: '#182229',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#202C33',
  },
  mentionChip: {
    backgroundColor: '#202C33',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
  },
  mentionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#53BDEB',
  },
  replyEditBanner: {
    backgroundColor: '#182229',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#202C33',
  },
  replyEditTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00D287',
  },
  replyEditSnippet: {
    fontSize: 12,
    color: '#AEBAC1',
  },
  stagedStrip: {
    backgroundColor: '#101820',
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stagedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202C33',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stagedChipText: {
    fontSize: 11,
    color: '#E9EDEF',
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
    backgroundColor: '#101820',
    borderTopWidth: 1,
    borderTopColor: '#202C33',
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
    backgroundColor: '#202C33',
    borderWidth: 1,
    borderColor: '#2A3942',
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
    color: '#E9EDEF',
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
    backgroundColor: '#1E293B',
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
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sheetItem: {
    minHeight: 46,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sheetItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E9EDEF',
  },
  quickEmojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
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
  currentLocationInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    marginVertical: 14,
  },
  currentLocationBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  currentLocationBannerSubtitle: {
    fontSize: 11.5,
    color: '#15803D',
    lineHeight: 16,
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
    backgroundColor: '#0B141A',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(11, 20, 26, 0.92)',
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
    backgroundColor: 'rgba(11, 20, 26, 0.92)',
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

  // WhatsApp Pre-Send Media Preview Styles
  preSendModalContainer: {
    flex: 1,
    backgroundColor: '#0B141A',
    justifyContent: 'space-between',
  },
  preSendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  preSendCancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  preSendTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  preSendCounter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AEBAC1',
    marginTop: 2,
  },
  preSendStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  preSendFullImage: {
    width: '100%',
    height: '100%',
  },
  preSendDocCard: {
    width: '88%',
    maxWidth: 340,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  preSendDocIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  preSendDocName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 6,
  },
  preSendDocSize: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  preSendBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  preSendCaptionInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202C33',
    borderColor: '#2A3942',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    minHeight: 46,
  },
  preSendCaptionInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  preSendConfirmBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D287',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // Contact Drawer Shared Files
  contactMediaCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  contactSharedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contactSharedFileIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  contactSharedFileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  contactSharedFileSize: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
});
