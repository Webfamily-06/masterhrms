import { describe, it, expect } from "vitest";
import { prismaProxy, TenantContextRequiredError } from "../facade/prisma-proxy.facade";
import { runWithTenantContext } from "../context/tenant-context";

describe("Prisma Proxy Fail-Closed Tenant Isolation", () => {
  it("allows access to Global Models outside tenant context", () => {
    // Accessing user delegate properties should not throw TenantContextRequiredError
    expect(() => {
      const userModel = (prismaProxy as any).user;
      expect(userModel).toBeDefined();
    }).not.toThrow();

    expect(() => {
      const planModel = (prismaProxy as any).subscriptionPlan;
      expect(planModel).toBeDefined();
    }).not.toThrow();
  });

  it("fails closed when accessing Direct Tenant Models outside tenant context", () => {
    expect(() => {
      const _ = (prismaProxy as any).employee.findMany();
    }).toThrow(TenantContextRequiredError);

    expect(() => {
      const _ = (prismaProxy as any).department.findFirst();
    }).toThrow(TenantContextRequiredError);

    expect(() => {
      const _ = (prismaProxy as any).workflowDefinition.findMany();
    }).toThrow(TenantContextRequiredError);

    expect(() => {
      const _ = (prismaProxy as any).outboxEvent.findMany();
    }).toThrow(TenantContextRequiredError);
  });

  it("fails closed when accessing Child-Dependent Models outside tenant context", () => {
    expect(() => {
      const _ = (prismaProxy as any).workflowStep.findMany();
    }).toThrow(TenantContextRequiredError);

    expect(() => {
      const _ = (prismaProxy as any).salaryStructureItem.findMany();
    }).toThrow(TenantContextRequiredError);
  });

  it("fails closed when accessing Unclassified / Unknown properties outside tenant context", () => {
    expect(() => {
      const _ = (prismaProxy as any).someUnclassifiedEntity.findMany();
    }).toThrow(TenantContextRequiredError);
  });

  it("allows access when wrapped in an active TenantContext", async () => {
    const mockDb = {
      employee: {
        findMany: () => Promise.resolve([{ id: "emp-1", name: "Alice" }]),
      },
    } as any;

    const result = await runWithTenantContext(
      {
        tenantId: "tenant-test-123",
        userId: "user-123",
        roles: ["ADMIN"],
        tenancyStrategy: "SHARED_SCHEMA",
        status: "ACTIVE",
        db: mockDb,
      },
      async () => {
        return await (prismaProxy as any).employee.findMany();
      }
    );

    expect(result).toEqual([{ id: "emp-1", name: "Alice" }]);
  });
});
