import { getTenantDb } from "../context/tenant-context";
import { AuditService } from "./audit.service";

export interface CreateDocumentTypeDto {
  name: string;
  description?: string | null;
  isRequired?: boolean;
  code?: string;
}

export interface UpdateDocumentTypeDto {
  name?: string;
  description?: string | null;
  isRequired?: boolean;
  isActive?: boolean;
}

export interface ListDocumentTypesOptions {
  search?: string;
  filter?: "all" | "required" | "optional";
  isActive?: boolean;
}

const DEFAULT_STANDARD_DOCUMENT_TYPES = [
  {
    name: "Aadhaar Card / National Identity Proof",
    code: "AADHAAR_NATIONAL_ID",
    description: "Government-issued identity cards such as Aadhaar, National ID, or SSN",
    isRequired: true,
  },
  {
    name: "PAN Card / Tax Identification",
    code: "PAN_TAX_ID",
    description: "Tax identification certificate such as PAN card, W-9, or national tax ID",
    isRequired: true,
  },
  {
    name: "Passport",
    code: "PASSPORT",
    description: "Official international travel passport",
    isRequired: false,
  },
  {
    name: "Driving Licence",
    code: "DRIVING_LICENCE",
    description: "Motor vehicle operator driving licence",
    isRequired: false,
  },
  {
    name: "Voter ID / Other Identity Proof",
    code: "VOTER_ID_OTHER_PROOF",
    description: "Voter ID, citizenship card, or municipal identity proof",
    isRequired: false,
  },
  {
    name: "Address Proof",
    code: "ADDRESS_PROOF",
    description: "Utility bills, lease agreement, or permanent residency proof",
    isRequired: false,
  },
  {
    name: "Previous Company Experience Letter",
    code: "PREV_EXPERIENCE_LETTER",
    description: "Formal service or work experience letter from prior employer",
    isRequired: false,
  },
  {
    name: "Relieving Letter",
    code: "RELIEVING_LETTER",
    description: "Official relieving letter confirming release from previous company",
    isRequired: false,
  },
  {
    name: "Previous Employment Contract",
    code: "PREV_EMPLOYMENT_CONTRACT",
    description: "Signed contract or offer terms from past employment",
    isRequired: false,
  },
  {
    name: "Educational Certificate",
    code: "EDUCATIONAL_CERTIFICATE",
    description: "Degree, diploma, matriculation, or university graduation certificates",
    isRequired: true,
  },
  {
    name: "Professional Certification",
    code: "PROFESSIONAL_CERTIFICATION",
    description: "Industry accreditations, technical certifications, or licenses",
    isRequired: false,
  },
  {
    name: "Current Employment Contract",
    code: "CURRENT_EMPLOYMENT_CONTRACT",
    description: "Master employment agreement, executive service agreement, or appointment contract",
    isRequired: true,
  },
  {
    name: "Appointment Letter",
    code: "APPOINTMENT_LETTER",
    description: "Formal job offer acceptance and appointment notification",
    isRequired: false,
  },
  {
    name: "Salary Slip",
    code: "SALARY_SLIP",
    description: "Prior payslips or proof of previous compensation",
    isRequired: false,
  },
  {
    name: "Bank Proof / Cancelled Cheque",
    code: "BANK_PROOF_CHEQUE",
    description: "Cancelled bank cheque, account passbook, or bank statement for payroll disbursement",
    isRequired: true,
  },
  {
    name: "PF / UAN / ESIC Documents",
    code: "PF_UAN_ESIC",
    description: "Provident fund passbook, UAN registration, or ESIC health insurance card",
    isRequired: false,
  },
  {
    name: "Medical Certificate",
    code: "MEDICAL_CERTIFICATE",
    description: "Pre-employment medical fitness certificate or health check report",
    isRequired: false,
  },
  {
    name: "Other Employee Document",
    code: "OTHER_EMPLOYEE_DOC",
    description: "Any other miscellaneous employee-specific documentation",
    isRequired: false,
  },
];

