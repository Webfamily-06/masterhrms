import { prisma, rawPrisma } from "../../../prisma";
import { CompanyProfileService } from "../../company-profile/company-profile.service";
import { FormUModel } from "../../../types/statutory-form-models";
import { SAFE_EMPLOYEE_SELECT, SafeEmployee } from "./statutory-builder-common";

const db = rawPrisma || prisma;

export interface StatutoryBuilderInput {
  tenantId: string;
  payrollRunId?: string;
  year?: number;
  month?: number;
  financialYear?: string;
  establishmentId?: string;
  filterDepartmentId?: string;
}

export interface ValidationIssue {
  employeeCode: string;
  employeeName: string;
  field: string;
  severity: "ERROR" | "WARNING";
  message: string;
}

export interface FormUBuildResult {
  model: FormUModel;
  validation: {
    isValid: boolean;
    totalRecords: number;
    errorCount: number;
    warningCount: number;
    issues: ValidationIssue[];
  };
}

export class FormURegisterBuilder {
  static readonly COLUMNS = [
    "Serial Number",
    "Name of the employee",
    "Employee Identification No.",
    "Gender",
    "Father / Spouse Name",
    "Date of Birth",
    "Date of entry into service",
    "Designation",
    "Department",
    "Educational Qualification",
    "Permanent Address",
    "Present Address",
    "Mobile Number",
    "e-mail I.D",
    "Aadhaar No.",
    "PAN Number",
    "UAN",
    "Employee's Provident Fund No.",
    "Employee's State Insurance Corporation No.",
    "Bank A/c Number",
    "Bank Name & Branch",
    "Bank IFSC Code",
    "Date on which completion of 480 days of service",
    "Date on which made permanent",
    "Date of Exit",
    "Reason for Exit",
    "Specimen Signature / Thumb Impression",
  ];

