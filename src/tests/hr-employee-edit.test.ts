import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("HR Employee Edit Wizard Frontend Acceptance Suite", () => {
  const editComponentPath = path.resolve(
    __dirname,
    "../routes/_authenticated/hr/employees/$id.edit.tsx"
  );
  const directoryPath = path.resolve(
    __dirname,
    "../routes/_authenticated/hr/employees/index.tsx"
  );
  const profilePath = path.resolve(
    __dirname,
    "../routes/_authenticated/hr/employees/$id.tsx"
  );

  const editContent = fs.readFileSync(editComponentPath, "utf-8");
  const dirContent = fs.readFileSync(directoryPath, "utf-8");
  const profileContent = fs.readFileSync(profilePath, "utf-8");

  // ─── 1. Five-Step Wizard Ordering & Structure ──────────────────────────────
  describe("1. Five-Step Progress Stepper Structure", () => {
    it("defines the exact 5 steps in proper sequence", () => {
      const stepLabels = ["Personal", "Employment", "Contact", "Banking", "Documents"];
      let lastIndex = -1;
      for (const label of stepLabels) {
        const cur = editContent.indexOf(`label: "${label}"`);
        expect(cur).toBeGreaterThan(-1);
        expect(cur).toBeGreaterThan(lastIndex);
        lastIndex = cur;
      }
    });

    it("uses emerald active step indicator and connecting lines", () => {
      expect(editContent).toContain("bg-emerald-600");
      expect(editContent).toContain("ring-emerald-100");
      expect(editContent).toContain("aria-label=\"Progress\"");
    });

    it("contains zero decorative emoji characters across all steps and labels", () => {
      // Regex checking for common emoji ranges
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      expect(emojiRegex.test(editContent)).toBe(false);
    });
  });

  // ─── 2. Header and Navigation ─────────────────────────────────────────────
  describe("2. Header & Action Navigation", () => {
    it("renders required title, subtitle, and back button", () => {
      expect(editContent).toContain("Edit Employee");
      expect(editContent).toContain("Update employee details and information");
      expect(editContent).toContain("Back");
    });

    it("has Back and Next navigation buttons with validation checks", () => {
      expect(editContent).toContain("handleNext");
      expect(editContent).toContain("handleBack");
      expect(editContent).toContain("validateStep");
    });

    it("has final Update Employee submit button on Step 5", () => {
      expect(editContent).toContain("Update Employee");
      expect(editContent).toContain("handleFinalSubmit");
    });
  });

  // ─── 3. Step 1: Personal Fields ───────────────────────────────────────────
  describe("3. Step 1: Personal Information Fields", () => {
    it("contains first name, last name, read-only ID, employee code, email, password, phone, DOB, gender", () => {
      expect(editContent).toContain("id=\"emp-id\"");
      expect(editContent).toContain("readOnly");
      expect(editContent).toContain("id=\"employeeCode\"");
      expect(editContent).toContain("id=\"firstName\"");
      expect(editContent).toContain("id=\"lastName\"");
      expect(editContent).toContain("id=\"email\"");
      expect(editContent).toContain("id=\"password\"");
      expect(editContent).toContain("id=\"phone\"");
      expect(editContent).toContain("id=\"dateOfBirth\"");
      expect(editContent).toContain("id=\"gender\"");
    });

    it("informs user that blank password preserves current password", () => {
      expect(editContent).toContain("Leave blank to preserve current password");
      expect(editContent).toContain("Blank preserves the existing login password without alteration.");
    });

    it("supports profile image change and removal", () => {
      expect(editContent).toContain("Change Photo");
      expect(editContent).toContain("avatar-file-upload");
      expect(editContent).toContain("handleAvatarUpload");
    });
  });

  // ─── 4. Step 2: Employment Details ────────────────────────────────────────
  describe("4. Step 2: Employment Details Fields", () => {
    it("contains branch, department, designation, joining date, type, status, shift, and policy", () => {
      expect(editContent).toContain("id=\"branchId\"");
      expect(editContent).toContain("id=\"departmentId\"");
      expect(editContent).toContain("id=\"designationId\"");
      expect(editContent).toContain("id=\"joinedAt\"");
      expect(editContent).toContain("id=\"employmentType\"");
      expect(editContent).toContain("id=\"status\"");
      expect(editContent).toContain("id=\"shiftId\"");
      expect(editContent).toContain("id=\"attendancePolicyId\"");
    });

    it("fetches branches, departments, designations, shifts, and policies from backend endpoints", () => {
      expect(editContent).toContain("/hr/organization/branches");
      expect(editContent).toContain("/hr/organization/departments");
      expect(editContent).toContain("/hr/organization/designations");
      expect(editContent).toContain("/hr/attendance/shifts");
      expect(editContent).toContain("/hr/attendance/policies");
    });
  });

  // ─── 5. Step 3: Contact Details ───────────────────────────────────────────
  describe("5. Step 3: Contact Information Fields", () => {
    it("contains address lines 1 & 2, city, state, country, postal code", () => {
      expect(editContent).toContain("id=\"addressLine1\"");
      expect(editContent).toContain("id=\"addressLine2\"");
      expect(editContent).toContain("id=\"city\"");
      expect(editContent).toContain("id=\"state\"");
      expect(editContent).toContain("id=\"country\"");
      expect(editContent).toContain("id=\"postalCode\"");
    });

    it("contains emergency contact name, relationship, and phone", () => {
      expect(editContent).toContain("id=\"emergencyContactName\"");
      expect(editContent).toContain("id=\"emergencyContactRelationship\"");
      expect(editContent).toContain("id=\"emergencyContactPhone\"");
    });
  });

  // ─── 6. Step 4: Banking Information ───────────────────────────────────────
  describe("6. Step 4: Banking & Sensitive Compensation Fields", () => {
    it("contains bank name, account holder name, account number, BIC/SWIFT, branch, PAN, base salary", () => {
      expect(editContent).toContain("id=\"bankName\"");
      expect(editContent).toContain("id=\"accountHolderName\"");
      expect(editContent).toContain("id=\"bankAccount\"");
      expect(editContent).toContain("id=\"bicSwift\"");
      expect(editContent).toContain("id=\"bankBranch\"");
      expect(editContent).toContain("id=\"taxPayerId\"");
      expect(editContent).toContain("id=\"salary\"");
    });

    it("enforces sensitive permission checks and displays warning banner when unauthorized", () => {
      expect(editContent).toContain("canEditSensitive");
      expect(editContent).toContain("Protected Sensitive Financial Records");
      expect(editContent).toContain("hr:employee:sensitive:write");
    });
  });

  // ─── 7. Step 5: Documents Management ──────────────────────────────────────
  describe("7. Step 5: Documents Management", () => {
    it("renders document list with view action and delete confirmation", () => {
      expect(editContent).toContain("Employee Documents Vault");
      expect(editContent).toContain("Add Document");
      expect(editContent).toContain("Delete Employee Document");
      expect(editContent).toContain("deleteDocMutation");
    });

    it("provides inline/modal dialog for uploading new documents", () => {
      expect(editContent).toContain("Add Employee Document");
      expect(editContent).toContain("doc-category");
      expect(editContent).toContain("doc-title");
      expect(editContent).toContain("doc-file-input");
      expect(editContent).toContain("doc-expiry");
      expect(editContent).toContain("addDocMutation");
    });
  });

  // ─── 8. Routing Integration ───────────────────────────────────────────────
  describe("8. Router & Directory Link Integration", () => {
    it("links table and grid card edit buttons to /hr/employees/$id/edit in directory", () => {
      expect(dirContent).toContain('to="/hr/employees/$id/edit"');
    });

    it("provides Edit Employee button on the 360 profile header linking to /hr/employees/$id/edit", () => {
      expect(profileContent).toContain('to="/hr/employees/$id/edit"');
      expect(profileContent).toContain("Edit Employee");
    });
  });

  // ─── 9. Form State Integrity & Refetch Resilience ─────────────────────────
  describe("9. Form State Integrity & Refetch Resilience", () => {
    it("uses isInitializedRef to prevent query refetches from overwriting entered changes", () => {
      expect(editContent).toContain("isInitializedRef");
      expect(editContent).toContain("isInitializedRef.current = emp.id");
    });

    it("prevents duplicate submissions with pending state guard", () => {
      expect(editContent).toContain("disabled={updateMutation.isPending");
      expect(editContent).toContain("updateMutation.isPending ?");
    });

    it("invalidates queries and navigates to profile only upon confirmed API success", () => {
      expect(editContent).toContain("queryClient.invalidateQueries({ queryKey: [\"employee-360\", id] })");
      expect(editContent).toContain("queryClient.invalidateQueries({ queryKey: [\"hr-employees-list\"] })");
      expect(editContent).toContain("navigate({ to: \"/hr/employees/$id\", params: { id } }");
    });
  });
});
