import {
  deduplicateMessages,
  prependOlderMessages,
  normalizeChatMessage,
  type ChatMessage,
} from '../src/core/services/chatService';

describe('Chat Message Deduplication, Reconciliation & Key Stability', () => {
  const DUPLICATE_UUID = '8748acda-eca1-4c71-bc44-37ad6af5f348';

  const createMockMessage = (overrides?: Partial<ChatMessage>): ChatMessage => ({
    id: overrides?.id || 'msg-uuid-1',
    threadId: 'thread-123',
    senderId: 'user-abc',
    senderName: 'Alice',
    content: 'Hello world',
    createdAt: '2026-11-19T06:00:00.000Z',
    isEdited: false,
    isDeleted: false,
    deliveryStatus: 'sent',
    ...overrides,
  });

  // Category 1: Duplicate message delivery (Socket.IO + Pusher concurrent dispatch)
  describe('Category 1: Duplicate message delivery across dual transports', () => {
    it('deduplicates identical message delivered simultaneously by Socket.IO and Pusher', () => {
      const msg1 = createMockMessage({
        id: DUPLICATE_UUID,
        content: 'Broadcast across both transports',
      });
      const msg2 = createMockMessage({
        id: DUPLICATE_UUID,
        content: 'Broadcast across both transports',
      });

      // Initially empty
      const step1 = deduplicateMessages([msg1], []);
      expect(step1).toHaveLength(1);
      expect(step1[0].id).toBe(DUPLICATE_UUID);

      // Pusher arrives right after
      const step2 = deduplicateMessages([msg2], step1);
      expect(step2).toHaveLength(1);
      expect(step2[0].id).toBe(DUPLICATE_UUID);
    });

    it('deduplicates messages when incoming array itself contains duplicate UUIDs', () => {
      const msg1 = createMockMessage({ id: DUPLICATE_UUID, content: 'First' });
      const msg2 = createMockMessage({ id: DUPLICATE_UUID, content: 'Second duplicate' });

      const result = deduplicateMessages([msg1, msg2], []);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(DUPLICATE_UUID);
      expect(result[0].content).toBe('Second duplicate'); // Updated with latest
    });
  });

  // Category 2: Optimistic message reconciliation
  describe('Category 2: Optimistic message reconciliation', () => {
    it('reconciles optimistic placeholder with server-confirmed message by clientTempId', () => {
      const tempId = 'mob_1700000000_abc12';
      const optimisticMsg = createMockMessage({
        id: tempId,
        clientTempId: tempId,
        content: 'Optimistic text',
        deliveryStatus: 'sending',
      });

      const baseList = [optimisticMsg];
      expect(baseList[0].id).toBe(tempId);

      // Server confirms and assigns canonical UUID 8748acda-eca1-4c71-bc44-37ad6af5f348
      const confirmedMsg = createMockMessage({
        id: DUPLICATE_UUID,
        clientTempId: tempId,
        content: 'Optimistic text',
        deliveryStatus: 'sent',
      });

      const reconciled = deduplicateMessages([confirmedMsg], baseList);

      // Must remain exactly 1 message, NOT duplicate
      expect(reconciled).toHaveLength(1);
      expect(reconciled[0].id).toBe(DUPLICATE_UUID);
      expect(reconciled[0].clientTempId).toBe(tempId);
      expect(reconciled[0].deliveryStatus).toBe('sent');
    });

    it('preserves existing attachments, poll, and reactions when reconciling optimistic message', () => {
      const tempId = 'mob_poll_123';
      const optimisticPoll = createMockMessage({
        id: tempId,
        clientTempId: tempId,
        content: 'Poll: Where for lunch?',
        poll: {
          id: 'poll-1',
          question: 'Where for lunch?',
          allowMultiple: false,
          isAnonymous: false,
          closed: false,
          options: [
            { id: '1', text: 'Pizza', votes: 0, voters: [] },
            { id: '2', text: 'Sushi', votes: 0, voters: [] },
          ],
        },
      });

      const serverConfirmation = createMockMessage({
        id: DUPLICATE_UUID,
        clientTempId: tempId,
        content: 'Poll: Where for lunch?',
        deliveryStatus: 'sent',
      });

      const result = deduplicateMessages([serverConfirmation], [optimisticPoll]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(DUPLICATE_UUID);
      expect(result[0].poll).toBeDefined();
      expect(result[0].poll?.options).toHaveLength(2);
    });
  });

  // Category 3: Repeated Socket.IO events for identical message ID
  describe('Category 3: Repeated Socket.IO events for identical message ID', () => {
    it('handles multiple repeat events for identical message ID without creating duplicates', () => {
      let state: ChatMessage[] = [];
      const msg = createMockMessage({ id: DUPLICATE_UUID, content: 'Repeated event' });

      // Event 1
      state = deduplicateMessages([msg], state);
      expect(state).toHaveLength(1);

      // Event 2 (socket reconnect replay)
      state = deduplicateMessages([msg], state);
      expect(state).toHaveLength(1);

      // Event 3 (catch-up poll)
      state = deduplicateMessages([msg], state);
      expect(state).toHaveLength(1);
      expect(state[0].id).toBe(DUPLICATE_UUID);
    });

    it('updates delivery status and reactions in place upon repeated events', () => {
      const initial = createMockMessage({
        id: DUPLICATE_UUID,
        deliveryStatus: 'sent',
        reactions: [],
      });
      let state = [initial];

      const deliveredUpdate = createMockMessage({
        id: DUPLICATE_UUID,
        deliveryStatus: 'delivered',
        reactions: [{ emoji: '👍', count: 1, users: ['user-2'] }],
      });

      state = deduplicateMessages([deliveredUpdate], state);
      expect(state).toHaveLength(1);
      expect(state[0].deliveryStatus).toBe('delivered');
      expect(state[0].reactions).toHaveLength(1);
      expect(state[0].reactions?.[0].emoji).toBe('👍');
    });
  });

  // Category 4: Duplicate pagination results (cursor overlap & identical timestamp messages)
  describe('Category 4: Duplicate pagination results', () => {
    it('prepends older messages while deduplicating boundary cursor message overlap', () => {
      const page1 = [
        createMockMessage({ id: DUPLICATE_UUID, content: 'Message 3 (boundary)' }),
        createMockMessage({ id: 'msg-4', content: 'Message 4' }),
        createMockMessage({ id: 'msg-5', content: 'Message 5' }),
      ];

      // Page 2 (older) also returns boundary message Message 3
      const page2 = [
        createMockMessage({ id: 'msg-1', content: 'Message 1' }),
        createMockMessage({ id: 'msg-2', content: 'Message 2' }),
        createMockMessage({ id: DUPLICATE_UUID, content: 'Message 3 (boundary)' }),
      ];

      const merged = prependOlderMessages(page2, page1);

      // Must have exactly 5 messages, NOT 6
      expect(merged).toHaveLength(5);
      const ids = merged.map((m) => m.id);
      expect(ids).toEqual(['msg-1', 'msg-2', DUPLICATE_UUID, 'msg-4', 'msg-5']);

      // Ensure no duplicate keys exist
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(merged.length);
    });

    it('deduplicates when multiple messages share the exact same createdAt timestamp', () => {
      const timestamp = '2026-11-19T06:15:00.000Z';
      const older = [
        createMockMessage({ id: 'batch-1', createdAt: timestamp }),
        createMockMessage({ id: 'batch-2', createdAt: timestamp }),
        createMockMessage({ id: DUPLICATE_UUID, createdAt: timestamp }),
      ];
      const existing = [
        createMockMessage({ id: DUPLICATE_UUID, createdAt: timestamp }),
        createMockMessage({ id: 'batch-3', createdAt: timestamp }),
      ];

      const merged = prependOlderMessages(older, existing);
      expect(merged).toHaveLength(4);
      const countDuplicateUuid = merged.filter((m) => m.id === DUPLICATE_UUID).length;
      expect(countDuplicateUuid).toBe(1);
    });
  });

  // Category 5: Group participant updates
  describe('Category 5: Group participant updates & contact deduplication', () => {
    it('guarantees unique participant IDs when group roster refreshes', () => {
      const rawParticipants = [
        { userId: 'u1', name: 'Alice' },
        { userId: 'u2', name: 'Bob' },
        { userId: 'u1', name: 'Alice (Duplicate entry)' },
      ];

      const seen = new Set<string>();
      const deduped: typeof rawParticipants = [];
      for (const p of rawParticipants) {
        const key = String(p.userId).trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(p);
      }

      expect(deduped).toHaveLength(2);
      expect(deduped.map((p) => p.userId)).toEqual(['u1', 'u2']);
    });
  });

  // Category 6: Call participant join/leave events
  describe('Category 6: Call participant join/leave events', () => {
    it('ensures call roster deduplicates repeated participant join events', () => {
      interface Peer {
        userId: string;
        name: string;
      }
      const deduplicatePeers = (peers: Peer[]): Peer[] => {
        const seen = new Set<string>();
        const res: Peer[] = [];
        for (const p of peers) {
          const key = String(p.userId).trim();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          res.push(p);
        }
        return res;
      };

      let peers: Peer[] = [{ userId: 'host-1', name: 'Host' }];

      // Peer joins
      peers = deduplicatePeers([...peers, { userId: 'guest-2', name: 'Guest' }]);
      expect(peers).toHaveLength(2);

      // Repeated join event (Pusher + Socket.IO)
      peers = deduplicatePeers([...peers, { userId: 'guest-2', name: 'Guest' }]);
      expect(peers).toHaveLength(2);
      expect(peers.map((p) => p.userId)).toEqual(['host-1', 'guest-2']);
    });
  });

  // Category 7: Stable keys after sorting and filtering
  describe('Category 7: Stable keys after sorting and filtering', () => {
    it('maintains stable canonical IDs through in-thread search filtering without key collisions', () => {
      const list = [
        createMockMessage({ id: 'msg-1', content: 'Weekly standup notes' }),
        createMockMessage({ id: DUPLICATE_UUID, content: 'Production release checklist' }),
        createMockMessage({ id: 'msg-3', content: 'Standup discussion items' }),
      ];

      // Simulate displayedMessages useMemo with search filter
      const filterMessages = (messages: ChatMessage[], query: string): ChatMessage[] => {
        const seen = new Set<string>();
        const unique: ChatMessage[] = [];
        for (const m of messages) {
          const canonicalKey = String(m.id || m.clientTempId || '').trim();
          if (!canonicalKey || seen.has(canonicalKey)) continue;
          seen.add(canonicalKey);
          if (m.clientTempId) seen.add(String(m.clientTempId).trim());
          unique.push(m);
        }

        if (!query.trim()) return unique;
        const q = query.trim().toLowerCase();
        return unique.filter(
          (m) => m.content.toLowerCase().includes(q) || m.senderName.toLowerCase().includes(q)
        );
      };

      // Unfiltered
      const unfiltered = filterMessages(list, '');
      expect(unfiltered).toHaveLength(3);
      expect(unfiltered.map((m) => m.id)).toEqual(['msg-1', DUPLICATE_UUID, 'msg-3']);

      // Filtered
      const filtered = filterMessages(list, 'standup');
      expect(filtered).toHaveLength(2);
      expect(filtered.map((m) => m.id)).toEqual(['msg-1', 'msg-3']);

      // All keys in filtered result are unique
      const keys = filtered.map((m) => m.id);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('proves React key warning .2:$8748acda-eca1-4c71-bc44-37ad6af5f348 cannot occur', () => {
      // In React child slot 2 (displayedMessages.map), keys are formatted as `.2:$${msgKey}`
      // If messages has duplicates, keys collide. With deduplicateMessages & displayedMessages deduplication:
      const rawPollutedMessages = [
        createMockMessage({ id: 'msg-0' }),
        createMockMessage({ id: 'msg-1' }),
        createMockMessage({ id: DUPLICATE_UUID, content: 'Hello' }),
        createMockMessage({ id: DUPLICATE_UUID, content: 'Hello duplicate' }),
      ];

      const cleaned = deduplicateMessages(rawPollutedMessages);
      expect(cleaned).toHaveLength(3);

      const reactKeys = cleaned.map((m) => `.2:$${m.id}`);
      const keySet = new Set(reactKeys);

      // Verify 100% uniqueness of React reconciliation keys
      expect(keySet.size).toBe(reactKeys.length);
      expect(reactKeys.filter((k) => k === `.2:$${DUPLICATE_UUID}`)).toHaveLength(1);
    });
  });

  // Normalization safety
  describe('normalizeChatMessage string trimming & safety', () => {
    it('trims whitespace and ensures non-empty canonical IDs', () => {
      const raw = {
        id: `  ${DUPLICATE_UUID}  `,
        clientTempId: '  mob_temp_123  ',
        content: 'Trimmed message',
      };
      const normalized = normalizeChatMessage(raw);
      expect(normalized.id).toBe(DUPLICATE_UUID);
      expect(normalized.clientTempId).toBe('mob_temp_123');
    });
  });
});