  static async build(input: StatutoryBuilderInput): Promise<FormUBuildResult> {
    const { tenantId, establishmentId, filterDepartmentId } = input;

    if (!tenantId) {
      throw new Error("Tenant ID is required to generate Form U Employee Register.");
    }

    // 1. Resolve Company Identity
    const companyProfile = await CompanyProfileService.getProfile(tenantId);
    let establishment: any = null;
    if (establishmentId) {
      establishment = await db.establishment.findFirst({
        where: { id: establishmentId, tenantId },
      });
    } else {
      establishment = await db.establishment.findFirst({
        where: { tenantId, status: "active" },
      });
    }

    // 2. Fetch Active and Relevant Employees
    const employees = (await db.employee.findMany({
      where: {
        tenantId,
        ...(filterDepartmentId ? { departmentId: filterDepartmentId } : {}),
        ...(establishmentId ? { establishmentId } : {}),
      },
      select: SAFE_EMPLOYEE_SELECT,
      orderBy: [{ employeeCode: "asc" }, { lastName: "asc" }],
    })) as unknown as SafeEmployee[];

    const issues: ValidationIssue[] = [];
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    const rows = employees.map((emp, index) => {
      const fullName = `${emp.firstName} ${emp.lastName || ""}`.trim();
      const code = emp.employeeCode || `EMP-${index + 1}`;
      const exitRecord = emp.employeeExits?.[0];

      // Format Dates
      const dobStr = emp.dateOfBirth
        ? new Date(emp.dateOfBirth).toISOString().split("T")[0].split("-").reverse().join("-")
        : "";
      const doj = emp.joinedAt || emp.dateOfJoining;
      const dojStr = doj
        ? new Date(doj).toISOString().split("T")[0].split("-").reverse().join("-")
        : "";
      const completion480Str = emp.completion480DaysDate
        ? new Date(emp.completion480DaysDate).toISOString().split("T")[0].split("-").reverse().join("-")
        : "";
      const permanentDateStr = emp.permanentEmploymentDate
        ? new Date(emp.permanentEmploymentDate).toISOString().split("T")[0].split("-").reverse().join("-")
        : "";
      const exitDateVal = exitRecord?.lastWorkingDay || exitRecord?.resignationDate;
      const exitDateStr = exitDateVal
        ? new Date(exitDateVal).toISOString().split("T")[0].split("-").reverse().join("-")
        : "";

      // Mask Aadhaar (show only last 4 digits)
      const cleanAadhaar = (emp.aadhaar || "").replace(/\D/g, "");
      const maskedAadhaar = cleanAadhaar.length === 12
        ? `XXXXXXXX${cleanAadhaar.slice(-4)}`
        : (cleanAadhaar ? cleanAadhaar : "—");

      // Validate Mandatory Fields under Rule 16(1)
      if (!emp.firstName) {
        issues.push({
          employeeCode: code,
          employeeName: fullName,
          field: "firstName",
          severity: "ERROR",
          message: "Employee first name is mandatory under Rule 16(1).",
        });
      }
      if (!emp.dateOfBirth) {
        issues.push({
          employeeCode: code,
          employeeName: fullName,
          field: "dateOfBirth",
          severity: "ERROR",
          message: "Date of Birth is mandatory for age & statutory classification.",
        });
      }
      if (!doj) {
        issues.push({
          employeeCode: code,
          employeeName: fullName,
          field: "dateOfJoining",
          severity: "ERROR",
          message: "Date of entry into service is mandatory.",
        });
      }
      if (!emp.pan) {
        issues.push({
          employeeCode: code,
          employeeName: fullName,
          field: "panNumber",
          severity: "WARNING",
          message: "PAN is missing; required for statutory tax withholding.",
        });
      } else {
        const panVal = (emp.pan || "").toUpperCase();
        if (!panRegex.test(panVal)) {
          issues.push({
            employeeCode: code,
            employeeName: fullName,
            field: "panNumber",
            severity: "ERROR",
            message: `Invalid PAN format "${panVal}". Must match standard 10-char alphanumeric pattern.`,
          });
        }
      }
      if (emp.pfEligible && !emp.uan) {
        issues.push({
          employeeCode: code,
          employeeName: fullName,
          field: "uanNumber",
          severity: "ERROR",
          message: "UAN is mandatory for EPF eligible employee under EPFO compliance.",
        });
      }
      if (emp.esiEligible && (!emp.esiNumber)) {
        issues.push({
          employeeCode: code,
          employeeName: fullName,
          field: "esiNumber",
          severity: "WARNING",
          message: "ESIC Insurance number missing for ESI eligible employee.",
        });
      }

      // Address resolution
      const presentAddr = emp.presentAddress || (emp.state ? `${emp.state}, India` : "—");
      const permanentAddr = emp.permanentAddress || presentAddr;

      // Reason for exit
      const exitReason = exitRecord?.reason || (emp.status === "inactive" || emp.status === "terminated" ? "Separated" : "—");

      // Digital Signature Token (traceable source acknowledgment)
      const ackToken = `DIGI-ACK-${code}-${emp.id.slice(0, 8).toUpperCase()}`;

      return {
        slNo: index + 1,
        employeeName: fullName || "—",
        employeeCode: code,
        gender: emp.gender ? (emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1).toLowerCase()) : "—",
        fatherOrSpouseName: emp.fatherOrSpouseName || "—",
        dateOfBirth: dobStr || "—",
        dateOfJoining: dojStr || "—",
        designation: emp.position || "Staff",
        department: emp.department?.name || "General",
        education: (emp as any).education || "—",
        permanentAddress: permanentAddr,
        presentAddress: presentAddr,
        mobileNumber: emp.phone || "—",
        emailId: emp.email || "—",
        aadhaarNumber: maskedAadhaar,
        panNumber: (emp.pan || "—").toUpperCase(),
        uanNumber: emp.uan || "—",
        epfNumber: emp.pfNumber || "—",
        esiNumber: emp.esiNumber || "—",
        bankAccountNumber: emp.bankAccount || "—",
        bankNameAndBranch: [emp.bankName, emp.bankBranch].filter(Boolean).join(" - ") || "—",
        ifscCode: (emp.bankIfsc || "—").toUpperCase(),
        completion480DaysDate: completion480Str || "—",
        permanentEmploymentDate: permanentDateStr || "—",
        dateOfExit: exitDateStr || "—",
        reasonForExit: exitReason,
        specimenSignature: ackToken,
      };
    });

    const errorCount = issues.filter((i) => i.severity === "ERROR").length;
    const warningCount = issues.filter((i) => i.severity === "WARNING").length;

    const estName = establishment?.name || companyProfile.legalName || "Establishment";
    const estAddr = establishment?.address || companyProfile.registeredAddress || "Address on Record";
    const regNo = establishment?.code || companyProfile.cin || establishment?.epfCode || "REG-TN-001";

    const model: FormUModel = {
      formCode: "FORM_U",
      title: "EMPLOYEE REGISTER [Rule 16(1)]",
      establishment: {
        name: estName,
        address: estAddr,
        registrationNumber: regNo,
        employerName: companyProfile.tradeName || companyProfile.legalName || estName,
        period: input.financialYear || "2026-2027",
        totalEmployees: rows.length,
      },
      columns: this.COLUMNS,
      rows,
    };

    return {
      model,
      validation: {
        isValid: errorCount === 0,
        totalRecords: rows.length,
        errorCount,
        warningCount,
        issues,
      },
    };
  }
}

