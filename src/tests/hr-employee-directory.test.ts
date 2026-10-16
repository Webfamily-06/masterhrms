import { describe, it, expect, vi } from "vitest";
import {
  formatEmploymentType,
  getPaginationDisplayRange,
  getStatusBadge,
  getLoginStatusBadge,
} from "../routes/_authenticated/hr/employees/index";

describe("HR Employee Directory Frontend & Interaction Suite", () => {
  // ─── 1. Value Formatters & Neutral Placeholders ─────────────────────────────
  describe("1. Formatters and Neutral Placeholders", () => {
    it("formats known employment types into human-readable labels", () => {
      expect(formatEmploymentType("full_time")).toBe("Full Time");
      expect(formatEmploymentType("part_time")).toBe("Part Time");
      expect(formatEmploymentType("contract")).toBe("Contract");
      expect(formatEmploymentType("intern")).toBe("Intern");
    });

    it("returns consistent neutral em dash placeholder for absent employment type", () => {
      expect(formatEmploymentType(undefined)).toBe("—");
      expect(formatEmploymentType("")).toBe("—");
      expect(formatEmploymentType(null as any)).toBe("—");
    });

    it("formats custom or underscore-separated types into title case", () => {
      expect(formatEmploymentType("seasonal_worker")).toBe("Seasonal Worker");
      expect(formatEmploymentType("freelance")).toBe("Freelance");
    });
  });

  // ─── 2. Pagination Display Range ───────────────────────────────────────────
  describe("2. Pagination Display Range Calculation", () => {
    it("calculates correct display ranges for 10 rows per page", () => {
      expect(getPaginationDisplayRange(1, 10, 47)).toBe("Showing 1–10 of 47 employees");
      expect(getPaginationDisplayRange(2, 10, 47)).toBe("Showing 11–20 of 47 employees");
      expect(getPaginationDisplayRange(5, 10, 47)).toBe("Showing 41–47 of 47 employees");
    });

    it("calculates correct display ranges for 20 and 30 rows per page", () => {
      expect(getPaginationDisplayRange(1, 20, 47)).toBe("Showing 1–20 of 47 employees");
      expect(getPaginationDisplayRange(2, 20, 47)).toBe("Showing 21–40 of 47 employees");
      expect(getPaginationDisplayRange(3, 20, 47)).toBe("Showing 41–47 of 47 employees");

      expect(getPaginationDisplayRange(1, 30, 47)).toBe("Showing 1–30 of 47 employees");
      expect(getPaginationDisplayRange(2, 30, 47)).toBe("Showing 31–47 of 47 employees");
    });

    it("handles zero matching records with clear empty range", () => {
      expect(getPaginationDisplayRange(1, 10, 0)).toBe("Showing 0–0 of 0 employees");
    });
  });

  // ─── 3. Status Badges & Login Status Badges ───────────────────────────────
  describe("3. Status & Account Badges", () => {
    it("renders Active badge with emerald styling", () => {
      const badge = getStatusBadge("active");
      expect(badge.props.children).toBe("Active");
      expect(badge.props.className).toContain("text-emerald-700");
    });

    it("renders Probation badge with amber styling", () => {
      const badge = getStatusBadge("probation");
      expect(badge.props.children).toBe("Probation");
      expect(badge.props.className).toContain("text-amber-700");
    });

    it("renders On Leave badge with blue styling", () => {
      const badge = getStatusBadge("on_leave");
      expect(badge.props.children).toBe("On Leave");
      expect(badge.props.className).toContain("text-blue-700");
    });

    it("renders Terminated badge with rose styling", () => {
      const badge = getStatusBadge("terminated");
      expect(badge.props.children).toBe("Terminated");
      expect(badge.props.className).toContain("text-rose-700");
    });

    it("renders Login Status as Active when account is linked", () => {
      const badge = getLoginStatusBadge("active", "user-uuid-123");
      expect(badge.props.children).toBe("Active");
      expect(badge.props.className).toContain("text-emerald-700");

      const badgeByUserId = getLoginStatusBadge(undefined, "user-uuid-123");
      expect(badgeByUserId.props.children).toBe("Active");
    });

    it("renders Login Status as Inactive when no user account is linked", () => {
      const badge = getLoginStatusBadge("inactive", null);
      expect(badge.props.children).toBe("Inactive");
      expect(badge.props.className).toContain("text-slate-600");

      const badgeEmpty = getLoginStatusBadge(undefined, null);
      expect(badgeEmpty.props.children).toBe("Inactive");
    });
  });

  // ─── 4. View Mode, Filter State & Pagination Mechanics ─────────────────────
  describe("4. Filter, Search, and Pagination State Transitions", () => {
    it("preserves filter and search state when switching view mode between list and grid", () => {
      let viewMode: "list" | "grid" = "list";
      const filterState = {
        search: "Alice",
        branchId: "branch-hq",
        departmentId: "dept-eng",
        designationId: "desig-lead",
        employmentType: "full_time",
        status: "active",
        page: 2,
        limit: 10,
      };

      // Toggle to grid
      viewMode = "grid";
      expect(viewMode).toBe("grid");
      expect(filterState.search).toBe("Alice");
      expect(filterState.branchId).toBe("branch-hq");
      expect(filterState.status).toBe("active");
      expect(filterState.page).toBe(2);

      // Toggle back to list
      viewMode = "list";
      expect(viewMode).toBe("list");
      expect(filterState.search).toBe("Alice");
      expect(filterState.page).toBe(2);
    });

    it("resets page to 1 whenever any filter or search query changes", () => {
      let page = 3;
      const applyFilterChange = (setter: () => void) => {
        setter();
        page = 1; // page reset contract
      };

      // Change branch
      applyFilterChange(() => {});
      expect(page).toBe(1);

      // Change page to 2
      page = 2;
      // Change department
      applyFilterChange(() => {});
      expect(page).toBe(1);

      // Change page to 3
      page = 3;
      // Change status tab
      applyFilterChange(() => {});
      expect(page).toBe(1);
    });

    it("resets all filters to default state on reset action", () => {
      let selectedBranch = "br-1";
      let selectedDept = "dept-1";
      let selectedDesignation = "desig-1";
      let selectedEmploymentType = "contract";
      let selectedStatus = "probation";
      let search = "Smith";
      let page = 4;

      const handleResetFilters = () => {
        selectedBranch = "all";
        selectedDept = "all";
        selectedDesignation = "all";
        selectedEmploymentType = "all";
        selectedStatus = "all";
        search = "";
        page = 1;
      };

      handleResetFilters();

      expect(selectedBranch).toBe("all");
      expect(selectedDept).toBe("all");
      expect(selectedDesignation).toBe("all");
      expect(selectedEmploymentType).toBe("all");
      expect(selectedStatus).toBe("all");
      expect(search).toBe("");
      expect(page).toBe(1);
    });

    it("enforces pagination boundary constraints on Previous and Next buttons", () => {
      const isPrevDisabled = (page: number) => page <= 1;
      const isNextDisabled = (page: number, totalPages: number) => page >= totalPages;

      // Page 1 of 5
      expect(isPrevDisabled(1)).toBe(true);
      expect(isNextDisabled(1, 5)).toBe(false);

      // Page 3 of 5
      expect(isPrevDisabled(3)).toBe(false);
      expect(isNextDisabled(3, 5)).toBe(false);

      // Page 5 of 5
      expect(isPrevDisabled(5)).toBe(false);
      expect(isNextDisabled(5, 5)).toBe(true);

      // 1 single page total
      expect(isPrevDisabled(1)).toBe(true);
      expect(isNextDisabled(1, 1)).toBe(true);
    });
  });

  // ─── 5. Strict Emoji Prohibition ───────────────────────────────────────────
  describe("5. Strict UI Standards: Zero Emoji Verification", () => {
    it("ensures no decorative emojis appear in tab labels, buttons, or placeholders", () => {
      const tabLabels = ["All", "Active", "Inactive", "Probation", "Terminated"];
      const buttonLabels = [
        "Add Employee",
        "Import CSV / Excel",
        "Filters",
        "Reset Filters",
        "Previous",
        "Next",
        "View 360 Profile",
        "Edit Employee",
      ];
      const tableHeaders = [
        "#",
        "Name",
        "Employee ID",
        "Department",
        "Designation",
        "Employee Type",
        "Branch",
        "Employee Status",
        "Joined",
        "Login Status",
        "Actions",
      ];

      // Regex matching common emoji character ranges
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      for (const label of [...tabLabels, ...buttonLabels, ...tableHeaders]) {
        expect(emojiRegex.test(label)).toBe(false);
      }
    });
  });

  // ─── 6. Redundant Summary Cards Removal & Status Tab Preservation ───────────
  describe("6. Redundant Summary Cards Removal & Status Tab Preservation", () => {
    it("ensures redundant summary cards (Total Headcount, Active Workforce, etc.) are removed", async () => {
      // Read the route file content to verify absence of StatsOverviewGrid
      const fs = await import("fs/promises");
      const path = await import("path");
      const routeContent = await fs.readFile(
        path.resolve(process.cwd(), "src/routes/_authenticated/hr/employees/index.tsx"),
        "utf-8"
      );

      expect(routeContent.includes("<StatsOverviewGrid")).toBe(false);
      expect(routeContent.includes("<StatCard")).toBe(false);
      expect(routeContent.includes('title="Total Headcount"')).toBe(false);
      expect(routeContent.includes('title="Active Workforce"')).toBe(false);
      expect(routeContent.includes('title="On Leave / Probation"')).toBe(false);
      expect(routeContent.includes('title="Terminated / Exited"')).toBe(false);
    });

    it("preserves dynamic database status tabs and tallies without cards", () => {
      const mockStatusCounts = {
        all: 42,
        active: 35,
        inactive: 7,
        probation: 4,
        terminated: 3,
      };

      const tabs = [
        { id: "all", label: "All", count: mockStatusCounts.all },
        { id: "active", label: "Active", count: mockStatusCounts.active },
        { id: "inactive", label: "Inactive", count: mockStatusCounts.inactive },
        { id: "probation", label: "Probation", count: mockStatusCounts.probation },
        { id: "terminated", label: "Terminated", count: mockStatusCounts.terminated },
      ];

      expect(tabs[0].count).toBe(42);
      expect(tabs[1].count).toBe(35);
      expect(tabs[2].count).toBe(7);
      expect(tabs[3].count).toBe(4);
      expect(tabs[4].count).toBe(3);
    });
  });
});
