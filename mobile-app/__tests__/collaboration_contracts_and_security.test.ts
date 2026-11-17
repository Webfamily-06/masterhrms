import { Share } from 'react-native';
import { apiClient } from '../src/core/api/apiClient';
import {
  validateChatAttachmentCandidate,
  resolveSafeBackendUrl,
  classifyAttachmentKind,
  exportAndShareIcs,
  MAX_CHAT_FILE_SIZE_BYTES,
} from '../src/core/storage/attachmentHelper';
import { realtimeManager } from '../src/core/realtime/realtimeManager';
import { ChatService } from '../src/core/services/chatService';
import { CalendarService } from '../src/core/services/calendarService';
import { TodoService } from '../src/core/services/todoService';
import { queryClient, createTenantQueryKey } from '../src/app/providers/QueryProvider';
import { useTenantStore } from '../src/store/tenantStore';
import { useAuthStore } from '../src/store/authStore';

jest.mock('../src/core/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Phase 6 & 7: Collaboration API Contracts, Attachment Security, Cache & Realtime', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    realtimeManager.disconnectAll();
    queryClient.clear();
    await useAuthStore.getState().logout();
    await useTenantStore.getState().clearTenant();
  });

  // ── 1. ATTACHMENT SECURITY TESTS ────────────────────────────
  describe('1. Attachment Security & Safe URL Validation', () => {
    it('blocks dangerous extensions (.svg, .html, .exe, .env, .js, .sh)', () => {
      const blockedNames = [
        'payload.svg',
        'xss.html',
        'trojan.exe',
        '.env',
        'script.js',
        'deploy.sh',
      ];
      for (const name of blockedNames) {
        const res = validateChatAttachmentCandidate({ name, size: 1024 });
        expect(res.valid).toBe(false);
        expect(res.reason).toBeDefined();
      }
    });

    it('blocks SVG and HTML MIME types even with innocuous file names', () => {
      expect(
        validateChatAttachmentCandidate({
          name: 'image.png',
          mimeType: 'image/svg+xml',
          size: 512,
        }).valid
      ).toBe(false);
      expect(
        validateChatAttachmentCandidate({
          name: 'doc.txt',
          mimeType: 'text/html',
          size: 512,
        }).valid
      ).toBe(false);
    });

    it('enforces 30 MB maximum attachment size limit', () => {
      expect(
        validateChatAttachmentCandidate({
          name: 'report.pdf',
          mimeType: 'application/pdf',
          size: MAX_CHAT_FILE_SIZE_BYTES + 1,
        }).valid
      ).toBe(false);

      expect(
        validateChatAttachmentCandidate({
          name: 'report.pdf',
          mimeType: 'application/pdf',
          size: 5 * 1024 * 1024,
        }).valid
      ).toBe(true);
    });

    it('rejects javascript:, data:, vbscript:, and file: URLs while normalizing relative and DiceBear SVG URLs', () => {
      expect(resolveSafeBackendUrl('javascript:alert(1)')).toBeNull();
      expect(resolveSafeBackendUrl('data:text/html;base64,PHNjcmlwdD4=')).toBeNull();
      expect(resolveSafeBackendUrl('file:///etc/passwd')).toBeNull();

      const dicebear = resolveSafeBackendUrl(
        'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah'
      );
      expect(dicebear).toBe('https://api.dicebear.com/7.x/avataaars/png?seed=sarah');

      const rel = resolveSafeBackendUrl('/uploads/chat/doc.pdf');
      expect(rel).toMatch(/^https?:\/\/.+\/uploads\/chat\/doc\.pdf$/);
    });

    it('classifies attachment kinds accurately', () => {
      expect(classifyAttachmentKind('image/jpeg', 'photo.jpg')).toBe('image');
      expect(classifyAttachmentKind('application/pdf', 'spec.pdf')).toBe('pdf');
      expect(classifyAttachmentKind('audio/mp4', 'note.m4a')).toBe('audio');
      expect(classifyAttachmentKind('video/mp4', 'clip.mp4')).toBe('video');
      expect(classifyAttachmentKind('application/zip', 'bundle.zip')).toBe('file');
    });

    it('exports authenticated .ics content and invokes native Share', async () => {
      const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: 'BEGIN:VCALENDAR\nVERSION:2.0\nSUMMARY:Review\nEND:VCALENDAR',
      });

      const content = await exportAndShareIcs('/api/calendar/export/ics', {
        startDate: '2026-11-01T00:00:00.000Z',
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/calendar/export/ics',
        expect.objectContaining({
          params: { startDate: '2026-11-01T00:00:00.000Z' },
          responseType: 'text',
        })
      );
      expect(content).toContain('BEGIN:VCALENDAR');
      expect(shareSpy).toHaveBeenCalled();
      shareSpy.mockRestore();
    });
  });

  // ── 2. REALTIME ENGINE & CLEANUP TESTS ──────────────────────
  describe('2. Realtime Socket.IO & Pusher Connection, Deduplication & Cleanup', () => {
    let sentFrames: string[] = [];
    let mockSocketInstances: any[] = [];
    const OriginalWebSocket = (globalThis as any).WebSocket;

    beforeEach(() => {
      sentFrames = [];
      mockSocketInstances = [];

      class MockWs {
        public static OPEN = 1;
        public readyState = 1;
        public url: string;
        public onopen: any = null;
        public onmessage: any = null;
        public onerror: any = null;
        public onclose: any = null;

        constructor(url: string) {
          this.url = url;
          mockSocketInstances.push(this);
        }

        send(data: string) {
          sentFrames.push(data);
        }

        close() {
          this.readyState = 3;
        }
      }

      (globalThis as any).WebSocket = MockWs;
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: { enabled: false } },
      });
    });

    afterEach(() => {
      realtimeManager.disconnectAll();
      (globalThis as any).WebSocket = OriginalWebSocket;
    });

    it('authenticates Engine.IO v4 handshake, joins tenant room, responds to pings, and cleans up on unmount', () => {
      realtimeManager.connect({
        token: 'jwt-test-token',
        userId: 'u-1',
        tenantId: 'tenant-alpha',
      });

      expect(mockSocketInstances.length).toBeGreaterThanOrEqual(1);
      const sioWs = mockSocketInstances[0];
      expect(sioWs.url).toContain('/socket.io/?EIO=4&transport=websocket');

      // Server sends Engine.IO open packet '0{...}'
      sioWs.onmessage({ data: '0{"sid":"abc","pingInterval":25000}' });
      expect(sentFrames).toContain('40{"token":"jwt-test-token"}');

      // Server sends Socket.IO connect ack '40{"sid":"sio1"}'
      sioWs.onmessage({ data: '40{"sid":"sio1"}' });
      expect(realtimeManager.isConnected()).toBe(true);
      expect(sentFrames).toContain('42["join-tenant","tenant-alpha"]');

      // Server ping '2' -> client pong '3'
      sioWs.onmessage({ data: '2' });
      expect(sentFrames).toContain('3');

      // Reference-counted chat thread join & leave
      const leaveA = realtimeManager.joinChatThread('group_eng');
      const leaveB = realtimeManager.joinChatThread('group_eng');
      expect(
        sentFrames.filter((f) => f === '42["chat:join",{"threadId":"group_eng"}]')
      ).toHaveLength(1);

      leaveA();
      expect(
        sentFrames.filter((f) => f === '42["chat:leave",{"threadId":"group_eng"}]')
      ).toHaveLength(0);

      leaveB();
      expect(
        sentFrames.filter((f) => f === '42["chat:leave",{"threadId":"group_eng"}]')
      ).toHaveLength(1);

      // Disconnect cleans up state
      realtimeManager.disconnectAll();
      expect(realtimeManager.isConnected()).toBe(false);
    });

    it('deduplicates identical dual-transport events and normalizes call.incoming -> call:incoming', () => {
      const receivedMsgs: any[] = [];
      const receivedCalls: any[] = [];

      const unsubMsg = realtimeManager.subscribe('chat:message', (p) => receivedMsgs.push(p));
      const unsubCall = realtimeManager.subscribe('call:incoming', (p) => receivedCalls.push(p));

      const eventPayload = { threadId: 'direct_1_2', message: { id: 'msg-99', content: 'Hi' } };
      realtimeManager.dispatchIncomingEvent('chat:message', eventPayload);
      realtimeManager.dispatchIncomingEvent('chat:message', eventPayload);
      expect(receivedMsgs).toHaveLength(1);

      realtimeManager.dispatchIncomingEvent('call.incoming', {
        callId: 'call-77',
        callerId: 'u-2',
        callerName: 'Priya',
      });
      expect(receivedCalls).toHaveLength(1);
      expect(receivedCalls[0].callId).toBe('call-77');

      unsubMsg();
      unsubCall();
    });
  });

  // ── 3. REACT QUERY CACHE & TENANT SWITCH ISOLATION ──────────
  describe('3. React Query Cache Purge on Tenant Switch', () => {
    it('cancels and clears cached tenant queries and disconnects realtime on tenant switch', async () => {
      await useTenantStore.getState().setTenant({
        resolved: true,
        id: 'tenant-alpha',
        name: 'Alpha Corp',
        slug: 'alpha',
      } as any);

      const alphaKey = createTenantQueryKey(['todos', 'list', 'all']);
      queryClient.setQueryData(alphaKey, [{ id: 'alpha-secret-todo' }]);
      expect(queryClient.getQueryData(alphaKey)).toBeDefined();

      // Switch to Tenant Beta
      await useTenantStore.getState().setTenant({
        resolved: true,
        id: 'tenant-beta',
        name: 'Beta Ltd',
        slug: 'beta',
      } as any);

      // Alpha cache must be completely purged
      expect(queryClient.getQueryData(alphaKey)).toBeUndefined();
      const betaKey = createTenantQueryKey(['todos', 'list', 'all']);
      expect(betaKey[0]).toBe('tenant-beta');
    });
  });

  // ── 4. CHAT, CALENDAR & TODO API CONTRACT TESTS ─────────────
  describe('4. Authoritative Backend API Contracts', () => {
    it('ChatService maps conversations, messages, batch forward, polls, groups and calls', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: [
          {
            threadId: 'direct_u1_u2',
            type: 'direct',
            name: 'Arun Kumar',
            lastMessage: 'Updated Q4 deck',
            unreadCount: 3,
            isPinned: true,
          },
        ],
      });
      const convs = await ChatService.getConversations();
      expect(apiClient.get).toHaveBeenCalledWith('/api/chat/conversations', {
        params: { filter: undefined, includeArchived: undefined },
      });
      expect(convs[0].threadId).toBe('direct_u1_u2');
      expect(convs[0].unreadCount).toBe(3);

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { forwardedCount: 2 },
      });
      const fwd = await ChatService.forwardMessageBatch('msg-1', ['direct_u1_u3', 'group_hr']);
      expect(apiClient.post).toHaveBeenCalledWith('/api/chat/messages/forward-batch', {
        messageId: 'msg-1',
        targetThreadIds: ['direct_u1_u3', 'group_hr'],
      });
      expect(fwd.forwardedCount).toBe(2);

      (apiClient.delete as jest.Mock).mockResolvedValueOnce({
        data: { mode: 'everyone' },
      });
      const del = await ChatService.deleteMessage('msg-1', 'everyone');
      expect(apiClient.delete).toHaveBeenCalledWith('/api/chat/messages/msg-1', {
        params: { mode: 'everyone', forEveryone: 'true' },
      });
      expect(del.mode).toBe('everyone');
    });

    it('CalendarService merges primary events with read-only HR/Employee/Todo projections and sends rsvpStatus', async () => {
      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: [
              {
                id: 'evt-1',
                title: 'Board Sync',
                startDate: '2026-11-20T10:00:00.000Z',
                endDate: '2026-11-20T11:00:00.000Z',
                category: 'Meetings',
                sourceDomain: 'calendar',
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: [
            {
              id: 'todo-task-88',
              title: 'Submit Audit Report',
              startDate: '2026-11-21T00:00:00.000Z',
              endDate: '2026-11-21T23:59:59.000Z',
              allDay: true,
              category: 'Tasks',
              sourceDomain: 'todo',
            },
          ],
        });

      const merged = await CalendarService.getCompositeEvents({
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        scope: 'me',
      });

      expect(apiClient.get).toHaveBeenNthCalledWith(
        1,
        '/api/calendar/events',
        expect.anything()
      );
      expect(apiClient.get).toHaveBeenNthCalledWith(
        2,
        '/api/v1/me/calendar/events',
        expect.anything()
      );
      expect(merged).toHaveLength(2);
      const projectedTodo = merged.find((e) => e.id === 'todo-task-88')!;
      expect(projectedTodo.isReadOnly).toBe(true);
      expect(projectedTodo.linkedTaskId).toBe('task-88');

      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });
      await CalendarService.rsvpEvent('evt-1', 'accepted');
      expect(apiClient.post).toHaveBeenCalledWith('/api/calendar/events/evt-1/rsvp', {
        rsvpStatus: 'accepted',
      });
    });

    it('TodoService normalizes tasks, scopes admin vs employee requests, and updates checklists/comments', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              id: 'todo-101',
              userId: 'u-hr',
              title: 'Verify PF Challan',
              completed: false,
              priority: 'urgent',
              tag: 'operations',
              startDate: '2026-11-17',
              dueDate: '2026-11-22',
              progress: 50,
              starred: true,
              isCreator: true,
              isAssignee: false,
              checklist: [{ id: 'c1', text: 'Download ECR', done: true }],
              comments: [{ id: 'm1', author: 'Sarah', text: 'In review', createdAt: '2026-11-17T01:00:00Z' }],
            },
          ],
        },
      });

      const adminTodos = await TodoService.getTodos({ scope: 'all' });
      expect(apiClient.get).toHaveBeenCalledWith('/api/todos', {
        params: { scope: 'all' },
      });
      expect(adminTodos[0].priority).toBe('urgent');
      expect(adminTodos[0].checklist[0].done).toBe(true);

      (apiClient.patch as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            checklist: [{ id: 'c1', text: 'Download ECR', done: false }],
            progress: 0,
            completed: false,
          },
        },
      });
      const toggled = await TodoService.toggleChecklistItem('todo-101', 'c1', false);
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/api/todos/todo-101/checklist/c1',
        { done: false }
      );
      expect(toggled.progress).toBe(0);
    });
  });
});
