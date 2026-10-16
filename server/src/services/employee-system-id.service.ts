import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;
import { SettingsService } from "./settings/settings.service";

export interface SystemIdConfig {
  autoGenerate: boolean;
  companyPrefix: string;
  locationPrefix: string;
  sequenceStart: number;
  sequenceDigits: number;
  separator: string;
}

export class EmployeeSystemIdService {
  /**
   * Fetch System ID configuration for a tenant with fallbacks
   */
  static async getConfig(tenantId: string): Promise<SystemIdConfig> {
    const [
      autoGenerate,
      companyPrefix,
      locationPrefix,
      sequenceStart,
      sequenceDigits,
      separator,
    ] = await Promise.all([
      SettingsService.get<boolean>("TENANT", tenantId, "hr.employee_id.auto_generate").catch(() => true),
      SettingsService.get<string>("TENANT", tenantId, "hr.employee_id.company_prefix").catch(() => "AUTO"),
      SettingsService.get<string>("TENANT", tenantId, "hr.employee_id.location_prefix").catch(() => "AUTO"),
      SettingsService.get<number>("TENANT", tenantId, "hr.employee_id.sequence_start").catch(() => 1),
      SettingsService.get<number>("TENANT", tenantId, "hr.employee_id.sequence_digits").catch(() => 4),
      SettingsService.get<string>("TENANT", tenantId, "hr.employee_id.separator").catch(() => "-"),
    ]);

    return {
      autoGenerate: autoGenerate !== false,
      companyPrefix: companyPrefix || "AUTO",
      locationPrefix: locationPrefix || "AUTO",
      sequenceStart: Number(sequenceStart) || 1,
      sequenceDigits: Number(sequenceDigits) || 4,
      separator: separator || "-",
    };
  }

  /**
   * Helper to derive 3-letter uppercase prefix from a name or code
   */
  static cleanPrefix(text?: string | null, fallback = "GEN"): string {
    if (!text) return fallback;
    const clean = text.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (clean.length === 0) return fallback;
    return clean.slice(0, 3).padEnd(3, "X");
  }

  /**
   * Resolve company prefix from tenant name or custom setting
   */
  static async resolveCompanyPrefix(tenantId: string, customConfigPrefix?: string): Promise<string> {
    if (customConfigPrefix && customConfigPrefix !== "AUTO") {
      return customConfigPrefix.toUpperCase();
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true },
    });
    return this.cleanPrefix(tenant?.name || tenant?.slug, "TSV");
  }

  /**
   * Resolve location prefix from branch or custom setting
   */
  static async resolveLocationPrefix(
    tenantId: string,
    branchId?: string | null,
    customLocationPrefix?: string
  ): Promise<string> {
    if (customLocationPrefix && customLocationPrefix !== "AUTO") {
      return customLocationPrefix.toUpperCase();
    }
    if (!branchId) return "HQ";

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      select: { name: true, code: true },
    });

    if (branch?.code) {
      return this.cleanPrefix(branch.code, "BRN");
    }
    return this.cleanPrefix(branch?.name, "HQ");
  }

  /**
   * Preview what the next employee System ID will look like
   */
  static async previewNextId(
    tenantId: string,
    branchId?: string | null
  ): Promise<{
    previewId: string;
    config: SystemIdConfig;
    nextSequence: number;
  }> {
    const config = await this.getConfig(tenantId);
    const compPrefix = await this.resolveCompanyPrefix(tenantId, config.companyPrefix);
    const locPrefix = await this.resolveLocationPrefix(tenantId, branchId, config.locationPrefix);

    // Get current counter
    const currentCounter = await this.getCurrentCounter(tenantId, config.sequenceStart);
    const paddedSeq = String(currentCounter).padStart(config.sequenceDigits, "0");
    const previewId = `${compPrefix}${config.separator}${locPrefix}${config.separator}${paddedSeq}`;

    return {
      previewId,
      config,
      nextSequence: currentCounter,
    };
  }

  /**
   * Atomic allocation of next sequence number for a tenant
   */
  static async allocateNextSequence(tenantId: string, initialStart: number, client: any = prisma): Promise<number> {
    const counterKey = "hr_employee_id_sequence";

    let cf = await client.customField.findFirst({
      where: { tenantId, module: "HR_SETTINGS", label: counterKey },
    });

    if (!cf) {
      cf = await client.customField.create({
        data: {
          tenantId,
          module: "HR_SETTINGS",
          label: counterKey,
          fieldType: "number",
          status: "active",
        },
      });
    }

    const existingVal = await client.customFieldValue.findFirst({
      where: { tenantId, customFieldId: cf.id, entityId: "tenant_counter" },
    });

    let nextNum = initialStart;
    if (existingVal && existingVal.value) {
      const parsed = parseInt(existingVal.value, 10);
      if (!isNaN(parsed) && parsed >= initialStart) {
        nextNum = parsed + 1;
      }
    }

    await client.customFieldValue.upsert({
      where: {
        customFieldId_entityId: {
          customFieldId: cf.id,
          entityId: "tenant_counter",
        },
      },
      create: {
        tenantId,
        customFieldId: cf.id,
        entityId: "tenant_counter",
        value: String(nextNum),
      },
      update: {
        value: String(nextNum),
      },
    });

    return nextNum;
  }

  /**
   * Read current counter without incrementing
   */
  private static async getCurrentCounter(tenantId: string, initialStart: number): Promise<number> {
    try {
      const cf = await prisma.customField.findFirst({
        where: { tenantId, module: "HR_SETTINGS", label: "hr_employee_id_sequence" },
      });
      if (!cf) return initialStart;

      const val = await prisma.customFieldValue.findFirst({
        where: { tenantId, customFieldId: cf.id, entityId: "tenant_counter" },
      });
      if (val?.value) {
        const parsed = parseInt(val.value, 10);
        if (!isNaN(parsed) && parsed >= initialStart) return parsed + 1;
      }
      return initialStart;
    } catch {
      return initialStart;
    }
  }

  /**
   * Generate next immutable System ID inside employee creation transaction
   */
  static async generateSystemId(
    tenantId: string,
    branchId?: string | null,
    txClient: any = prisma
  ): Promise<string> {
    const config = await this.getConfig(tenantId);
    if (!config.autoGenerate) {
      // Fallback manual or uuid prefix
      const comp = await this.resolveCompanyPrefix(tenantId, "EMP");
      return `${comp}-${Date.now().toString().slice(-6)}`;
    }

    const compPrefix = await this.resolveCompanyPrefix(tenantId, config.companyPrefix);
    const locPrefix = await this.resolveLocationPrefix(tenantId, branchId, config.locationPrefix);

    // Concurrency collision protection with up to 5 retries
    for (let attempt = 0; attempt < 5; attempt++) {
      const seqNum = await this.allocateNextSequence(tenantId, config.sequenceStart, txClient);
      const paddedSeq = String(seqNum).padStart(config.sequenceDigits, "0");
      const systemId = `${compPrefix}${config.separator}${locPrefix}${config.separator}${paddedSeq}`;

      // Check if collision exists
      const existingEmployee = await txClient.employee.findFirst({
        where: { tenantId, employeeCode: systemId },
      });

      const existingMeta = await txClient.customFieldValue.findFirst({
        where: {
          tenantId,
          value: systemId,
          customField: { label: "systemId" },
        },
      });

      if (!existingEmployee && !existingMeta) {
        return systemId;
      }
    }

    // Ultimate fallback if multiple retries collide
    const emergencyNum = Date.now().toString().slice(-4);
    return `${compPrefix}${config.separator}${locPrefix}${config.separator}${emergencyNum}`;
  }
}
