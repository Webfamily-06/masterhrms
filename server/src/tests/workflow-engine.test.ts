import { describe, it, expect, vi } from "vitest";
import { WorkflowService } from "../services/workflow.service";
import { runWithTenantContext } from "../context/tenant-context";

describe("P1 Shared Workflow & Approval Engine", () => {
  const tenantId = "tenant-workflow-test";
  const userId = "user-requester-1";
  const approverId = "user-approver-1";

  it("submits an approval request and creates PENDING state", async () => {
    const mockRequest = {
      id: "req-1",
      tenantId,
      entityType: "LeaveRequest",
      entityId: "leave-101",
      requesterId: userId,
      status: "PENDING",
      currentStepOrder: 1,
    };

    const mockDb: any = {
      workflowDefinition: {
        findFirst: vi.fn().mockResolvedValue({
          id: "wf-1",
          steps: [
            { id: "step-1", stepOrder: 1, name: "Manager Approval" },
            { id: "step-2", stepOrder: 2, name: "HR Approval" },
          ],
        }),
      },
      approvalRequest: {
        create: vi.fn().mockResolvedValue(mockRequest),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-1" }),
      },
      outboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "outbox-1" }),
      },
      $transaction: async (cb: any) => cb(mockDb),
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
        return await WorkflowService.submitRequest({
          tenantId,
          entityType: "LeaveRequest",
          entityId: "leave-101",
          requesterId: userId,
          payloadSnapshot: { days: 3 },
        });
      }
    );

    expect(result.id).toBe("req-1");
    expect(result.status).toBe("PENDING");
    expect(mockDb.approvalRequest.create).toHaveBeenCalled();
    expect(mockDb.auditLog.create).toHaveBeenCalled();
    expect(mockDb.outboxEvent.create).toHaveBeenCalled();
  });

  it("advances step on approveStep when multi-step", async () => {
    const mockExistingRequest = {
      id: "req-1",
      tenantId,
      entityType: "LeaveRequest",
      entityId: "leave-101",
      requesterId: userId,
      status: "PENDING",
      currentStepOrder: 1,
      workflow: {
        steps: [
          { id: "step-1", stepOrder: 1 },
          { id: "step-2", stepOrder: 2 },
        ],
      },
    };

    const mockDb: any = {
      approvalRequest: {
        findFirst: vi.fn().mockResolvedValue(mockExistingRequest),
        update: vi.fn().mockResolvedValue({
          ...mockExistingRequest,
          currentStepOrder: 2,
          status: "PENDING",
        }),
      },
      approvalAction: {
        create: vi.fn().mockResolvedValue({ id: "act-1" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-2" }),
      },
      outboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "outbox-2" }),
      },
      $transaction: async (cb: any) => cb(mockDb),
    };

    const result = await runWithTenantContext(
      {
        tenantId,
        userId: approverId,
        roles: ["manager"],
        tenancyStrategy: "SHARED_SCHEMA",
        status: "ACTIVE",
        db: mockDb,
      },
      async () => {
        return await WorkflowService.approveStep({
          tenantId,
          requestId: "req-1",
          actorId: approverId,
          comment: "Looks good, recommended to HR",
        });
      }
    );

    expect(result.currentStepOrder).toBe(2);
    expect(result.status).toBe("PENDING");
    expect(mockDb.approvalAction.create).toHaveBeenCalled();
  });

  it("finalizes to APPROVED when last step is approved", async () => {
    const mockExistingRequest = {
      id: "req-1",
      tenantId,
      entityType: "LeaveRequest",
      entityId: "leave-101",
      requesterId: userId,
      status: "PENDING",
      currentStepOrder: 2,
      workflow: {
        steps: [
          { id: "step-1", stepOrder: 1 },
          { id: "step-2", stepOrder: 2 },
        ],
      },
    };

    const mockDb: any = {
      approvalRequest: {
        findFirst: vi.fn().mockResolvedValue(mockExistingRequest),
        update: vi.fn().mockResolvedValue({
          ...mockExistingRequest,
          status: "APPROVED",
        }),
      },
      approvalAction: {
        create: vi.fn().mockResolvedValue({ id: "act-2" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-3" }),
      },
      outboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "outbox-3" }),
      },
      $transaction: async (cb: any) => cb(mockDb),
    };

    const result = await runWithTenantContext(
      {
        tenantId,
        userId: approverId,
        roles: ["hr_admin"],
        tenancyStrategy: "SHARED_SCHEMA",
        status: "ACTIVE",
        db: mockDb,
      },
      async () => {
        return await WorkflowService.approveStep({
          tenantId,
          requestId: "req-1",
          actorId: approverId,
          comment: "Final approval granted",
        });
      }
    );

    expect(result.status).toBe("APPROVED");
  });

  it("transitions to REJECTED and denies further state mutations", async () => {
    const mockExistingRequest = {
      id: "req-2",
      tenantId,
      entityType: "LeaveRequest",
      entityId: "leave-102",
      requesterId: userId,
      status: "PENDING",
      currentStepOrder: 1,
    };

    const mockDb: any = {
      approvalRequest: {
        findFirst: vi.fn().mockResolvedValue(mockExistingRequest),
        update: vi.fn().mockResolvedValue({
          ...mockExistingRequest,
          status: "REJECTED",
        }),
      },
      approvalAction: {
        create: vi.fn().mockResolvedValue({ id: "act-3" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-4" }),
      },
      outboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "outbox-4" }),
      },
      $transaction: async (cb: any) => cb(mockDb),
    };

    const result = await runWithTenantContext(
      {
        tenantId,
        userId: approverId,
        roles: ["manager"],
        tenancyStrategy: "SHARED_SCHEMA",
        status: "ACTIVE",
        db: mockDb,
      },
      async () => {
        return await WorkflowService.rejectStep({
          tenantId,
          requestId: "req-2",
          actorId: approverId,
          comment: "Insufficient leave balance",
        });
      }
    );

    expect(result.status).toBe("REJECTED");
  });
});
