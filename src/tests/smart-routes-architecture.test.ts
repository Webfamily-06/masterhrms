import { describe, it, expect } from "vitest";
import { getBreadcrumbsForRoute, ROUTE_BREADCRUMBS } from "@/lib/breadcrumb-registry";
import { ROUTE_ENTITLEMENT_MAP } from "@/lib/navigation-resolver";
import { MASTER_ADDON_REGISTRY, validateNavigationRegistry, resolveStandaloneModules } from "@/lib/addon-navigation";
import { REPORT_DICTIONARY } from "@/components/smart-reports/report-view";

describe("Smart Add-ons Route Architecture & Page Placement Regression Tests", () => {
  it("1. Validates entire navigation registry with 0 errors", () => {
    const result = validateNavigationRegistry(MASTER_ADDON_REGISTRY);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("2. Verifies canonical Smart Dashboard routes in breadcrumbs & entitlement map", () => {
    const dashboardRoutes = [
      "/smart-dashboard",
      "/smart-dashboard/financial",
      "/smart-dashboard/sales",
      "/smart-dashboard/operational",
    ];

    dashboardRoutes.forEach((route) => {
      expect(ROUTE_BREADCRUMBS[route]).toBeDefined();
      expect(ROUTE_ENTITLEMENT_MAP[route]).toBe("smart-dashboard");
      const crumbs = getBreadcrumbsForRoute(route);
      expect(crumbs.length).toBeGreaterThanOrEqual(2);
      expect(crumbs[0].label).toBe("Dashboard");
    });
  });

  it("3. Verifies catalogue & all 8 independent Smart Report routes in breadcrumbs & entitlement map", () => {
    const reportRoutes = [
      "/smart-reports",
      "/smart-reports/attendance-summary",
      "/smart-reports/payroll-sheet",
      "/smart-reports/leave-report",
      "/smart-reports/sales-invoice",
      "/smart-reports/purchase-invoice",
      "/smart-reports/deal-pipeline",
      "/smart-reports/product-stock",
      "/smart-reports/project-progress",
    ];

    reportRoutes.forEach((route) => {
      expect(ROUTE_BREADCRUMBS[route]).toBeDefined();
      expect(ROUTE_ENTITLEMENT_MAP[route]).toBe("smart-reports");
      const crumbs = getBreadcrumbsForRoute(route);
      expect(crumbs.length).toBeGreaterThanOrEqual(2);
      expect(crumbs[0].label).toBe("Dashboard");
    });
  });

  it("4. Verifies REPORT_DICTIONARY contains all 8 documented enterprise reports", () => {
    const expectedReportIds = [
      "attendance-summary",
      "payroll-sheet",
      "leave-report",
      "sales-invoice",
      "purchase-invoice",
      "deal-pipeline",
      "product-stock",
      "project-progress",
    ];

    expectedReportIds.forEach((id) => {
      expect(REPORT_DICTIONARY[id]).toBeDefined();
      expect(REPORT_DICTIONARY[id].id).toBe(id);
      expect(REPORT_DICTIONARY[id].title).toBeTruthy();
      expect(REPORT_DICTIONARY[id].category).toBeTruthy();
      expect(REPORT_DICTIONARY[id].icon).toBeDefined();
    });
  });

  it("5. Verifies AI Business Advisor breadcrumb and entitlement mapping", () => {
    expect(ROUTE_BREADCRUMBS["/ai-business-advisor"]).toBeDefined();
    expect(ROUTE_ENTITLEMENT_MAP["/ai-business-advisor"]).toBe("ai-business-advisor");
    const crumbs = getBreadcrumbsForRoute("/ai-business-advisor");
    expect(crumbs.length).toBeGreaterThanOrEqual(2);
  });

  it("6. Verifies resolveStandaloneModules renders children for Smart Dashboard and Smart Reports", () => {
    const isEntitled = (key: string) => ["smart-dashboard", "smart-reports", "ai-business-advisor"].includes(key);
    const modules = resolveStandaloneModules(isEntitled, true, "/smart-dashboard/financial");

    const dashModule = modules.find((m) => m.key === "smart-dashboard");
    expect(dashModule).toBeDefined();
    expect(dashModule?.children).toHaveLength(4);
    expect(dashModule?.activeRoute).toBe(true);

    const activeChild = dashModule?.children.find((c) => c.route === "/smart-dashboard/financial");
    expect(activeChild?.isActive).toBe(true);

    const reportsModule = modules.find((m) => m.key === "smart-reports");
    expect(reportsModule).toBeDefined();
    expect(reportsModule?.children).toHaveLength(9);
  });
});
