import { describe, it, expect, vi, beforeEach } from "vitest";
import { OutboxService } from "../services/outbox.service";
import * as socketModule from "../socket";

describe("P1 Transactional Outbox & Realtime Room Isolation", () => {
  const tenantA = "tenant-alpha";
  const tenantB = "tenant-beta";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists outbox event with PENDING status", async () => {
    const mockTx: any = {
      outboxEvent: {
        create: vi.fn().mockResolvedValue({
          id: "evt-1",
          tenantId: tenantA,
          eventType: "employee.created",
          entityType: "Employee",
          entityId: "emp-101",
          status: "PENDING",
        }),
      },
    };

    const result = await OutboxService.createOutboxEvent(
      {
        tenantId: tenantA,
        eventType: "employee.created",
        entityType: "Employee",
        entityId: "emp-101",
        actorId: "actor-1",
        payload: { firstName: "John", lastName: "Doe" },
      },
      mockTx
    );

    expect(result.id).toBe("evt-1");
    expect(result.status).toBe("PENDING");
    expect(mockTx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: tenantA,
          eventType: "employee.created",
          status: "PENDING",
        }),
      })
    );
  });

  it("dispatches pending outbox events to correct tenant rooms and marks PROCESSED", async () => {
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

    // Mock Prisma findMany and update
    const { rawPrisma, prisma } = await import("../prisma");
    const targetPrisma = rawPrisma || prisma;
    const mockEvents = [
      {
        id: "evt-pending-1",
        tenantId: tenantA,
        eventType: "leave.approved",
        entityType: "LeaveRequest",
        entityId: "leave-99",
        actorId: "mgr-1",
        payload: { days: 2, recipientId: "user-alice" },
        metadata: {},
        createdAt: new Date(),
        retryCount: 0,
      },
    ];

    vi.spyOn(targetPrisma.outboxEvent, "findMany").mockResolvedValue(mockEvents as any);
    const updateSpy = vi.spyOn(targetPrisma.outboxEvent, "update").mockResolvedValue({} as any);

    const count = await OutboxService.processPendingEvents(10);

    expect(count).toBe(1);
    // Verified dispatched to Tenant A's room
    expect(emittedRooms).toContain(`tenant:${tenantA}`);
    expect(emittedRooms).toContain("record:LeaveRequest:leave-99");
    expect(emittedRooms).toContain("user:user-alice");
    // Guaranteed NOT dispatched to Tenant B's room
    expect(emittedRooms).not.toContain(`tenant:${tenantB}`);

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt-pending-1" },
        data: expect.objectContaining({ status: "PROCESSED" }),
      })
    );
  });
});
