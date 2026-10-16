import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("HR Employee 360 Consolidated Profile Frontend Suite", () => {
  const profileComponentPath = path.resolve(
    __dirname,
    "../routes/_authenticated/hr/employees/$id.tsx"
  );
  const componentContent = fs.readFileSync(profileComponentPath, "utf-8");

  // ─── 1. Six-Tab Layout and Exact Tab Ordering ─────────────────────────────
  describe("1. Tab Configuration & Order", () => {
    it("defines the required 6 tabs in exact sequence", () => {
      // Must contain all 6 tabs in exact order
      const tabTriggers = [
        'value="basic-info"',
        'value="employment"',
        'value="contact"',
        'value="banking"',
        'value="certifications"',
        'value="documents"',
      ];

      let lastIndex = -1;
      for (const tab of tabTriggers) {
        const currentIndex = componentContent.indexOf(tab);
        expect(currentIndex).toBeGreaterThan(-1);
        expect(currentIndex).toBeGreaterThan(lastIndex);
        lastIndex = currentIndex;
      }
    });

    it("includes human-readable labels for all 6 tabs", () => {
      expect(componentContent).toContain("Basic Info");
      expect(componentContent).toContain("Employment");
      expect(componentContent).toContain("Contact");
      expect(componentContent).toContain("Banking");
      expect(componentContent).toContain("Certifications");
      expect(componentContent).toContain("Documents");
    });
  });

  // ─── 2. Header and Two-Column Architecture ────────────────────────────────
  describe("2. Header & Two-Column Architecture", () => {
    it("renders compact header with BreadcrumbNav, title, and Back to Employees navigation", () => {
      expect(componentContent).toContain("BreadcrumbNav");
      expect(componentContent).toContain('label: "Dashboard"');
      expect(componentContent).toContain('label: "Employees"');
      expect(componentContent).toContain("Back to Employees");
      expect(componentContent).toContain("View detailed information and activity for employee.");
    });

    it("uses a responsive two-column grid (summary card on left, tab workspace on right)", () => {
      expect(componentContent).toContain("lg:grid-cols-12");
      expect(componentContent).toContain("lg:col-span-4 xl:col-span-3"); // Left summary card
      expect(componentContent).toContain("lg:col-span-8 xl:col-span-9"); // Right tab workspace
    });

    it("displays employee avatar with neutral fallback initials", () => {
      expect(componentContent).toContain("AvatarImage");
      expect(componentContent).toContain("AvatarFallback");
      expect(componentContent).toContain("emp.avatarUrl");
    });
  });

  // ─── 3. Zero Emoji Icons & Pure Lucide Compliance ─────────────────────────
  describe("3. Icon Library & Zero Emoji Enforcement", () => {
    it("imports and uses stroke-based icons from lucide-react exclusively", () => {
      expect(componentContent).toContain('from "lucide-react"');
      expect(componentContent).not.toContain("@heroicons");
      expect(componentContent).not.toContain("react-icons");
    });

    it("contains zero emoji characters in UI templates or text", () => {
      // Regex detecting Unicode emoji ranges
      const emojiRegex =
        /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

      // Filter out standard punctuation or symbols that are non-emoji
      const matches = componentContent.match(emojiRegex) || [];
      // Any remaining match should be verified
      const realEmojis = matches.filter(
        (m) => !["©", "®", "™", "—", "•", "–", "₹"].includes(m)
      );
      expect(realEmojis).toEqual([]);
    });
  });

  // ─── 4. Real Data Binding & Neutral Fallbacks ─────────────────────────────
  describe("4. Real Data Binding & Missing Data Fallbacks", () => {
    it("uses neutral em dash for absent optional data in DetailField", () => {
      expect(componentContent).toContain('const displayVal = value !== null && value !== undefined && value !== "" ? String(value) : "—"');
    });

    it("does not use hardcoded sample employee identities or names in production code", () => {
      expect(componentContent).not.toContain('"John Doe"');
      expect(componentContent).not.toContain('"Jane Smith"');
      expect(componentContent).not.toContain('"EMP-001"');
      expect(componentContent).not.toContain('"test@example.com"');
    });

    it("reads employee details from real API query endpoint", () => {
      expect(componentContent).toContain("api.get(`/hr/employees/${id}`)");
    });
  });

  // ─── 5. Document Actions & Certifications Vault ───────────────────────────
  describe("5. Document & Certification Operations", () => {
    it("implements real verify/approve document action with endpoint call", () => {
      expect(componentContent).toContain("handleVerifyDocument");
      expect(componentContent).toContain("api.put(`/documents/${docId}/verify`)");
    });

    it("implements document delete confirmation and DELETE API call", () => {
      expect(componentContent).toContain("ConfirmationDialog");
      expect(componentContent).toContain("handleDeleteDocument");
      expect(componentContent).toContain("api.delete(`/documents/${docToDelete.id}`)");
    });

    it("provides preview dialogs for generated letters and uploaded documents", () => {
      expect(componentContent).toContain("setSelectedLetter");
      expect(componentContent).toContain("setSelectedDoc");
      expect(componentContent).toContain("handlePrintLetter");
    });

    it("provides clean empty states when no documents or certificates exist", () => {
      expect(componentContent).toContain("No Generated Letters on File");
      expect(componentContent).toContain("No Uploaded Documents Found");
    });
  });

  // ─── 6. Field-Level Security Notice in Banking Tab ────────────────────────
  describe("6. Banking Tab Security Notice", () => {
    it("highlights Field-Level Security (FLS) protection for statutory credentials", () => {
      expect(componentContent).toContain("FLS Protected");
      expect(componentContent).toContain("Field-Level Security (FLS) is actively enforced");
      expect(componentContent).toContain("Restricted / Masked");
    });
  });

  // ─── 7. Certifications & Corporate Awards Clean Architecture ─────────────
  describe("7. Certifications & Corporate Awards Clean Architecture", () => {
    it("renders Certifications & Official Letters heading without decorative leading icon", () => {
      expect(componentContent).toMatch(/<CardTitle[^>]*>\s*Certifications & Official Letters\s*<\/CardTitle>/);
    });

    it("renders dynamic Corporate Awards count and empty state instead of hardcoded (3)", () => {
      expect(componentContent).toContain("Corporate Awards & Recognitions ({awards.length})");
      expect(componentContent).not.toContain("CORPORATE AWARDS & RECOGNITIONS (3)");
      expect(componentContent).not.toContain("Corporate Awards & Recognitions (3)");
      expect(componentContent).toContain("No Corporate Awards Conferred");
    });

    it("renders dynamic Employer Generated Letters count", () => {
      expect(componentContent).toContain("Employer Generated Letters & Certificates ({generatedLetters.length})");
    });

    it("binds residential coordinates and emergency contacts to real employee values", () => {
      expect(componentContent).toContain("value={emp.addressLine1}");
      expect(componentContent).toContain("value={emp.addressLine2}");
      expect(componentContent).toContain("value={emp.city}");
      expect(componentContent).toContain("value={emp.postalCode}");
      expect(componentContent).toContain("value={emp.emergencyContactName}");
      expect(componentContent).toContain("value={emp.emergencyContactRelationship}");
      expect(componentContent).toContain("value={emp.emergencyContactPhone}");
    });
  });
});
