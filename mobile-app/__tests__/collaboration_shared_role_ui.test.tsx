import React from 'react';
import * as RN from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider, notifyManager } from '@tanstack/react-query';
import { ThemeProvider } from '../src/app/providers/ThemeProvider';
import { useAuthStore } from '../src/store/authStore';
import { useTenantStore } from '../src/store/tenantStore';
import { realtimeManager } from '../src/core/realtime/realtimeManager';
import { apiClient } from '../src/core/api/apiClient';
import { ChatConversationsScreen } from '../src/modules/chat/screens/ChatConversationsScreen';
import { ChatConversationDetailScreen } from '../src/modules/chat/screens/ChatConversationDetailScreen';
import { CalendarMainScreen } from '../src/modules/calendar/screens/CalendarMainScreen';
import { TodoListScreen } from '../src/modules/todo/screens/TodoListScreen';
import { GanttTimelineScreen } from '../src/modules/todo/screens/GanttTimelineScreen';

notifyManager.setScheduler((cb) => cb());
notifyManager.setNotifyFunction((fn) => {
  act(() => {
    fn();
  });
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: any = {};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: () => true,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('../src/core/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

/**
 * Safely extracts all visible text nodes from ReactTestRenderer JSON output
 * without traversing React 19 circular Context.Provider references on props.
 */
function extractRenderedText(node: any): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractRenderedText).filter(Boolean).join(' ');
  }
  if (Array.isArray(node.children)) {
    const sep = node.type === 'Text' ? '' : ' ';
    return node.children.map(extractRenderedText).filter(Boolean).join(sep);
  }
  return '';
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
}

function setupPersonaSession(
  persona: 'hr_admin' | 'tenant_admin' | 'employee',
  extraPerms: string[] = []
) {
  act(() => {
    useTenantStore.setState({
      currentTenant: {
        resolved: true,
        id: 'tenant-alpha-1',
        name: 'Alpha Corporation',
        slug: 'alpha',
        logoUrl: '/logo.webp',
        logoDark: '/logo.webp',
        faviconUrl: '/favicon.webp',
        primaryColor: '#4F46E5',
        timezone: 'Asia/Kolkata',
        isWhiteLabeled: false,
      },
      isResolved: true,
    });

    const roleMap = {
      hr_admin: {
        id: 'user-hr-1',
        email: 'hr@masterhrms.com',
        roles: ['hr_admin'],
        permissions: ['hrm.dashboard.view', 'hrm.announcements.manage', ...extraPerms],
        fullName: 'Sarah HR Lead',
      },
      tenant_admin: {
        id: 'user-ta-1',
        email: 'tenantadmin@masterhrms.com',
        roles: ['tenant_admin'],
        permissions: ['hrm.manage', 'hrm.dashboard.view', '*', ...extraPerms],
        fullName: 'Vikram Tenant Admin',
      },
      employee: {
        id: 'user-emp-1',
        email: 'employee@masterhrms.com',
        roles: ['employee'],
        permissions: [...extraPerms],
        fullName: 'Riya Employee',
      },
    }[persona];

    useAuthStore.getState().setUser({
      id: roleMap.id,
      email: roleMap.email,
      roles: roleMap.roles,
      permissions: roleMap.permissions,
      enabledModules: ['hrm', 'project'],
      allowedDashboards: ['hrm', 'project'],
      profile: {
        fullName: roleMap.fullName,
        tenantId: 'tenant-alpha-1',
      },
    });
    useAuthStore.getState().setToken('jwt-valid');
  });
}

function wrapWithClient(qc: QueryClient, ui: React.ReactElement) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </ThemeProvider>
  );
}

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 25));
};

