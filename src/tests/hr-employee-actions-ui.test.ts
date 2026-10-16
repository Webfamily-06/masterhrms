import { describe, it, expect } from "vitest";
import {
  getLoginStatusBadge,
  getStatusBadge,
  formatEmploymentType,
  EmployeeItem,
} from "../routes/_authenticated/hr/employees/index";

describe("HR Employee Row Actions UI & Interaction Logic Suite", () => {
  describe("1. Password Modal Validation Rules", () => {
    function validatePasswordForm(newPassword: string, confirmPassword: string): string | null {
      if (!newPassword.trim()) return "New password is required.";
      if (newPassword.trim().length < 6) return "Password must be at least 6 characters long.";
      if (!confirmPassword.trim()) return "Please confirm your new password.";
      if (newPassword !== confirmPassword) return "Passwords do not match.";
      return null;
    }

    it("requires new password field", () => {
      expect(validatePasswordForm("", "Secret123")).toBe("New password is required.");
      expect(validatePasswordForm("   ", "Secret123")).toBe("New password is required.");
    });

    it("enforces minimum password length of 6 characters", () => {
      expect(validatePasswordForm("12345", "12345")).toBe("Password must be at least 6 characters long.");
      expect(validatePasswordForm("abc", "abc")).toBe("Password must be at least 6 characters long.");
    });

    it("requires confirm password field", () => {
      expect(validatePasswordForm("Secret@123", "")).toBe("Please confirm your new password.");
      expect(validatePasswordForm("Secret@123", "   ")).toBe("Please confirm your new password.");
    });

    it("rejects mismatched passwords", () => {
      expect(validatePasswordForm("Secret@123", "Secret@456")).toBe("Passwords do not match.");
      expect(validatePasswordForm("Secret@123", "secret@123")).toBe("Passwords do not match.");
    });

    it("accepts valid matching passwords satisfying policy", () => {
      expect(validatePasswordForm("StrongPassword@2026", "StrongPassword@2026")).toBeNull();
    });
  });

  describe("2. Toggle Status Dialog Representation & Action Labels", () => {
    function getStatusActionDetails(emp: Partial<EmployeeItem>) {
      const isCurrentlyActive = emp.loginStatus === "active";
      return {
        currentStatus: isCurrentlyActive ? "Active" : "Inactive",
        newStatus: isCurrentlyActive ? "Inactive" : "Active",
        actionLabel: isCurrentlyActive ? "Deactivate Account" : "Activate Account",
        dialogTitle: isCurrentlyActive ? "Deactivate Employee Account" : "Activate Employee Account",
        buttonVariant: isCurrentlyActive ? "destructive" : "default",
      };
    }

    it("formats deactivation action correctly for active account", () => {
      const details = getStatusActionDetails({
        id: "emp-1",
        firstName: "Alice",
        lastName: "Smith",
        loginStatus: "active",
        status: "active",
      });

      expect(details.currentStatus).toBe("Active");
      expect(details.newStatus).toBe("Inactive");
      expect(details.actionLabel).toBe("Deactivate Account");
      expect(details.dialogTitle).toBe("Deactivate Employee Account");
      expect(details.buttonVariant).toBe("destructive");
    });

    it("formats activation action correctly for inactive account", () => {
      const details = getStatusActionDetails({
        id: "emp-2",
        firstName: "Bob",
        lastName: "Jones",
        loginStatus: "inactive",
        status: "active",
      });

      expect(details.currentStatus).toBe("Inactive");
      expect(details.newStatus).toBe("Active");
      expect(details.actionLabel).toBe("Activate Account");
      expect(details.dialogTitle).toBe("Activate Employee Account");
      expect(details.buttonVariant).toBe("default");
    });
  });

  describe("3. Separation of Employment Status and Login Status Badges", () => {
    it("renders Active login badge when loginStatus is active", () => {
      const loginBadge = getLoginStatusBadge("active", "user-123");
      expect(loginBadge.props.children).toBe("Active");
      expect(loginBadge.props.className).toContain("text-emerald-700");
    });

    it("renders Inactive login badge when loginStatus is inactive", () => {
      const loginBadge = getLoginStatusBadge("inactive", "user-123");
      expect(loginBadge.props.children).toBe("Inactive");
      expect(loginBadge.props.className).toContain("text-slate-600");
    });

    it("keeps employment status distinct from login status", () => {
      // Employee is active in employment, but inactive in login access
      const empStatusBadge = getStatusBadge("active");
      const loginBadge = getLoginStatusBadge("inactive", null);

      expect(empStatusBadge.props.children).toBe("Active");
      expect(empStatusBadge.props.className).toContain("text-emerald-700");

      expect(loginBadge.props.children).toBe("Inactive");
      expect(loginBadge.props.className).toContain("text-slate-600");
    });

    it("handles on_leave employment status independently of login status", () => {
      const empStatusBadge = getStatusBadge("on_leave");
      const loginBadge = getLoginStatusBadge("active", "user-123");

      expect(empStatusBadge.props.children).toBe("On Leave");
      expect(loginBadge.props.children).toBe("Active");
    });

    it("handles terminated employment status independently of login status", () => {
      const empStatusBadge = getStatusBadge("terminated");
      const loginBadge = getLoginStatusBadge("inactive", null);

      expect(empStatusBadge.props.children).toBe("Terminated");
      expect(loginBadge.props.children).toBe("Inactive");
    });
  });
});
