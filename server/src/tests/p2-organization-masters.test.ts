import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMasterDataRouter } from "../blueprints/master-data.blueprint";
import { organizationRouter } from "../routes/organization.routes";
import * as contextModule from "../context/tenant-context";

describe("P2 Organization Masters & Hierarchy", () => {
  const tenantId = "tenant-p2-org-test";
  const userId = "user-hr-admin";

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
  });

  it("1. Branches Master: Creates branch with tenant isolation & outbox event", async () => {
    const mockDb: any = {
      branch: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "branch-blr",
          tenantId,
          name: "Bangalore HQ",
          code: "BLR-01",
          status: "active",
        }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      outboxEvent: { create: vi.fn().mockResolvedValue({}) },
      $transaction: async (cb: any) => cb(mockDb),
    };

    vi.spyOn(contextModule, "getTenantDb").mockReturnValue(mockDb);

    const router = createMasterDataRouter({
      modelName: "branch",
      entityName: "Branch",
      searchFields: ["name", "code"],
      uniqueFields: ["code"],
    });

    const handler = getHandler(router, "post", "/");
    const req: any = {
      user: { userId, tenantId, roles: ["hr_admin"], permissions: ["hr.organization.manage"] },
      body: { name: "Bangalore HQ", code: "BLR-01" },
    };
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockDb.branch.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId, code: "BLR-01" }),
    });
    expect(mockDb.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        eventType: "master.branch.created",
      }),
    });
  });

  it("2. Holidays Master: Normalizes date and assigns year correctly", async () => {
    const mockDb: any = {
      holiday: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "hol-1",
          tenantId,
          name: "Republic Day",
          date: new Date("2026-01-26"),
          year: 2026,
          type: "national",
        }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      outboxEvent: { create: vi.fn().mockResolvedValue({}) },
      $transaction: async (cb: any) => cb(mockDb),
    };

    vi.spyOn(contextModule, "getTenantDb").mockReturnValue(mockDb);

    const router = createMasterDataRouter({
      modelName: "holiday",
      entityName: "Holiday",
      searchFields: ["name"],
      uniqueFields: [],
    });

    const handler = getHandler(router, "post", "/");
    const req: any = {
      user: { userId, tenantId, roles: ["hr_admin"], permissions: ["hr.organization.manage"] },
      body: { name: "Republic Day", date: new Date("2026-01-26"), year: 2026, type: "national" },
    };
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockDb.holiday.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId, name: "Republic Day", year: 2026 }),
    });
  });

  it("3. Organization Structure: Generates hierarchical tree with reporting relationships", async () => {
    const mockBranches = [{ id: "b1", name: "HQ", _count: { employees: 2, departments: 1 } }];
    const mockDepartments = [{ id: "d1", name: "Engineering", branchId: "b1", _count: { employees: 2, designations: 1 } }];
    const mockDesignations = [{ id: "dg1", name: "Architect", _count: { employees: 2 } }];
    const mockEmployees = [
      {
        id: "emp-lead",
        firstName: "Aarav",
        lastName: "Patel",
        employeeCode: "EMP-001",
        managerId: null,
        position: "VP Engineering",
        status: "active",
      },
      {
        id: "emp-sub",
        firstName: "Rohan",
        lastName: "Gupta",
        employeeCode: "EMP-002",
        managerId: "emp-lead",
        position: "Senior Engineer",
        status: "active",
      },
    ];

    const mockDb: any = {
      branch: { findMany: vi.fn().mockResolvedValue(mockBranches) },
      department: { findMany: vi.fn().mockResolvedValue(mockDepartments) },
      designation: { findMany: vi.fn().mockResolvedValue(mockDesignations) },
      employee: { findMany: vi.fn().mockResolvedValue(mockEmployees) },
    };

    vi.spyOn(contextModule, "getTenantDb").mockReturnValue(mockDb);

    const handler = getHandler(organizationRouter, "get", "/structure");
    const req: any = {
      user: { userId, tenantId, roles: ["hr_admin"], permissions: ["hr.organization.view"] },
    };
    const res = mockResponse();

    await handler(req, res);

    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.stats.totalEmployees).toBe(2);
    expect(payload.orgChart.length).toBe(1); // One top-level root
    expect(payload.orgChart[0].name).toBe("Aarav Patel");
    expect(payload.orgChart[0].subordinates.length).toBe(1); // One direct subordinate
    expect(payload.orgChart[0].subordinates[0].name).toBe("Rohan Gupta");
  });
});
