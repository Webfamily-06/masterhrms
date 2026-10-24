import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationService } from "../services/notification.service";
import * as socketModule from "../socket";
import { runWithTenantContext } from "../context/tenant-context";

describe("P1 Notification Foundation", () => {
  const tenantId = "tenant-notif-test";
  const userId = "user-alice-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates notification and emits to user's private socket room", async () => {
    const emittedRooms: string[] = [];
    const emittedEvents: { event: string; payload: any }[] = [];

    const mockIO: any = {
      to: (room: string) => {
        emittedRooms.push(room);
        return {
          emit: (event: string, payload: any) => {
            emittedEvents.push({ event, payload });
          },
        };
      },
    };

    vi.spyOn(socketModule, "getIO").mockReturnValue(mockIO);

    const mockCreated = {
      id: "notif-1",
      tenantId,
      userId,
      title: "Leave Approved",
      message: "Your leave application was approved.",
      type: "SUCCESS",
      isRead: false,
      createdAt: new Date(),
    };

    const mockDb: any = {
      notification: {
        create: vi.fn().mockResolvedValue(mockCreated),
      },
    };

    const result = await runWithTenantContext(
      {
        tenantId,
        userId,
        roles: ["employee"],
        tenancyStrategy: "SHARED_SCHEMA",
        status: "ACTIVE",
        db: mockDb,
      },
      async () => {
        return await NotificationService.createNotification({
          tenantId,
          userId,
          title: "Leave Approved",
          message: "Your leave application was approved.",
          type: "SUCCESS",
        });
      }
    );

    expect(result.id).toBe("notif-1");
    expect(emittedRooms).toContain(`user:${userId}`);
    expect(emittedEvents.some((e) => e.event === "notification:new")).toBe(true);
  });

  it("retrieves notifications and counts unread accurately", async () => {
    const mockDb: any = {
      notification: {
        findMany: vi.fn().mockResolvedValue([{ id: "notif-1", isRead: false }]),
        count: vi
          .fn()
          .mockResolvedValueOnce(5) // total
          .mockResolvedValueOnce(2), // unread
      },
    };

    const result = await runWithTenantContext(
      {
        tenantId,
        userId,
        roles: ["employee"],
        tenancyStrategy: "SHARED_SCHEMA",
        status: "ACTIVE",
        db: mockDb,
      },
      async () => {
        return await NotificationService.getUserNotifications(tenantId, userId, {
          limit: 10,
        });
      }
    );

    expect(result.notifications.length).toBe(1);
    expect(result.total).toBe(5);
    expect(result.unreadCount).toBe(2);
  });

  it("enforces idempotency for calendar reminders with matching eventId and reminderId", async () => {
    const existingReminderNotif = {
      id: "notif-existing-rem-1",
      tenantId,
      userId,
      title: "Calendar Reminder: Quarterly Sync",
      body: "Quarterly Sync is starting in 15 minutes",
      module: "CALENDAR_REMINDER",
      metadataJson: { eventId: "ev-123", reminderId: "rem-456" },
      createdAt: new Date(),
    };

    const mockDb: any = {
      notification: {
        findMany: vi.fn().mockResolvedValue([existingReminderNotif]),
        create: vi.fn(),
      },
    };

    const result = await runWithTenantContext(
      {
        tenantId,
        userId,
        roles: ["employee"],
        tenancyStrategy: "SHARED_SCHEMA",
        status: "ACTIVE",
        db: mockDb,
      },
      async () => {
        return await NotificationService.createNotification({
          tenantId,
          userId,
          title: "Calendar Reminder: Quarterly Sync",
          message: "Quarterly Sync is starting in 15 minutes",
          type: "CALENDAR_REMINDER",
          metadata: { eventId: "ev-123", reminderId: "rem-456" },
        });
      }
    );

    expect(result.id).toBe("notif-existing-rem-1");
    // Ensure duplicate record is NOT created in DB
    expect(mockDb.notification.create).not.toHaveBeenCalled();
  });

  it("filters notifications by module category", async () => {
    const mockDb: any = {
      notification: {
        findMany: vi.fn().mockImplementation(({ where }) => {
          expect(where.module).toBeDefined();
          return Promise.resolve([
            { id: "cal-notif-1", module: "CALENDAR_REMINDER" },
          ]);
        }),
        count: vi.fn().mockResolvedValue(1),
      },
    };

    const result = await runWithTenantContext(
      {
        tenantId,
        userId,
        roles: ["employee"],
        tenancyStrategy: "SHARED_SCHEMA",
        status: "ACTIVE",
        db: mockDb,
      },
      async () => {
        return await NotificationService.getUserNotifications(tenantId, userId, {
          module: "CALENDAR",
        });
      }
    );

    expect(result.notifications.length).toBe(1);
    expect(result.notifications[0].module).toBe("CALENDAR_REMINDER");
  });
});