export class DocumentTypeService {
  /**
   * Seeds default standard document types if the tenant currently has zero.
   */
  public static async ensureDefaultDocumentTypes(tenantId: string): Promise<number> {
    const db = getTenantDb();
    const existingCount = await db.documentType.count({
      where: { tenantId },
    });

    if (existingCount > 0) {
      return existingCount;
    }

    const created = await db.$transaction(async (tx: any) => {
      let count = 0;
      for (const item of DEFAULT_STANDARD_DOCUMENT_TYPES) {
        await tx.documentType.create({
          data: {
            tenantId,
            name: item.name,
            code: item.code,
            description: item.description,
            isRequired: item.isRequired,
            isActive: true,
          },
        });
        count++;
      }
      return count;
    });

    return created;
  }

  /**
   * List document types for a tenant with search, filtering, and usage counts.
   */
  public static async listDocumentTypes(
    tenantId: string,
    options: ListDocumentTypesOptions = {}
  ) {
    const db = getTenantDb();
    await this.ensureDefaultDocumentTypes(tenantId);

    const { search, filter = "all", isActive } = options;

    const where: any = {
      tenantId,
    };

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    if (filter === "required") {
      where.isRequired = true;
    } else if (filter === "optional") {
      where.isRequired = false;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, totalCount, requiredCount, optionalCount] = await Promise.all([
      db.documentType.findMany({
        where,
        orderBy: [{ isRequired: "desc" }, { createdAt: "asc" }],
      }),
      db.documentType.count({ where: { tenantId, ...(typeof isActive === "boolean" ? { isActive } : {}) } }),
      db.documentType.count({ where: { tenantId, isRequired: true, ...(typeof isActive === "boolean" ? { isActive } : {}) } }),
      db.documentType.count({ where: { tenantId, isRequired: false, ...(typeof isActive === "boolean" ? { isActive } : {}) } }),
    ]);

    // Query usage references
    const enriched = await Promise.all(
      items.map(async (docType: any) => {
        const [companyDocCount, onboardingTaskCount] = await Promise.all([
          db.companyDocument.count({
            where: {
              tenantId,
              OR: [
                { category: docType.name },
                { title: { contains: docType.name, mode: "insensitive" } },
              ],
            },
          }),
          db.candidateOnboardingTask.count({
            where: {
              tenantId,
              title: { contains: docType.name, mode: "insensitive" },
            },
          }),
        ]);

        return {
          ...docType,
          _count: {
            companyDocuments: companyDocCount,
            onboardingTasks: onboardingTaskCount,
            totalUsage: companyDocCount + onboardingTaskCount,
          },
        };
      })
    );

    return {
      items: enriched,
      counts: {
        total: totalCount,
        required: requiredCount,
        optional: optionalCount,
      },
    };
  }

  /**
   * Create a new document type.
   */
  public static async createDocumentType(
    tenantId: string,
    actorId: string,
    data: CreateDocumentTypeDto
  ) {
    const db = getTenantDb();
    const name = data.name ? data.name.trim() : "";
    if (!name || name.length < 2) {
      throw new Error("Document Type Name must be at least 2 characters long.");
    }

    // Check duplicate name
    const existingName = await db.documentType.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (existingName) {
      const err: any = new Error(`A document type named "${name}" already exists.`);
      err.statusCode = 409;
      throw err;
    }

    let code = (data.code || name)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50);

    if (!code) {
      code = `DOC_${Date.now()}`;
    }

    // Ensure unique code
    let uniqueCode = code;
    let suffix = 1;
    while (await db.documentType.findFirst({ where: { tenantId, code: uniqueCode } })) {
      uniqueCode = `${code.slice(0, 45)}_${suffix++}`;
    }

    const created = await db.documentType.create({
      data: {
        tenantId,
        name,
        code: uniqueCode,
        description: data.description?.trim() || null,
        isRequired: Boolean(data.isRequired),
        isActive: true,
      },
    });

    await AuditService.logMutation({
      tenantId,
      actorId,
      action: "DOCUMENT_TYPE_CREATE",
      entityType: "DocumentType",
      entityId: created.id,
      newState: created,
    }).catch(() => {});

