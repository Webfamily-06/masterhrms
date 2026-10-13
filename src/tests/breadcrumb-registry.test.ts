import { describe, it, expect } from "vitest";
import { getBreadcrumbsForRoute, formatSegmentLabel } from "@/lib/breadcrumb-registry";

describe("Authoritative Breadcrumb Registry & Route Hierarchy", () => {
  it("formats special segment labels correctly", () => {
    expect(formatSegmentLabel("hr")).toBe("HRM");
    expect(formatSegmentLabel("super")).toBe("Super Admin");
    expect(formatSegmentLabel("pos")).toBe("POS");
    expect(formatSegmentLabel("crm")).toBe("CRM");
    expect(formatSegmentLabel("candidate-onboarding")).toBe("Candidate Onboarding");
  });

  it("resolves static flat routes correctly", () => {
    const invoices = getBreadcrumbsForRoute("/invoices");
    expect(invoices.length).toBeGreaterThan(1);
    expect(invoices[invoices.length - 1].label).toBe("Sales Invoices & Billing");

    const pos = getBreadcrumbsForRoute("/pos");
    expect(pos[pos.length - 1].label).toBe("Point of Sale Register");

    const shopify = getBreadcrumbsForRoute("/shopify");
    expect(shopify[shopify.length - 1].label).toBe("Shopify Sync");
  });

  it("resolves HR portal routes (/hr/*)", () => {
    const hrEmp = getBreadcrumbsForRoute("/hr/employees");
    expect(hrEmp[0].label).toBe("Home");
    expect(hrEmp[1].label).toBe("HRM Suite");
    expect(hrEmp[2].label).toBe("Employees");
  });

  it("resolves Employee Self-Service routes (/me/*)", () => {
    const meProfile = getBreadcrumbsForRoute("/me/profile");
    expect(meProfile[0].label).toBe("Home");
    expect(meProfile[1].label).toBe("Employee Portal");
    expect(meProfile[2].label).toBe("Profile");
  });

  it("resolves Super Admin routes (/super/*)", () => {
    const superTenants = getBreadcrumbsForRoute("/super/tenants");
    expect(superTenants[0].label).toBe("Home");
    expect(superTenants[1].label).toBe("Super Admin");
    expect(superTenants[2].label).toBe("Tenant Workspaces");
  });

  it("resolves Tenant Portal routes (/tenant/*)", () => {
    const tenantBilling = getBreadcrumbsForRoute("/tenant/billing");
    expect(tenantBilling[0].label).toBe("Home");
    expect(tenantBilling[1].label).toBe("Tenant Management");
    expect(tenantBilling[2].label).toBe("Billing & Invoices");
  });

  it("handles trailing slashes and query strings gracefully", () => {
    const clean = getBreadcrumbsForRoute("/accounting/?page=1");
    expect(clean[clean.length - 1].label).toBe("Advanced Accounting & Ledger");
  });
});
