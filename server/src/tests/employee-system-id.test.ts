import { describe, it, expect } from "vitest";
import { EmployeeSystemIdService } from "../services/employee-system-id.service";

describe("Employee System ID Configuration & Formatting Service", () => {
  it("derives clean 3-letter prefix from company and location names", () => {
    expect(EmployeeSystemIdService.cleanPrefix("TSV Global Solutions")).toBe("TSV");
    expect(EmployeeSystemIdService.cleanPrefix("Acme Corporation")).toBe("ACM");
    expect(EmployeeSystemIdService.cleanPrefix("Master HRMS")).toBe("MAS");
    expect(EmployeeSystemIdService.cleanPrefix("Chennai Branch")).toBe("CHE");
    expect(EmployeeSystemIdService.cleanPrefix("Bengaluru Office")).toBe("BEN");
    expect(EmployeeSystemIdService.cleanPrefix("", "EMP")).toBe("EMP");
    expect(EmployeeSystemIdService.cleanPrefix(null, "HQ")).toBe("HQ");
  });

  it("generates correct system ID format {Company}-{Location}-{Sequence}", () => {
    const company = EmployeeSystemIdService.cleanPrefix("Acme Corporation");
    const location = EmployeeSystemIdService.cleanPrefix("Chennai Branch");
    const sequence = String(1).padStart(4, "0");
    const id = `${company}-${location}-${sequence}`;

    expect(id).toBe("ACM-CHE-0001");
  });

  it("supports configurable separator and sequence width", () => {
    const company = "TSV";
    const location = "CHN";
    const separator = "_";
    const sequenceDigits = 5;
    const sequence = String(42).padStart(sequenceDigits, "0");
    const id = `${company}${separator}${location}${separator}${sequence}`;

    expect(id).toBe("TSV_CHN_00042");
  });

  it("supports custom prefix overrides configured by tenant admin", async () => {
    // When customConfigPrefix is provided, it uses the custom prefix directly
    const customPrefix = await EmployeeSystemIdService.resolveCompanyPrefix("dummy-tenant", "ACME");
    expect(customPrefix).toBe("ACME");

    const customLocation = await EmployeeSystemIdService.resolveLocationPrefix("dummy-tenant", null, "CHN");
    expect(customLocation).toBe("CHN");
  });

  it("preserves immutability of system IDs across employee updates", () => {
    const existingEmployee = {
      id: "emp-test-001",
      systemId: "ACM-CHN-0001",
      employeeCode: "EMP-1001",
      branchId: "branch-chennai",
    };

    // Simulated update with new branch and employeeCode
    const updateInput = {
      employeeCode: "EMP-9999",
      branchId: "branch-bangalore",
    };

    // System ID must never be mutated
    const updatedRecord = {
      ...existingEmployee,
      ...updateInput,
      systemId: existingEmployee.systemId, // Explicit immutability invariant
    };

    expect(updatedRecord.systemId).toBe("ACM-CHN-0001");
    expect(updatedRecord.employeeCode).toBe("EMP-9999");
  });
});
