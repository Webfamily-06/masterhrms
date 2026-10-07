import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMasterDataRouter } from "../blueprints/master-data.blueprint";
import * as contextModule from "../context/tenant-context";

describe("P1 Master Data Blueprint CRUD Router Factory", () => {
  const tenantId = "tenant-blueprint-test";
  const userId = "user-admin-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getHandler(router: any, method: string, path: string) {
    const route = router.stack.find(
      (layer: any) =>
        layer.route &&
        layer.route.path === path &&
        layer.route.methods[method.toLowerCase()]
    );
    if (!route) throw new Error(`Route ${method} ${path} not found`);
    // Return the actual handler (the last layer in route.stack)
    return route.route.stack[route.route.stack.length - 1].handle;
  }

  function mockResponse() {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  }

  it("lists departments with tenant scope and allowedActions", async () => {
    const mockDepartments = [
      { id: "dept-1", tenantId, name: "Engineering" },
      { id: "dept-2", tenantId, name: "Finance" },
    ];

    const mockDb: any = {
      department: {
        findMany: vi.fn().mockResolvedValue(mockDepartments),
        count: vi.fn().mockResolvedValue(2),
      },
      employee: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    vi.spyOn(contextModule, "getTenantDb").mockReturnValue(mockDb);

    const router = createMasterDataRouter({
      modelName: "department",
      entityName: "Department",
      searchFields: ["name"],
      uniqueFields: ["name"],
    });

    const handler = getHandler(router, "get", "/");
    const req: any = {
      user: { userId, tenantId, roles: ["admin"], permissions: ["hr.organization.manage"] },
      query: { page: "1", limit: "10" },
    };
    const res = mockResponse();

    await handler(req, res);

    expect(res.json).toHaveBeenCalled();
    const data = res.json.mock.calls[0][0];
    expect(data.data.length).toBe(2);
    expect(data.data[0].allowedActions).toContain("VIEW");
    expect(data.data[0].allowedActions).toContain("EDIT");
  });

  it("prevents duplicate names within the same tenant", async () => {
    const mockDb: any = {
      department: {
        findFirst: vi.fn().mockResolvedValue({ id: "dept-1", name: "Engineering" }),
      },
    };

    vi.spyOn(contextModule, "getTenantDb").mockReturnValue(mockDb);

    const router = createMasterDataRouter({
      modelName: "department",
      entityName: "Department",
      searchFields: ["name"],
      uniqueFields: ["name"],
    });

    const handler = getHandler(router, "post", "/");
    const req: any = {
      user: { userId, tenantId, roles: ["admin"], permissions: ["hr.organization.manage"] },
      body: { name: "Engineering" },
    };
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const err = res.json.mock.calls[0][0];
    expect(err.error).toContain("already exists");
  });

  it("creates a department and emits audit log and outbox event", async () => {
    const newDept = { id: "dept-new", tenantId, name: "Marketing" };

    const mockDb: any = {
      department: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(newDept),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-1" }),
      },
      outboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "outbox-1" }),
      },
      $transaction: async (cb: any) => cb(mockDb),
    };

    vi.spyOn(contextModule, "getTenantDb").mockReturnValue(mockDb);

    const router = createMasterDataRouter({
      modelName: "department",
      entityName: "Department",
      searchFields: ["name"],
      uniqueFields: ["name"],
    });

    const handler = getHandler(router, "post", "/");
    const req: any = {
      user: { userId, tenantId, roles: ["admin"], permissions: ["hr.organization.manage"] },
      body: { name: "Marketing" },
    };
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newDept);
    expect(mockDb.department.create).toHaveBeenCalled();
    expect(mockDb.auditLog.create).toHaveBeenCalled();
    expect(mockDb.outboxEvent.create).toHaveBeenCalled();
  });
});

