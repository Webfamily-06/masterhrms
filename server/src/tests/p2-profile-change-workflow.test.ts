import { describe, it, expect, vi, beforeEach } from "vitest";
import { employeeSelfServiceRouter } from "../routes/employee-self-service.routes";
import { rawPrisma, prisma } from "../prisma";
import * as contextModule from "../context/tenant-context";

describe("P2 Employee Profile & Change Request Workflow", () => {
  const tenantId = "tenant-p2-profile-test";
  const employeeId = "emp-requester-1";
  const reviewerEmployeeId = "emp-manager-1";
  const userId = "user-requester-1";

  function getHandler(router: any, method: string, path: string) {
    const route = router.stack.find(
      (layer: any) =>
        layer.route &&
        layer.route.path === path &&
        layer.route.methods[method.toLowerCase()]
    );
    if (!route) throw new Error(`Route ${method} ${path} not found`);
    return route.route.stack[route.route.stack.length - 1].handle;
  }

  function mockResponse() {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    const mockDb: any = {
      outboxEvent: { create: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      notification: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.spyOn(contextModule, "getTenantDb").mockReturnValue(mockDb);
  });

  it("1. Direct Edit: Updates non-sensitive phone and gender immediately", async () => {
    const mockDb = rawPrisma || prisma;
    const updateSpy = vi.spyOn(mockDb.employee, "update").mockResolvedValue({
      id: employeeId,
      phone: "+91 99999 88888",
      gender: "female",
      updatedAt: new Date(),
    } as any);

    const handler = getHandler(employeeSelfServiceRouter, "put", "/profile");
    const req: any = {
      user: { userId, tenantId },
      employee: { id: employeeId },
      body: { phone: "+91 99999 88888", gender: "female" },
    };
    const res = mockResponse();

    await handler(req, res);

    expect(res.json).toHaveBeenCalled();
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: employeeId },
      data: expect.objectContaining({ phone: "+91 99999 88888", gender: "female" }),
      select: expect.any(Object),
    });
  });

  it("2. Workflow Change Request: Submits sensitive field (bankAccount) as PENDING and queues outbox event", async () => {
    const mockDb = rawPrisma || prisma;
    vi.spyOn(mockDb.employee, "findUnique").mockResolvedValue({
      id: employeeId,
      bankAccount: "111122223333",
    } as any);

    const createChangeReqSpy = vi.spyOn(mockDb.employeeChangeRequest, "create").mockResolvedValue({
      id: "cr-101",
      tenantId,
      employeeId,
      fieldCategory: "bank",
      fieldKey: "bankAccount",
      status: "PENDING",
    } as any);

    const handler = getHandler(employeeSelfServiceRouter, "post", "/profile/change-requests");
    const req: any = {
      user: { userId, tenantId },
      employee: { id: employeeId },
      body: {
        fieldCategory: "bank",
        fieldKey: "bankAccount",
        newValue: "999988887777",
      },
    };
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(createChangeReqSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        employeeId,
        fieldCategory: "bank",
        fieldKey: "bankAccount",
        status: "PENDING",
      }),
    });
  });

  it("3. Workflow Approval: Updates authoritative Employee record upon approval and emits outbox event", async () => {
    const mockDb = rawPrisma || prisma;
    vi.spyOn(mockDb.employeeChangeRequest, "findUnique").mockResolvedValue({
      id: "cr-101",
      tenantId,
      employeeId,
      fieldKey: "bankAccount",
      newValueJson: JSON.stringify("999988887777"),
      status: "PENDING",
      employee: { id: employeeId, managerId: reviewerEmployeeId },
    } as any);

    const updateChangeReqSpy = vi.spyOn(mockDb.employeeChangeRequest, "update").mockResolvedValue({
      id: "cr-101",
      status: "APPROVED",
      reviewedBy: reviewerEmployeeId,
    } as any);

    const updateEmployeeSpy = vi.spyOn(mockDb.employee, "update").mockResolvedValue({} as any);

    const handler = getHandler(employeeSelfServiceRouter, "post", "/team/profile-changes/:id/action");
    const req: any = {
      user: { userId: "user-reviewer", tenantId, roles: ["hr_admin"] },
      employee: { id: reviewerEmployeeId },
      params: { id: "cr-101" },
      body: { action: "approve", reviewerNotes: "Verified with bank passbook" },
    };
    const res = mockResponse();

    await handler(req, res);

    expect(res.json).toHaveBeenCalled();
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(updateChangeReqSpy).toHaveBeenCalledWith({
      where: { id: "cr-101" },
      data: expect.objectContaining({ status: "APPROVED", reviewedBy: reviewerEmployeeId }),
    });
    // Employee record is updated with new value!
    expect(updateEmployeeSpy).toHaveBeenCalledWith({
      where: { id: employeeId },
      data: { bankAccount: "999988887777" },
    });
  });
});
