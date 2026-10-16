import { describe, it, expect } from "vitest";
import { COUNTRIES } from "@/lib/address/countries";
import { INDIA_STATES, getStatesByCountry } from "@/lib/address/india-states";
import {
  TAMIL_NADU_DISTRICTS,
  getDistrictsByState,
  isDistrictInState,
} from "@/lib/address/india-districts";
import { lookupPincode } from "@/lib/address/address-lookup";
import {
  EMPLOYEE_DOCUMENT_CATEGORIES,
  getDocumentCategorySlug,
} from "@/lib/constants/employee-documents";

describe("Employee Address Intelligence & Tamil Nadu District Verification", () => {
  it("includes all 38 official districts of Tamil Nadu", () => {
    expect(TAMIL_NADU_DISTRICTS.length).toBe(38);
    const tnDistrictNames = TAMIL_NADU_DISTRICTS.map((d) => d.name);

    expect(tnDistrictNames).toContain("Chennai");
    expect(tnDistrictNames).toContain("Coimbatore");
    expect(tnDistrictNames).toContain("Madurai");
    expect(tnDistrictNames).toContain("Tiruchirappalli");
    expect(tnDistrictNames).toContain("Salem");
    expect(tnDistrictNames).toContain("Tirunelveli");
    expect(tnDistrictNames).toContain("Chengalpattu");
    expect(tnDistrictNames).toContain("Tenkasi");
    expect(tnDistrictNames).toContain("Mayiladuthurai");
    expect(tnDistrictNames).toContain("Ranipet");
    expect(tnDistrictNames).toContain("Tirupathur");
    expect(tnDistrictNames).toContain("Kallakurichi");
  });

  it("restricts districts to Tamil Nadu when Tamil Nadu is selected", () => {
    const districts = getDistrictsByState("Tamil Nadu");
    expect(districts.length).toBe(38);
    expect(districts.every((d) => d.stateCode === "TN")).toBe(true);

    // Verify Bangalore is NOT in Tamil Nadu
    const hasBangaloreInTN = districts.some((d) => d.name === "Bangalore Urban");
    expect(hasBangaloreInTN).toBe(false);
  });

  it("correctly validates whether a district belongs to a state", () => {
    expect(isDistrictInState("Chennai", "Tamil Nadu")).toBe(true);
    expect(isDistrictInState("Coimbatore", "Tamil Nadu")).toBe(true);
    expect(isDistrictInState("Bengaluru Urban", "Tamil Nadu")).toBe(false);
    expect(isDistrictInState("Bengaluru Urban", "Karnataka")).toBe(true);
  });

  it("returns India states for Country = India", () => {
    const states = getStatesByCountry("India");
    expect(states.length).toBeGreaterThanOrEqual(36);
    expect(states.some((s) => s.name === "Tamil Nadu")).toBe(true);
    expect(states.some((s) => s.name === "Karnataka")).toBe(true);
    expect(states.some((s) => s.name === "Maharashtra")).toBe(true);
  });

  it("contains searchable country list with India included", () => {
    const india = COUNTRIES.find((c) => c.name === "India" || c.code === "IN");
    expect(india).toBeDefined();
    expect(india?.name).toBe("India");
  });

  it("accurately prefills City, District, and State for Chennai PIN code 600001", async () => {
    const result = await lookupPincode("600001");
    expect(result).not.toBeNull();
    expect(result?.city).toBe("Chennai");
    expect(result?.district).toBe("Chennai");
    expect(result?.state).toBe("Tamil Nadu");
    expect(result?.country).toBe("India");
  });

  it("accurately prefills City, District, and State for Bangalore PIN code 560001", async () => {
    const result = await lookupPincode("560001");
    expect(result).not.toBeNull();
    expect(result?.city).toBe("Bengaluru");
    expect(result?.state).toBe("Karnataka");
  });

  it("handles non-existent or invalid PIN code gracefully without crashing", async () => {
    const result = await lookupPincode("000000");
    expect(result).toBeNull();
  });
});

describe("Employee Document Categories & Vault Organization", () => {
  it("contains all 18 standard employee-specific categories without Company Policy", () => {
    expect(EMPLOYEE_DOCUMENT_CATEGORIES.length).toBe(18);
    const names = EMPLOYEE_DOCUMENT_CATEGORIES.map((c) => c.name);

    // Verify critical categories exist
    expect(names).toContain("Aadhaar Card / National Identity Proof");
    expect(names).toContain("PAN Card / Tax Identification");
    expect(names).toContain("Passport");
    expect(names).toContain("Driving Licence");
    expect(names).toContain("Voter ID / Other Identity Proof");
    expect(names).toContain("Address Proof");
    expect(names).toContain("Previous Company Experience Letter");
    expect(names).toContain("Relieving Letter");
    expect(names).toContain("Previous Employment Contract");
    expect(names).toContain("Educational Certificate");
    expect(names).toContain("Professional Certification");
    expect(names).toContain("Current Employment Contract");
    expect(names).toContain("Appointment Letter");
    expect(names).toContain("Salary Slip");
    expect(names).toContain("Bank Proof / Cancelled Cheque");
    expect(names).toContain("PF / UAN / ESIC Documents");
    expect(names).toContain("Medical Certificate");
    expect(names).toContain("Other Employee Document");

    // Company Policy MUST NOT be in employee document categories
    expect(names).not.toContain("Company Policy");
  });

  it("generates correct logical media folder slugs for document categories", () => {
    expect(getDocumentCategorySlug("Aadhaar Card / National Identity Proof")).toBe("Identity");
    expect(getDocumentCategorySlug("PAN Card / Tax Identification")).toBe("Tax");
    expect(getDocumentCategorySlug("Passport")).toBe("Passport");
    expect(getDocumentCategorySlug("Previous Company Experience Letter")).toBe("Previous-Employment");
    expect(getDocumentCategorySlug("Educational Certificate")).toBe("Education");
    expect(getDocumentCategorySlug("Salary Slip")).toBe("Compensation");
  });
});
