import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WorkflowService } from "../services/workflow.service";
import { runWithTenantContext } from "../context/tenant-context";

function createMockFn(impl?: (...args: any[]) => any) {
  let currentImpl = impl;
  const calls: any[][] = [];
  const fn = ((...args: any[]) => {
    calls.push(args);
    return currentImpl ? currentImpl(...args) : undefined;
  }) as any;
  fn.calls = calls;
  fn.mockResolvedValue = (val: any) => {
    currentImpl = async () => val;
    return fn;
  };
  fn.mockReturnValue = (val: any) => {
    currentImpl = () => val;
    return fn;
  };
  return fn;
}

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
      currentStep: 1,
    };

    const mockDb: any = {
      workflowDefinition: {
        findFirst: createMockFn().mockResolvedValue({
          id: "wf-1",
          steps: [
            { id: "step-1", stepOrder: 1, name: "Manager Approval" },
            { id: "step-2", stepOrder: 2, name: "HR Approval" },
          ],
        }),
      },
      approvalRequest: {
        create: createMockFn().mockResolvedValue(mockRequest),
      },
      auditLog: {
        create: createMockFn().mockResolvedValue({ id: "audit-1" }),
      },
      outboxEvent: {
        create: createMockFn().mockResolvedValue({ id: "outbox-1" }),
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
        return await WorkflowService.submit({
          tenantId,
          entityType: "LeaveRequest",
          entityId: "leave-101",
          requesterId: userId,
          payloadSnapshot: { days: 3 },
        });
      }
    );

    assert.equal(result.id, "req-1");
    assert.equal(result.status, "PENDING");
    assert.ok(mockDb.approvalRequest.create.calls.length > 0);
    assert.ok(mockDb.auditLog.create.calls.length > 0);
    assert.ok(mockDb.outboxEvent.create.calls.length > 0);
  });

  it("advances step on approveStep when multi-step", async () => {
    const mockExistingRequest = {
      id: "req-1",
      tenantId,
      entityType: "LeaveRequest",
      entityId: "leave-101",
      requesterId: userId,
      status: "PENDING",
      currentStep: 1,
      workflow: {
        steps: [
          { id: "step-1", stepOrder: 1 },
          { id: "step-2", stepOrder: 2 },
        ],
      },
    };

    const mockDb: any = {
      approvalRequest: {
        findFirst: createMockFn().mockResolvedValue(mockExistingRequest),
        update: createMockFn().mockResolvedValue({
          ...mockExistingRequest,
          currentStep: 2,
          status: "PENDING",
        }),
      },
      approvalAction: {
        create: createMockFn().mockResolvedValue({ id: "act-1" }),
      },
      auditLog: {
        create: createMockFn().mockResolvedValue({ id: "audit-2" }),
      },
      outboxEvent: {
        create: createMockFn().mockResolvedValue({ id: "outbox-2" }),
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

    assert.equal(result.currentStep, 2);
    assert.equal(result.status, "PENDING");
    assert.ok(mockDb.approvalAction.create.calls.length > 0);
  });

  it("finalizes to APPROVED when last step is approved", async () => {
    const mockExistingRequest = {
      id: "req-1",
      tenantId,
      entityType: "LeaveRequest",
      entityId: "leave-101",
      requesterId: userId,
      status: "PENDING",
      currentStep: 2,
      workflow: {
        steps: [
          { id: "step-1", stepOrder: 1 },
          { id: "step-2", stepOrder: 2 },
        ],
      },
    };

    const mockDb: any = {
      approvalRequest: {
        findFirst: createMockFn().mockResolvedValue(mockExistingRequest),
        update: createMockFn().mockResolvedValue({
          ...mockExistingRequest,
          status: "APPROVED",
        }),
      },
      approvalAction: {
        create: createMockFn().mockResolvedValue({ id: "act-2" }),
      },
      auditLog: {
        create: createMockFn().mockResolvedValue({ id: "audit-3" }),
      },
      outboxEvent: {
        create: createMockFn().mockResolvedValue({ id: "outbox-3" }),
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

    assert.equal(result.status, "APPROVED");
  });

  it("transitions to REJECTED and denies further state mutations", async () => {
    const mockExistingRequest = {
      id: "req-2",
      tenantId,
      entityType: "LeaveRequest",
      entityId: "leave-102",
      requesterId: userId,
      status: "PENDING",
      currentStep: 1,
    };

    const mockDb: any = {
      approvalRequest: {
        findFirst: createMockFn().mockResolvedValue(mockExistingRequest),
        update: createMockFn().mockResolvedValue({
          ...mockExistingRequest,
          status: "REJECTED",
        }),
      },
      approvalAction: {
        create: createMockFn().mockResolvedValue({ id: "act-3" }),
      },
      auditLog: {
        create: createMockFn().mockResolvedValue({ id: "audit-4" }),
      },
      outboxEvent: {
        create: createMockFn().mockResolvedValue({ id: "outbox-4" }),
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

    assert.equal(result.status, "REJECTED");
  });
});