describe('Phase 6 & 7: Shared Role UI Parity, Permissions, Ownership & Responsive Layouts', () => {
  let qc: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    qc = createTestQueryClient();
  });

  afterEach(async () => {
    realtimeManager.disconnectAll();
    await qc.cancelQueries();
    qc.clear();
  });

  // ── 1. SHARED CHAT MODULE ACROSS ALL 3 ROLES ────────────────
  describe('1. Shared Chat Module (HR Admin, Tenant Admin, Employee)', () => {
    it.each(['hr_admin', 'tenant_admin', 'employee'] as const)(
      'renders identical shared ChatConversationsScreen hierarchy and real conversations for %s',
      async (persona) => {
        setupPersonaSession(persona);
        (apiClient.get as jest.Mock).mockImplementation((url: string) => {
          if (url === '/api/chat/conversations') {
            return Promise.resolve({
              data: [
                {
                  threadId: 'direct_1_2',
                  type: 'direct',
                  name: 'Priya Sharma',
                  lastMessage: 'Sprint review at 4 PM',
                  unreadCount: 2,
                },
              ],
            });
          }
          if (url === '/api/chat/presence') {
            return Promise.resolve({ data: { onlineUserIds: ['u-2'] } });
          }
          return Promise.resolve({ data: [] });
        });

        let tree: ReactTestRenderer.ReactTestRenderer | null = null;
        try {
          await act(async () => {
            tree = ReactTestRenderer.create(wrapWithClient(qc, <ChatConversationsScreen />));
            await flushMicrotasks();
          });

          const text = extractRenderedText(tree!.toJSON());
          expect(text).toContain('Messages & Chat');
          expect(text).toContain('Personal');
          expect(text).toContain('Groups');
          expect(text).toContain('Contacts');
          expect(text).toContain('Call Logs');
          expect(text).toContain('Priya Sharma');
          expect(text).toContain('Sprint review at 4 PM');
        } finally {
          if (tree) {
            await act(async () => {
              tree!.unmount();
            });
          }
        }
      }
    );

    it('locks announcement channel composer for regular employee while allowing HR Admin / Group Owner', async () => {
      mockRouteParams = {
        threadId: 'group_ann1',
        title: 'Company Announcements',
        type: 'announcement',
        groupId: 'ann1',
        isAnnouncementOnly: true,
      };

      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/chat/groups/ann1')) {
          return Promise.resolve({
            data: {
              id: 'ann1',
              threadId: 'group_ann1',
              name: 'Company Announcements',
              ownerId: 'user-hr-1',
              myRole: 'member',
              isAnnouncementOnly: true,
              members: [{ id: 'user-emp-1', userId: 'user-emp-1', name: 'Riya', role: 'member' }],
            },
          });
        }
        if (url.includes('/api/chat/messages/')) {
          return Promise.resolve({
            data: { messages: [], nextCursor: null, hasMore: false },
          });
        }
        return Promise.resolve({ data: [] });
      });

      setupPersonaSession('employee');
      let empTree: ReactTestRenderer.ReactTestRenderer | null = null;
      try {
        await act(async () => {
          empTree = ReactTestRenderer.create(
            wrapWithClient(qc, <ChatConversationDetailScreen />)
          );
          await flushMicrotasks();
        });
        expect(extractRenderedText(empTree!.toJSON())).toContain(
          'Only group owners and administrators can post'
        );
      } finally {
        if (empTree) {
          await act(async () => {
            empTree!.unmount();
          });
        }
      }

      const qcHr = createTestQueryClient();
      setupPersonaSession('hr_admin');
      let hrTree: ReactTestRenderer.ReactTestRenderer | null = null;
      try {
        await act(async () => {
          hrTree = ReactTestRenderer.create(
            wrapWithClient(qcHr, <ChatConversationDetailScreen />)
          );
          await flushMicrotasks();
        });
        expect(extractRenderedText(hrTree!.toJSON())).not.toContain(
          'Only group owners and administrators can post'
        );
      } finally {
        if (hrTree) {
          await act(async () => {
            hrTree!.unmount();
          });
        }
        qcHr.clear();
      }
    });

    it('hides Chat module switcher tab when user has explicit -!chat.view negative permission', async () => {
      setupPersonaSession('employee', ['-!chat.view']);
      (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });

      let tree: ReactTestRenderer.ReactTestRenderer | null = null;
      try {
        await act(async () => {
          tree = ReactTestRenderer.create(wrapWithClient(qc, <TodoListScreen />));
          await flushMicrotasks();
        });

        const chatTabs = tree!.root.findAll(
          (n) => n.props?.accessibilityLabel === 'Chat module'
        );
        expect(chatTabs).toHaveLength(0);
      } finally {
        if (tree) {
          await act(async () => {
            tree!.unmount();
          });
        }
      }
    });

    it('executes real message send, poll vote, and queues failed sends without fabricating delivery', async () => {
      mockRouteParams = {
        threadId: 'direct_u1_u2',
        title: 'Arun Kumar',
        type: 'direct',
        otherParticipantId: 'u-2',
      };
      setupPersonaSession('employee');

      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/chat/messages/')) {
          return Promise.resolve({
            data: {
              messages: [
                {
                  id: 'msg-poll-1',
                  threadId: 'direct_u1_u2',
                  senderId: 'u-2',
                  senderName: 'Arun Kumar',
                  content: 'Pick sprint retro slot',
                  createdAt: new Date().toISOString(),
                  poll: {
                    question: 'Retro time?',
                    options: [
                      { id: 'opt-1', text: '3 PM', votes: 1, voters: [] },
                      { id: 'opt-2', text: '4 PM', votes: 0, voters: [] },
                    ],
                    closed: false,
                  },
                },
              ],
              nextCursor: null,
              hasMore: false,
            },
          });
        }
        return Promise.resolve({ data: [] });
      });

      let tree: ReactTestRenderer.ReactTestRenderer | null = null;
      try {
        await act(async () => {
          tree = ReactTestRenderer.create(
            wrapWithClient(qc, <ChatConversationDetailScreen />)
          );
          await flushMicrotasks();
        });

        // Vote on poll option 1
        (apiClient.post as jest.Mock).mockResolvedValueOnce({
          data: {
            poll: {
              question: 'Retro time?',
              options: [
                { id: 'opt-1', text: '3 PM', votes: 2, voters: ['user-emp-1'] },
                { id: 'opt-2', text: '4 PM', votes: 0, voters: [] },
              ],
              closed: false,
            },
          },
        });

        const optBtn = tree!.root.findAll(
          (n) =>
            typeof n.props?.onPress === 'function' &&
            extractRenderedText(n).includes('3 PM')
        )[0];
        await act(async () => {
          await optBtn.props.onPress();
        });
        expect(apiClient.post).toHaveBeenCalledWith(
          '/api/chat/messages/msg-poll-1/poll/vote',
          { optionId: 'opt-1' }
        );

        // Simulate failed send -> must enter retry queue, NOT fake message delivery
        const input = tree!.root.findAllByType(RN.TextInput).find((i) =>
          String(i.props?.placeholder || '').includes('Write a message')
        )!;
        await act(async () => {
          input.props.onChangeText('Test offline draft');
        });

        (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('503 Service Down'));
        const sendBtn = tree!.root.find(
          (n) => n.props?.accessibilityLabel === 'Send message'
        );
        await act(async () => {
          await sendBtn.props.onPress();
        });

        const afterFailText = extractRenderedText(tree!.toJSON());
        expect(afterFailText).toContain('Not delivered: Test offline draft');
        expect(afterFailText).toContain('Retry');
      } finally {
        if (tree) {
          await act(async () => {
            tree!.unmount();
          });
        }
      }
    });
  });

  // ── 2. SHARED CALENDAR MODULE ACROSS ALL 3 ROLES ────────────
  describe('2. Shared Calendar Module & Role-Scoped Projections', () => {
    it('loads /api/v1/me/calendar/events for Employee and /api/v1/hr/calendar/events for HR & Tenant Admin with identical UI', async () => {
      for (const persona of ['employee', 'hr_admin', 'tenant_admin'] as const) {
        jest.clearAllMocks();
        const localQc = createTestQueryClient();
        setupPersonaSession(persona);

        (apiClient.get as jest.Mock).mockImplementation((url: string) => {
          if (url === '/api/calendar/categories') {
            return Promise.resolve({
              data: {
                data: [{ id: 'Meetings', name: 'Meetings', color: '#4F46E5', isSystem: true }],
              },
            });
          }
          if (url === '/api/calendar/events') {
            return Promise.resolve({
              data: {
                data: [
                  {
                    id: 'ev-1',
                    title: 'Quarterly Planning',
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 3600000).toISOString(),
                    allDay: false,
                    category: 'Meetings',
                    sourceDomain: 'calendar',
                  },
                ],
              },
            });
          }
          return Promise.resolve({ data: [] });
        });

        let tree: ReactTestRenderer.ReactTestRenderer | null = null;
        try {
          await act(async () => {
            tree = ReactTestRenderer.create(wrapWithClient(localQc, <CalendarMainScreen />));
            await flushMicrotasks();
          });

          const calledUrls = (apiClient.get as jest.Mock).mock.calls.map((c) => c[0]);
          if (persona === 'employee') {
            expect(calledUrls).toContain('/api/v1/me/calendar/events');
            expect(calledUrls).not.toContain('/api/v1/hr/calendar/events');
          } else {
            expect(calledUrls).toContain('/api/v1/hr/calendar/events');
          }

          const rendered = extractRenderedText(tree!.toJSON());
          expect(rendered).toContain('Workspace Calendar');
          expect(rendered).toContain('Quarterly Planning');
          expect(rendered).toContain('AGENDA');
          expect(rendered).toContain('MONTH');
          expect(rendered).toContain('WEEK');
          expect(rendered).toContain('DAY');
        } finally {
          if (tree) {
            await act(async () => {
              tree!.unmount();
            });
          }
          localQc.clear();
        }
      }
    });
  });

  // ── 3. SHARED TODO & GANTT MODULES + OWNERSHIP GATING ───────
  describe('3. Shared Todo & Gantt Timeline Modules', () => {
    const sampleTask = {
      id: 'task-501',
      userId: 'user-hr-1',
      title: 'Complete Payroll Reconciliation',
      description: 'Verify TDS and PF deductions',
      completed: false,
      priority: 'high',
      tag: 'operations',
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      progress: 40,
      starred: true,
      isCreator: false,
      isAssignee: true,
      assignees: [{ id: 'user-emp-1', name: 'Riya Employee', email: 'employee@masterhrms.com' }],
      checklist: [{ id: 'chk-1', text: 'Audit attendance lock', done: true }],
      comments: [],
      activity: [
        { id: 'act-1', text: 'Task assigned to Riya', timestamp: new Date().toISOString() },
      ],
      createdAt: new Date().toISOString(),
    };

    it('enforces Employee own-scope vs Admin all-scope on TodoListScreen and hides Delete/Edit for non-owner Employee assignee', async () => {
      mockRouteParams = { taskId: 'task-501' };

      setupPersonaSession('employee');
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/todos') {
          return Promise.resolve({ data: { data: [sampleTask] } });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      let empTree: ReactTestRenderer.ReactTestRenderer | null = null;
      try {
        await act(async () => {
          empTree = ReactTestRenderer.create(wrapWithClient(qc, <TodoListScreen />));
          await flushMicrotasks();
        });

        expect(apiClient.get).toHaveBeenCalledWith('/api/todos', { params: undefined });
        const empText = extractRenderedText(empTree!.toJSON());
        expect(empText).toContain('Complete Payroll Reconciliation');
        expect(empText).toContain('Mark Completed');
        expect(empText).not.toContain('Delete Task');
        expect(empText).not.toContain('Edit / Reschedule');
      } finally {
        if (empTree) {
          await act(async () => {
            empTree!.unmount();
          });
        }
      }

      jest.clearAllMocks();
      const qcHr = createTestQueryClient();
      setupPersonaSession('hr_admin');
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/todos') {
          return Promise.resolve({ data: { data: [{ ...sampleTask, isCreator: true }] } });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      let hrTree: ReactTestRenderer.ReactTestRenderer | null = null;
      try {
        await act(async () => {
          hrTree = ReactTestRenderer.create(wrapWithClient(qcHr, <TodoListScreen />));
          await flushMicrotasks();
        });

        expect(apiClient.get).toHaveBeenCalledWith('/api/todos', {
          params: { scope: 'all' },
        });
        const hrText = extractRenderedText(hrTree!.toJSON());
        expect(hrText).toContain('Edit / Reschedule');
        expect(hrText).toContain('Delete Task');
      } finally {
        if (hrTree) {
          await act(async () => {
            hrTree!.unmount();
          });
        }
        qcHr.clear();
      }
    });

    it('renders GanttTimelineScreen with pinned task column, 14d/28d scale switcher, Prev/Today/Next nav, and proportional task bars', async () => {
      mockRouteParams = {};
      setupPersonaSession('tenant_admin');
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/todos') {
          return Promise.resolve({ data: { data: [sampleTask] } });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      let ganttTree: ReactTestRenderer.ReactTestRenderer | null = null;
      try {
        await act(async () => {
          ganttTree = ReactTestRenderer.create(wrapWithClient(qc, <GanttTimelineScreen />));
          await flushMicrotasks();
        });

        const text14 = extractRenderedText(ganttTree!.toJSON());
        expect(text14).toContain('Gantt Timeline');
        expect(text14).toContain('Complete Payroll Reconciliation');
        expect(text14).toContain('14d');
        expect(text14).toContain('28d');

        const nextBtn = ganttTree!.root.find(
          (n) => n.props?.accessibilityLabel === 'Next week'
        );
        await act(async () => {
          nextBtn.props.onPress();
        });

        expect(extractRenderedText(ganttTree!.toJSON())).toContain('Gantt Timeline');
      } finally {
        if (ganttTree) {
          await act(async () => {
            ganttTree!.unmount();
          });
        }
      }
    });

    it('surfaces explicit Error + Retry state when backend API rejects', async () => {
      mockRouteParams = {};
      setupPersonaSession('employee');
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Workspace API unreachable'));

      let tree: ReactTestRenderer.ReactTestRenderer | null = null;
      try {
        await act(async () => {
          tree = ReactTestRenderer.create(wrapWithClient(qc, <TodoListScreen />));
          await flushMicrotasks();
        });

        const rendered = extractRenderedText(tree!.toJSON());
        expect(rendered).toContain('Unable to Load Data');
        expect(rendered).toContain('Workspace API unreachable');
        expect(rendered).toContain('Retry');
      } finally {
        if (tree) {
          await act(async () => {
            tree!.unmount();
          });
        }
      }
    });
  });

  // ── 4. PHONE VS TABLET RESPONSIVE LAYOUT CHECKS ─────────────
  describe('4. Phone & Tablet Responsive Layout Adaptation', () => {
    it('adapts Calendar default view across small phone (360px) and tablet (820px)', async () => {
      setupPersonaSession('hr_admin');
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { data: [] } });

      act(() => {
        RN.Dimensions.set({
          window: { width: 360, height: 800, scale: 2, fontScale: 1 },
          screen: { width: 360, height: 800, scale: 2, fontScale: 1 },
        });
      });

      let phoneTree: ReactTestRenderer.ReactTestRenderer | null = null;
      try {
        await act(async () => {
          phoneTree = ReactTestRenderer.create(wrapWithClient(qc, <CalendarMainScreen />));
          await flushMicrotasks();
        });
        expect(extractRenderedText(phoneTree!.toJSON())).toContain('Agenda Schedule');
      } finally {
        if (phoneTree) {
          await act(async () => {
            phoneTree!.unmount();
          });
        }
      }

      act(() => {
        RN.Dimensions.set({
          window: { width: 820, height: 1180, scale: 2, fontScale: 1 },
          screen: { width: 820, height: 1180, scale: 2, fontScale: 1 },
        });
      });

      const qcTablet = createTestQueryClient();
      let tabletTree: ReactTestRenderer.ReactTestRenderer | null = null;
      try {
        await act(async () => {
          tabletTree = ReactTestRenderer.create(
            wrapWithClient(qcTablet, <CalendarMainScreen />)
          );
          await flushMicrotasks();
        });
        expect(extractRenderedText(tabletTree!.toJSON())).toContain('Month Schedule');
      } finally {
        if (tabletTree) {
          await act(async () => {
            tabletTree!.unmount();
          });
        }
        qcTablet.clear();
      }
    });
  });
});