    return created;
  }

  /**
   * Update an existing document type.
   */
  public static async updateDocumentType(
    tenantId: string,
    actorId: string,
    id: string,
    data: UpdateDocumentTypeDto
  ) {
    const db = getTenantDb();
    const existing = await db.documentType.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      const err: any = new Error("Document type not found.");
      err.statusCode = 404;
      throw err;
    }

    let updateName = existing.name;
    if (data.name !== undefined) {
      updateName = data.name.trim();
      if (!updateName || updateName.length < 2) {
        throw new Error("Document Type Name must be at least 2 characters long.");
      }

      if (updateName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await db.documentType.findFirst({
          where: {
            tenantId,
            id: { not: id },
            name: { equals: updateName, mode: "insensitive" },
          },
        });
        if (duplicate) {
          const err: any = new Error(`A document type named "${updateName}" already exists.`);
          err.statusCode = 409;
          throw err;
        }
      }
    }

    const updated = await db.documentType.update({
      where: { id },
      data: {
        name: updateName,
        description: data.description !== undefined ? data.description?.trim() || null : existing.description,
        isRequired: data.isRequired !== undefined ? Boolean(data.isRequired) : existing.isRequired,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
      },
    });

    await AuditService.logMutation({
      tenantId,
      actorId,
      action: "DOCUMENT_TYPE_UPDATE",
      entityType: "DocumentType",
      entityId: updated.id,
      oldState: existing,
      newState: updated,
    }).catch(() => {});

    return updated;
  }

  /**
   * Delete or safely deactivate a document type with reference check.
   */
  public static async deleteDocumentType(
    tenantId: string,
    actorId: string,
    id: string,
    forceDeactivate: boolean = false
  ) {
    const db = getTenantDb();
    const existing = await db.documentType.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      const err: any = new Error("Document type not found.");
      err.statusCode = 404;
      throw err;
    }

    // Reference checks
    const [companyDocCount, onboardingTaskCount, checkItemCount] = await Promise.all([
      db.companyDocument.count({
        where: {
          tenantId,
          OR: [
            { category: existing.name },
            { title: { contains: existing.name, mode: "insensitive" } },
          ],
        },
      }),
      db.candidateOnboardingTask.count({
        where: {
          tenantId,
          title: { contains: existing.name, mode: "insensitive" },
        },
      }),
      db.onboardingCheckItem.count({
        where: {
          tenantId,
          title: { contains: existing.name, mode: "insensitive" },
        },
      }),
    ]);

    const totalUsage = companyDocCount + onboardingTaskCount + checkItemCount;

    if (totalUsage > 0) {
      if (forceDeactivate) {
        const deactivated = await db.documentType.update({
          where: { id },
          data: { isActive: false },
        });

        await AuditService.logMutation({
          tenantId,
          actorId,
          action: "DOCUMENT_TYPE_DEACTIVATE",
          entityType: "DocumentType",
          entityId: id,
          oldState: existing,
          newState: deactivated,
        }).catch(() => {});

        return {
          deactivated: true,
          message: `Document type is referenced by ${companyDocCount} employee document(s) and ${onboardingTaskCount + checkItemCount} onboarding task(s). It has been deactivated instead of deleted to preserve compliance records.`,
          documentType: deactivated,
        };
      }

      const err: any = new Error(
        `Document type "${existing.name}" is in use by ${companyDocCount} employee document(s) and ${onboardingTaskCount + checkItemCount} onboarding requirement(s). Permanent deletion is blocked to protect historical audit trails.`
      );
      err.statusCode = 409;
      err.totalUsage = totalUsage;
      err.canDeactivate = true;
      throw err;
    }

    // Unreferenced - safe to delete
    await db.documentType.delete({
      where: { id },
    });

    await AuditService.logMutation({
      tenantId,
      actorId,
      action: "DOCUMENT_TYPE_DELETE",
      entityType: "DocumentType",
      entityId: id,
      oldState: existing,
    }).catch(() => {});

    return {
      success: true,
      deleted: true,
      message: `Document type "${existing.name}" was successfully deleted.`,
    };
  }
}

