import { describe, it, expect, vi, beforeEach } from "vitest";
import { CalendarService } from "../services/calendar.service";
import { TodoService } from "../services/todo.service";
import { NotificationService } from "../services/notification.service";
import * as tenantContext from "../context/tenant-context";

describe("MASTERHRMS P8 — Collaboration & Final Polish Test Suite", () => {
  const tenantA = "tenant-a-corp";
  const tenantB = "tenant-b-corp";
  const userA = "user-alice-01";
  const employeeA = "emp-alice-01";
  const userB = "user-bob-02";
  const employeeB = "emp-bob-02";

  // Mock DB store
  let mockMeetings: any[] = [];
  let mockTrainingSessions: any[] = [];
  let mockLeaveRequests: any[] = [];
  let mockHolidays: any[] = [];
  let mockCalendarEvents: any[] = [];
  let mockActionItems: any[] = [];
  let mockApprovalRequests: any[] = [];
  let mockAssetAssignments: any[] = [];
  let mockDocAcks: any[] = [];
  let mockWorkspaceTodos: any[] = [];
  let mockNotifications: any[] = [];

  beforeEach(() => {
    mockMeetings = [
      {
        id: "mtg-1",
        tenantId: tenantA,
        title: "Sprint Planning",
        organizerId: employeeA,
        startTime: new Date("2026-10-15T10:00:00Z"),
        endTime: new Date("2026-10-15T11:00:00Z"),
        status: "scheduled",
        room: { name: "Boardroom Alpha" },
        attendees: [{ employeeId: employeeA }],
      },
      {
        id: "mtg-2",
        tenantId: tenantA,
        title: "Confidential Executive Review",
        organizerId: "emp-exec-99",
        startTime: new Date("2026-10-16T14:00:00Z"),
        endTime: new Date("2026-10-16T15:00:00Z"),
        status: "scheduled",
        room: null,
        attendees: [{ employeeId: "emp-exec-99" }],
      },
      {
        id: "mtg-tenant-b",
        tenantId: tenantB,
        title: "Tenant B Strategy",
        organizerId: employeeB,
        startTime: new Date("2026-10-15T10:00:00Z"),
        endTime: new Date("2026-10-15T11:00:00Z"),
        status: "scheduled",
        attendees: [{ employeeId: employeeB }],
      },
    ];

    mockTrainingSessions = [
      {
        id: "tr-1",
        tenantId: tenantA,
        title: "Security & Compliance Workshop",
        trainer: "Alex Instructor",
        startDate: new Date("2026-10-20T09:00:00Z"),
        endDate: new Date("2026-10-20T12:00:00Z"),
        status: "scheduled",
        course: { title: "InfoSec 101" },
        attendances: [{ employeeId: employeeA }],
      },
    ];

    mockLeaveRequests = [
      {
        id: "lv-1",
        tenantId: tenantA,
        employeeId: employeeA,
        startDate: new Date("2026-10-25"),
        endDate: new Date("2026-10-26"),
        status: "approved",
        reason: "Personal appointment",
        employee: { firstName: "Alice", lastName: "Smith" },
        leaveType: { name: "Casual Leave" },
      },
      {
        id: "lv-colleague",
        tenantId: tenantA,
        employeeId: "emp-colleague-55",
        startDate: new Date("2026-10-25"),
        endDate: new Date("2026-10-25"),
        status: "approved",
        reason: "Confidential medical reason",
        employee: { firstName: "Charlie", lastName: "Brown" },
        leaveType: { name: "Sick Leave" },
      },
    ];

    mockHolidays = [
      {
        id: "hol-1",
        tenantId: tenantA,
        name: "National Day",
        date: new Date("2026-10-02"),
      },
    ];

    mockCalendarEvents = [
      {
        id: "ce-1",
        tenantId: tenantA,
        userId: userA,
        title: "Doctor Appointment",
        startDate: new Date("2026-10-22T15:00:00Z"),
        endDate: new Date("2026-10-22T16:00:00Z"),
        allDay: false,
        category: "personal",
      },
    ];

    mockActionItems = [
      {
        id: "act-1",
        tenantId: tenantA,
        title: "Prepare Q4 roadmap slides",
        assigneeId: employeeA,
        status: "open",
        priority: "high",
        dueDate: new Date("2026-10-30"),
        assignee: { firstName: "Alice", lastName: "Smith" },
      },
    ];

    mockApprovalRequests = [
      {
        id: "appr-1",
        tenantId: tenantA,
        entityType: "LeaveRequest",
        entityId: "lv-99",
        currentStep: 1,
        status: "PENDING",
        requesterId: userA,
      },
    ];

    mockAssetAssignments = [
      {
        id: "ast-assign-1",
        employeeId: employeeA,
        status: "active",
        acknowledgedAt: null,
        assignedAt: new Date("2026-10-01"),
        asset: { id: "ast-1", name: "MacBook Pro M3", brand: "Apple", tenantId: tenantA },
        employee: { firstName: "Alice", lastName: "Smith" },
      },
    ];

    mockDocAcks = [
      {
        id: "doc-ack-1",
        tenantId: tenantA,
        employeeId: employeeA,
        status: "pending",
        acknowledgedAt: null,
        document: { title: "2026 Information Security Policy" },
        employee: { firstName: "Alice", lastName: "Smith" },
      },
    ];

    mockWorkspaceTodos = [
      {
        id: "todo-1",
        tenantId: tenantA,
        userId: userA,
        title: "Review team pull requests",
        completed: false,
        priority: "medium",
        dueDate: new Date("2026-10-18"),
      },
    ];

    mockNotifications = [
      {
        id: "notif-1",
        tenantId: tenantA,
        userId: userA,
        title: "Meeting Invitation",
        body: "You are invited to Sprint Planning",
        module: "MEETINGS",
        channel: "IN_APP",
        readAt: null,
        createdAt: new Date(),
      },
      {
        id: "notif-2",
        tenantId: tenantA,
        userId: userA,
        title: "Policy Update",
        body: "Please acknowledge the updated policy",
        module: "DOCUMENTS",
        channel: "IN_APP",
        readAt: new Date(),
        createdAt: new Date(),
      },
    ];

    // Mock Prisma Tenant DB
    const mockDb: any = {
      meeting: {
        findMany: vi.fn(({ where }) => {
          return mockMeetings.filter((m) => {
            if (m.tenantId !== where.tenantId) return false;
            if (where.status && m.status === "cancelled") return false;
            if (where.OR) {
              const matchesOrganizer = where.OR.some((cond: any) => cond.organizerId === m.organizerId);
              const matchesAttendee = where.OR.some((cond: any) =>
                cond.attendees?.some?.employeeId && m.attendees?.some((att: any) => att.employeeId === cond.attendees.some.employeeId)
              );
              if (!matchesOrganizer && !matchesAttendee) return false;
            }
            return true;
          });
        }),
      },
      trainingSession: {
        findMany: vi.fn(({ where }) => {
          return mockTrainingSessions.filter((s) => s.tenantId === where.tenantId && s.status !== "cancelled");
        }),
      },
      leaveRequest: {
        findMany: vi.fn(({ where }) => {
          return mockLeaveRequests.filter((l) => {
            if (l.tenantId !== where.tenantId) return false;
            if (where.employeeId && l.employeeId !== where.employeeId) return false;
            if (where.id === "__none__") return false;
            return true;
          });
        }),
      },
      holiday: {
        findMany: vi.fn(({ where }) => {
          return mockHolidays.filter((h) => h.tenantId === where.tenantId);
        }),
      },
      calendarEvent: {
        findMany: vi.fn(({ where }) => {
          return mockCalendarEvents.filter((ce) => {
            if (ce.tenantId !== where.tenantId) return false;
            if (where.userId && ce.userId !== where.userId) return false;
            return true;
          });
        }),
        create: vi.fn(({ data }) => {
          const item = { id: `ce-${Date.now()}`, ...data };
          mockCalendarEvents.push(item);
          return item;
        }),
        deleteMany: vi.fn(({ where }) => {
          mockCalendarEvents = mockCalendarEvents.filter((ce) => ce.id !== where.id);
          return { count: 1 };
        }),
      },
      meetingActionItem: {
        findMany: vi.fn(({ where }) => {
          return mockActionItems.filter((a) => {
            if (a.tenantId !== where.tenantId) return false;
            if (where.OR) {
              const matchAssignee = where.OR.some((c: any) => c.assigneeId === a.assigneeId);
              if (!matchAssignee) return false;
            }
            return true;
          });
        }),
        updateMany: vi.fn(({ where, data }) => {
          const item = mockActionItems.find((a) => a.id === where.id);
          if (item) Object.assign(item, data);
          return { count: item ? 1 : 0 };
        }),
      },
      approvalRequest: {
        findMany: vi.fn(({ where }) => {
          return mockApprovalRequests.filter((req) => req.tenantId === where.tenantId);
        }),
      },
      assetAssignment: {
        findMany: vi.fn(({ where }) => {
          return mockAssetAssignments.filter((assign) => {
            if (assign.asset.tenantId !== where.asset?.tenantId) return false;
            if (where.employeeId && assign.employeeId !== where.employeeId) return false;
            return true;
          });
        }),
        updateMany: vi.fn(({ where, data }) => {
          const item = mockAssetAssignments.find((a) => a.id === where.id);
          if (item) Object.assign(item, data);
          return { count: item ? 1 : 0 };
        }),
      },
      documentAcknowledgement: {
        findMany: vi.fn(({ where }) => {
          return mockDocAcks.filter((ack) => {
            if (ack.tenantId !== where.tenantId) return false;
            if (where.employeeId && ack.employeeId !== where.employeeId) return false;
            return true;
          });
        }),
        updateMany: vi.fn(({ where, data }) => {
          const item = mockDocAcks.find((ack) => ack.id === where.id);
          if (item) Object.assign(item, data);
          return { count: item ? 1 : 0 };
        }),
      },
      workspaceTodo: {
        findMany: vi.fn(({ where }) => {
          return mockWorkspaceTodos.filter((t) => {
            if (t.tenantId !== where.tenantId) return false;
            if (where.userId && t.userId !== where.userId) return false;
            return true;
          });
        }),
        create: vi.fn(({ data }) => {
          const item = { id: `todo-${Date.now()}`, ...data };
          mockWorkspaceTodos.push(item);
          return item;
        }),
        updateMany: vi.fn(({ where, data }) => {
          const item = mockWorkspaceTodos.find((t) => t.id === where.id);
          if (item) Object.assign(item, data);
          return { count: item ? 1 : 0 };
        }),
        deleteMany: vi.fn(({ where }) => {
          mockWorkspaceTodos = mockWorkspaceTodos.filter((t) => t.id !== where.id);
          return { count: 1 };
        }),
      },
      notification: {
        findMany: vi.fn(({ where }) => {
          return mockNotifications.filter((n) => {
            if (n.tenantId !== where.tenantId || n.userId !== where.userId) return false;
            if (where.readAt === null && n.readAt !== null) return false;
            return true;
          });
        }),
        count: vi.fn(({ where }) => {
          return mockNotifications.filter((n) => {
            if (n.tenantId !== where.tenantId || n.userId !== where.userId) return false;
            if (where.readAt === null && n.readAt !== null) return false;
            return true;
          }).length;
        }),
        updateMany: vi.fn(({ where, data }) => {
          const matching = mockNotifications.filter(
            (n) => n.tenantId === where.tenantId && n.userId === where.userId && (!where.id || n.id === where.id)
          );
          matching.forEach((n) => Object.assign(n, data));
          return { count: matching.length };
        }),
        create: vi.fn(({ data }) => {
          const item = { id: `notif-${Date.now()}`, ...data, createdAt: new Date() };
          mockNotifications.push(item);
          return item;
        }),
      },
    };

    vi.spyOn(tenantContext, "getTenantDb").mockReturnValue(mockDb);
  });

  // ==========================================
  // 1. CALENDAR PROJECTION TESTS
  // ==========================================
  describe("1. Calendar Domain: Multi-Source Projection & Privacy Filtering", () => {
    it("projects composite events from meetings, training, leaves, and holidays for HR (P8-BR-001, P8-BR-003)", async () => {
      const events = await CalendarService.getEvents(tenantA, { isHR: true });

      expect(events.length).toBeGreaterThanOrEqual(4);
      expect(events.some((e) => e.category === "meeting")).toBe(true);
      expect(events.some((e) => e.category === "training")).toBe(true);
      expect(events.some((e) => e.category === "leave")).toBe(true);
      expect(events.some((e) => e.category === "holiday")).toBe(true);

      // HR sees both Alice and Charlie's leave
      const leaveEvents = events.filter((e) => e.category === "leave");
      expect(leaveEvents.length).toBe(2);
    });

    it("enforces strict employee privacy in Employee Portal view (P8-BR-002)", async () => {
      const events = await CalendarService.getEvents(tenantA, {
        isHR: false,
        userId: userA,
        employeeId: employeeA,
      });

      // Alice must see her own Sprint Planning meeting
      expect(events.some((e) => e.title === "Sprint Planning")).toBe(true);

      // Alice must NOT see confidential meetings where she is not an attendee
      expect(events.some((e) => e.title === "Confidential Executive Review")).toBe(false);

      // Alice must NOT see Charlie's confidential leave
      expect(events.some((e) => e.title.includes("Charlie"))).toBe(false);
      expect(events.some((e) => e.title.includes("My Leave"))).toBe(true);
    });

    it("creates and manages ad-hoc calendar events with tenant scoping (P8-BR-004)", async () => {
      const newEvent = await CalendarService.createEvent(tenantA, userA, {
        title: "All-Hands Townhall",
        startDate: new Date("2026-11-01T10:00:00Z"),
        endDate: new Date("2026-11-01T11:00:00Z"),
        category: "company",
      });

      expect(newEvent.title).toBe("All-Hands Townhall");
      expect(mockCalendarEvents.some((ce) => ce.title === "All-Hands Townhall")).toBe(true);

      // Delete event
      await CalendarService.deleteEvent(tenantA, newEvent.id, userA, false);
      expect(mockCalendarEvents.some((ce) => ce.id === newEvent.id)).toBe(false);
    });
  });

  // ==========================================
  // 2. UNIFIED TODO TESTS
  // ==========================================
  describe("2. Todo Domain: Action-Item Aggregation & Mutation Delegation", () => {
    it("projects unified tasks from action items, approvals, asset handovers, doc acks, and todos (P8-BR-005)", async () => {
      const items = await TodoService.getTodoItems(tenantA, {
        isHR: false,
        userId: userA,
        employeeId: employeeA,
      });

      expect(items.length).toBe(5);
      expect(items.some((i) => i.sourceDomain === "meeting_action")).toBe(true);
      expect(items.some((i) => i.sourceDomain === "approval")).toBe(true);
      expect(items.some((i) => i.sourceDomain === "asset_handover")).toBe(true);
      expect(items.some((i) => i.sourceDomain === "document_ack")).toBe(true);
      expect(items.some((i) => i.sourceDomain === "workspace_todo")).toBe(true);
    });

    it("delegates task status mutation back to authoritative domain models (P8-BR-006)", async () => {
      // 1. Delegate meeting action item completion
      await TodoService.updateTaskStatus(tenantA, {
        sourceDomain: "meeting_action",
        sourceId: "act-1",
        completed: true,
      });
      expect(mockActionItems.find((a) => a.id === "act-1")?.status).toBe("completed");

      // 2. Delegate workspace personal todo completion
      await TodoService.updateTaskStatus(tenantA, {
        sourceDomain: "workspace_todo",
        sourceId: "todo-1",
        completed: true,
      });
      expect(mockWorkspaceTodos.find((t) => t.id === "todo-1")?.completed).toBe(true);

      // 3. Delegate digital asset handover acknowledgement
      await TodoService.updateTaskStatus(tenantA, {
        sourceDomain: "asset_handover",
        sourceId: "ast-assign-1",
        employeeId: employeeA,
      });
      expect(mockAssetAssignments.find((a) => a.id === "ast-assign-1")?.acknowledgedAt).not.toBeNull();
    });

    it("creates and deletes personal ad-hoc todos (P8-BR-005)", async () => {
      const todo = await TodoService.createPersonalTodo(tenantA, userA, {
        title: "Draft Q4 OKRs",
        priority: "high",
      });

      expect(todo.title).toBe("Draft Q4 OKRs");
      expect(mockWorkspaceTodos.some((t) => t.title === "Draft Q4 OKRs")).toBe(true);

      await TodoService.deletePersonalTodo(tenantA, todo.id, userA, false);
      expect(mockWorkspaceTodos.some((t) => t.id === todo.id)).toBe(false);
    });
  });

  // ==========================================
  // 3. GLOBAL NOTIFICATION CENTER TESTS
  // ==========================================
  describe("3. Notification Domain: Center State & Realtime Invalidation", () => {
    it("retrieves paginated user notifications with accurate unread counts (P8-BR-009)", async () => {
      const result = await NotificationService.getUserNotifications(tenantA, userA);

      expect(result.notifications.length).toBe(2);
      expect(result.unreadCount).toBe(1);
    });

    it("marks specific notification as read and marks all as read (P8-BR-009)", async () => {
      await NotificationService.markAsRead(tenantA, "notif-1", userA);
      expect(mockNotifications.find((n) => n.id === "notif-1")?.readAt).not.toBeNull();

      await NotificationService.markAllAsRead(tenantA, userA);
      const remainingUnread = mockNotifications.filter((n) => n.readAt === null);
      expect(remainingUnread.length).toBe(0);
    });
  });

  // ==========================================
  // 4. TENANT ISOLATION & PRIVACY TESTS
  // ==========================================
  describe("4. Security & Tenant Isolation Across P8", () => {
    it("never leaks Tenant B calendar events to Tenant A (P8-BR-001)", async () => {
      const events = await CalendarService.getEvents(tenantA, { isHR: true });
      expect(events.some((e) => e.title === "Tenant B Strategy")).toBe(false);
    });

    it("isolates notifications by user and tenant boundaries (P8-BR-009)", async () => {
      const result = await NotificationService.getUserNotifications(tenantB, userB);
      // User B in Tenant B has 0 notifications from Alice/Tenant A
      expect(result.notifications.length).toBe(0);
      expect(result.unreadCount).toBe(0);
    });
  });
});
