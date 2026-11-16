import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthStore } from '../../../store/authStore';
import {
  ChatService,
  ChatMessage,
} from '../../../core/services/chatService';

export const ChatConversationDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { threadId, title, type } = route.params || {};

  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id || '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyMessage, setReplyMessage] = useState<ChatMessage | null>(null);

  const scrollViewRef = useRef<any>(null);

  const loadMessages = useCallback(async () => {
    if (!threadId) return;
    try {
      setLoading(true);
      const data = await ChatService.getMessages(threadId);
      setMessages(data);
      // Mark as read
      ChatService.markThreadRead(threadId);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');

    try {
      setSending(true);
      const sentMsg = await ChatService.sendMessage({
        threadId,
        content: text,
        replyToId: replyMessage?.id,
      });
      setReplyMessage(null);
      if (sentMsg) {
        setMessages((prev) => [...prev, sentMsg]);
      } else {
        // Optimistic append
        const optimistic: ChatMessage = {
          id: `opt-${Date.now()}`,
          threadId,
          senderId: currentUserId,
          senderName: user?.profile?.fullName || 'Me',
          content: text,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);
      }
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Message failed to send';
      Alert.alert('Send Error', msg);
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await ChatService.reactToMessage(messageId, emoji);
      loadMessages();
    } catch {
      // Handled
    }
  };

  const handlePollVote = async (messageId: string, optionId: string) => {
    try {
      await ChatService.votePoll(messageId, optionId);
      loadMessages();
    } catch {
      // Handled
    }
  };

  const startCall = (callType: 'audio' | 'video') => {
    navigation.navigate('ChatCall', {
      receiverName: title,
      callType,
    });
  };

  const pinnedMessage = messages.find((m) => m.isPinned);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerAvatar}>
            <Text style={styles.avatarText}>
              {title ? title.substring(0, 2).toUpperCase() : 'CH'}
            </Text>
          </View>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerName} numberOfLines={1}>
              {title || 'Chat'}
            </Text>
            <Text style={styles.headerSub}>
              {type === 'group' ? 'Group Chat' : 'Online'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.callIconBtn}
            onPress={() => startCall('audio')}
            accessibilityRole="button"
            accessibilityLabel="Audio Call"
          >
            <Text style={styles.callIconText}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.callIconBtn}
            onPress={() => startCall('video')}
            accessibilityRole="button"
            accessibilityLabel="Video Call"
          >
            <Text style={styles.callIconText}>📹</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <View style={styles.pinnedBanner}>
          <Text style={styles.pinIcon}>📌</Text>
          <View style={styles.pinnedCol}>
            <Text style={styles.pinnedSender}>{pinnedMessage.senderName}</Text>
            <Text style={styles.pinnedSnippet} numberOfLines={1}>
              {pinnedMessage.content}
            </Text>
          </View>
        </View>
      )}

      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesScroll}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
      >
        {loading ? (
          <ActivityIndicator color="#4F46E5" style={styles.loader} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyMessages}>
            <Text style={styles.emptyMsgIcon}>👋</Text>
            <Text style={styles.emptyMsgText}>Say hello! Start this conversation.</Text>
          </View>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <View
                key={msg.id}
                style={[styles.messageRow, isMe ? styles.rowRight : styles.rowLeft]}
              >
                {!isMe && (
                  <View style={styles.msgAvatar}>
                    <Text style={styles.msgAvatarText}>
                      {msg.senderName ? msg.senderName.substring(0, 1) : 'U'}
                    </Text>
                  </View>
                )}

                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  {/* Sender Name in group chats */}
                  {!isMe && type === 'group' && (
                    <Text style={styles.senderHeader}>{msg.senderName}</Text>
                  )}

                  {/* Quoted Reply */}
                  {msg.replyTo && (
                    <View style={styles.replyQuote}>
                      <Text style={styles.replyQuoteSender}>{msg.replyTo.senderName}</Text>
                      <Text style={styles.replyQuoteText} numberOfLines={1}>
                        {msg.replyTo.content}
                      </Text>
                    </View>
                  )}

                  {/* Message Content */}
                  <Text style={[styles.msgContent, isMe ? styles.textMe : styles.textThem]}>
                    {msg.content}
                  </Text>

                  {/* Poll Widget */}
                  {msg.poll && (
                    <View style={styles.pollContainer}>
                      <Text style={styles.pollQuestion}>{msg.poll.question}</Text>
                      {msg.poll.options.map((opt) => (
                        <TouchableOpacity
                          key={opt.id}
                          style={styles.pollOptionBtn}
                          onPress={() => handlePollVote(msg.id, opt.id)}
                        >
                          <Text style={styles.pollOptText}>{opt.text}</Text>
                          <Text style={styles.pollVotes}>{opt.votes} votes</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Time & Delivery Status */}
                  <View style={styles.msgFooter}>
                    <Text style={[styles.timeLabel, isMe ? styles.timeMe : styles.timeThem]}>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    {isMe && <Text style={styles.statusTicks}>✓✓</Text>}
                  </View>

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <View style={styles.reactionsRow}>
                      {msg.reactions.map((r, i) => (
                        <View key={i} style={styles.reactionBadge}>
                          <Text style={styles.reactionEmoji}>
                            {r.emoji} {r.count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Quick React Action */}
                <TouchableOpacity
                  style={styles.reactBtn}
                  onPress={() => handleReaction(msg.id, '👍')}
                >
                  <Text style={styles.reactBtnText}>👍</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Reply Bar */}
      {replyMessage && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarCol}>
            <Text style={styles.replyBarSender}>Replying to {replyMessage.senderName}</Text>
            <Text style={styles.replyBarText} numberOfLines={1}>
              {replyMessage.content}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyMessage(null)}>
            <Text style={styles.replyClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input Composer */}
      <View style={styles.composer}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => Alert.alert('Attachment', 'Select Image, PDF Document, or Voice Note.')}
        >
          <Text style={styles.attachText}>📎</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.composerInput}
          placeholder="Write a message..."
          placeholderTextColor="#94A3B8"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitleCol: {
    flex: 1,
  },
  headerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIconText: {
    fontSize: 18,
  },
  pinnedBanner: {
    backgroundColor: '#EEF2FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#C7D2FE',
  },
  pinIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  pinnedCol: {
    flex: 1,
  },
  pinnedSender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  pinnedSnippet: {
    fontSize: 12,
    color: '#475569',
  },
  messagesScroll: {
    padding: 16,
    paddingBottom: 20,
  },
  loader: {
    marginTop: 40,
  },
  emptyMessages: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyMsgIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyMsgText: {
    fontSize: 14,
    color: '#64748B',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  msgAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
  senderHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 4,
  },
  replyQuote: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
    padding: 6,
    borderRadius: 6,
    marginBottom: 6,
  },
  replyQuoteSender: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  replyQuoteText: {
    fontSize: 11,
    color: '#334155',
  },
  msgContent: {
    fontSize: 14,
    lineHeight: 19,
  },
  textMe: {
    color: '#FFFFFF',
  },
  textThem: {
    color: '#0F172A',
  },
  pollContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  pollQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  pollOptionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pollOptText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  pollVotes: {
    color: '#E0E7FF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  msgFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timeLabel: {
    fontSize: 10,
  },
  timeMe: {
    color: '#C7D2FE',
  },
  timeThem: {
    color: '#94A3B8',
  },
  statusTicks: {
    fontSize: 10,
    color: '#A5B4FC',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  reactionsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  reactionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
  },
  reactionEmoji: {
    fontSize: 10,
  },
  reactBtn: {
    padding: 6,
    opacity: 0.6,
  },
  reactBtnText: {
    fontSize: 14,
  },
  replyBar: {
    backgroundColor: '#EEF2FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#C7D2FE',
  },
  replyBarCol: {
    flex: 1,
  },
  replyBarSender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  replyBarText: {
    fontSize: 12,
    color: '#475569',
  },
  replyClose: {
    fontSize: 16,
    color: '#64748B',
    paddingHorizontal: 8,
  },
  composer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachText: {
    fontSize: 20,
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
