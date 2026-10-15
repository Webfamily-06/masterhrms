import crypto from "crypto";
import { getTenantDb } from "../context/tenant-context";
import { StatutoryRuleRegistryService, StatutoryRuleDraftInput } from "./statutory-rule-registry.service";
import { ALL_INDIA_JURISDICTIONS } from "../constants/jurisdictions";

export interface OfficialGovernmentSource {
  id: string;
  code: string;
  name: string;
  category: "EPF" | "ESI" | "PT" | "LWF" | "GRATUITY" | "TDS_ITA2025" | "GENERAL_LABOUR";
  jurisdictionLevel: "CENTRAL" | "STATE";
  stateCode?: string;
  officialPortalUrl: string;
  governingMinistry: string;
  cadence: "MONTHLY_GAZETTE" | "ANNUAL_BUDGET" | "AD_HOC_CIRCULAR";
  lastCheckedAt?: Date;
  status: "ONLINE" | "MONITORED" | "MANUAL_DIGITIZATION";
}

export const OFFICIAL_GOVERNMENT_SOURCES: OfficialGovernmentSource[] = [
  {
    id: "SRC_EPFO_CENTRAL",
    code: "EPFO_GOV",
    name: "Employees' Provident Fund Organisation (EPFO)",
    category: "EPF",
    jurisdictionLevel: "CENTRAL",
    officialPortalUrl: "https://www.epfindia.gov.in",
    governingMinistry: "Ministry of Labour & Employment, Govt of India",
    cadence: "AD_HOC_CIRCULAR",
    status: "MONITORED",
  },
  {
    id: "SRC_ESIC_CENTRAL",
    code: "ESIC_GOV",
    name: "Employees' State Insurance Corporation (ESIC)",
    category: "ESI",
    jurisdictionLevel: "CENTRAL",
    officialPortalUrl: "https://www.esic.gov.in",
    governingMinistry: "Ministry of Labour & Employment, Govt of India",
    cadence: "AD_HOC_CIRCULAR",
    status: "MONITORED",
  },
  {
    id: "SRC_CBDT_CENTRAL",
    code: "CBDT_INCOMETAX",
    name: "Central Board of Direct Taxes (CBDT) - Income Tax Department",
    category: "TDS_ITA2025",
    jurisdictionLevel: "CENTRAL",
    officialPortalUrl: "https://www.incometax.gov.in",
    governingMinistry: "Ministry of Finance, Govt of India",
    cadence: "ANNUAL_BUDGET",
    status: "MONITORED",
  },
  {
    id: "SRC_MAHAGST_PT",
    code: "MAHAGST_PT",
    name: "Maharashtra Goods & Services Tax Department (PT Wing)",
    category: "PT",
    jurisdictionLevel: "STATE",
    stateCode: "MH",
    officialPortalUrl: "https://www.mahagst.gov.in",
    governingMinistry: "Finance Department, Govt of Maharashtra",
    cadence: "ANNUAL_BUDGET",
    status: "MONITORED",
  },
  {
    id: "SRC_KARNATAKA_CTD",
    code: "KARNATAKA_CTD",
    name: "Karnataka Commercial Taxes Department (PT Section)",
    category: "PT",
    jurisdictionLevel: "STATE",
    stateCode: "KA",
    officialPortalUrl: "https://karnataka.gov.in",
    governingMinistry: "Commercial Taxes, Govt of Karnataka",
    cadence: "ANNUAL_BUDGET",
    status: "MONITORED",
  },
  {
    id: "SRC_TAMILNADU_LABOUR",
    code: "TN_LABOUR_LWF",
    name: "Tamil Nadu Labour Welfare Board",
    category: "LWF",
    jurisdictionLevel: "STATE",
    stateCode: "TN",
    officialPortalUrl: "https://labour.tn.gov.in",
    governingMinistry: "Labour & Employment Dept, Govt of Tamil Nadu",
    cadence: "ANNUAL_BUDGET",
    status: "MONITORED",
  },
  {
    id: "SRC_DELHI_LABOUR",
    code: "DELHI_LABOUR_LWF",
    name: "Delhi Labour Welfare Board",
    category: "LWF",
    jurisdictionLevel: "STATE",
    stateCode: "DL",
    officialPortalUrl: "https://labour.delhi.gov.in",
    governingMinistry: "Government of NCT of Delhi",
    cadence: "ANNUAL_BUDGET",
    status: "MONITORED",
  },
];

export interface GazetteNotificationPayload {
  sourceCode: string;
  notificationRef: string;
  sourceAuthority: string;
  sourceUrl: string;
  title: string;
  gazetteDate: string;
  effectiveFrom: string;
  ruleType: string;
  stateCode?: string;
  proposedConfig: Record<string, any>;
  changeSummary: string;
  rawGazetteText?: string;
}

export interface AmendmentDiffResult {
  hasChanges: boolean;
  activeRuleFound: boolean;
  activeRuleId?: string;
  activeRuleVersion?: number;
  differences: Array<{
    field: string;
    previousValue: any;
    proposedValue: any;
    type: "MODIFIED" | "ADDED" | "REMOVED";
  }>;
}

export class StatutoryAmendmentIngestionService {
  /**
   * List all registered official sources with monitoring status
   */
  static getOfficialSources(): OfficialGovernmentSource[] {
    return OFFICIAL_GOVERNMENT_SOURCES;
  }

  /**
   * Compute structured SHA-256 checksum for notification payload
   */
  static computeNotificationChecksum(payload: GazetteNotificationPayload): string {
    const serialized = JSON.stringify({
      ref: payload.notificationRef,
      date: payload.gazetteDate,
      effective: payload.effectiveFrom,
      config: payload.proposedConfig,
    });
    return crypto.createHash("sha256").update(serialized).digest("hex");
  }

  /**
   * Compare proposed amendment configuration against the current active approved rule
   */
  static async computeRuleDiff(
    ruleType: string,
    stateCode?: string,
    proposedConfig: Record<string, any> = {},
    tenantId?: string | null
  ): Promise<AmendmentDiffResult> {
    const activeRule = await StatutoryRuleRegistryService.resolveActiveRule(
      ruleType,
      stateCode || null,
      tenantId || null,
      new Date()
    );

    if (!activeRule) {
      const addedDifferences = Object.keys(proposedConfig).map((key) => ({
        field: key,
        previousValue: undefined,
        proposedValue: proposedConfig[key],
        type: "ADDED" as const,
      }));

      return {
        hasChanges: addedDifferences.length > 0,
        activeRuleFound: false,
        differences: addedDifferences,
      };
    }

    const currentConfig = (activeRule.configJson as Record<string, any>) || {};
    const differences: AmendmentDiffResult["differences"] = [];

    const allKeys = Array.from(new Set([...Object.keys(currentConfig), ...Object.keys(proposedConfig)]));

    for (const key of allKeys) {
      const prevVal = currentConfig[key];
      const propVal = proposedConfig[key];

      if (prevVal === undefined && propVal !== undefined) {
        differences.push({ field: key, previousValue: undefined, proposedValue: propVal, type: "ADDED" });
      } else if (prevVal !== undefined && propVal === undefined) {
        differences.push({ field: key, previousValue: prevVal, proposedValue: undefined, type: "REMOVED" });
      } else if (JSON.stringify(prevVal) !== JSON.stringify(propVal)) {
        differences.push({ field: key, previousValue: prevVal, proposedValue: propVal, type: "MODIFIED" });
      }
    }

    return {
      hasChanges: differences.length > 0,
      activeRuleFound: true,
      activeRuleId: activeRule.id,
      activeRuleVersion: activeRule.version,
      differences,
    };
  }

  /**
   * Ingest official notification and create a DRAFT rule version.
   * STRICT SAFETY GATE: Ingested notifications NEVER auto-publish.
   * They are created in 'draft' status with isVerified: false and require maker-checker approval.
   */
  static async ingestNotificationAsDraft(
    payload: GazetteNotificationPayload,
    actorId: string,
    actorRole: string = "COMPLIANCE_ANALYST",
    tenantId?: string | null
  ) {
    if (!payload.notificationRef || !payload.ruleType || !payload.effectiveFrom) {
      throw new Error("notificationRef, ruleType, and effectiveFrom are required for amendment ingestion");
    }

    const checksum = this.computeNotificationChecksum(payload);
    const diff = await this.computeRuleDiff(payload.ruleType, payload.stateCode, payload.proposedConfig, tenantId);

    const isStateLevel = Boolean(payload.stateCode && payload.stateCode !== "ALL");
    const ruleIdentifier = isStateLevel
      ? `RULE_${payload.ruleType}_${payload.stateCode}_${payload.notificationRef.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}`
      : `RULE_${payload.ruleType}_CENTRAL_${payload.notificationRef.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}`;

    let category: StatutoryRuleDraftInput["category"] = "STATUTORY_BENEFIT";
    if (payload.ruleType === "EPF") category = "RETIREMENT_PF";
    else if (payload.ruleType === "ESI") category = "SOCIAL_SECURITY_ESI";
    else if (payload.ruleType === "PT") category = "PROFESSIONAL_TAX";
    else if (payload.ruleType === "LWF") category = "LABOUR_WELFARE";
    else if (payload.ruleType.includes("TDS")) category = "DIRECT_TAX";
    else if (payload.ruleType === "GRATUITY") category = "GRATUITY";

    const draftInput: StatutoryRuleDraftInput = {
      ruleIdentifier,
      ruleType: payload.ruleType,
      category,
      jurisdictionLevel: isStateLevel ? "STATE" : "CENTRAL",
      stateCode: payload.stateCode || (isStateLevel ? undefined : "ALL"),
      applicableCategory: "ALL",
      configJson: {
        ...payload.proposedConfig,
        _ingestionMetadata: {
          sourceCode: payload.sourceCode,
          title: payload.title,
          gazetteDate: payload.gazetteDate,
          checksum,
          ingestedAt: new Date().toISOString(),
          diffSummary: diff.differences,
        },
      },
      effectiveFrom: new Date(payload.effectiveFrom),
      sourceAuthority: payload.sourceAuthority,
      notificationRef: payload.notificationRef,
      sourceUrl: payload.sourceUrl,
      isGlobal: !tenantId,
      changeLog: `Gazette Ingestion [${payload.notificationRef}]: ${payload.changeSummary}`,
    };

    const draftRule = await StatutoryRuleRegistryService.createDraftRule(
      draftInput,
      actorId,
      actorRole,
      tenantId || null
    );

    return {
      draftRule,
      diff,
      checksum,
      governanceNotice: "CRITICAL: Notification ingested as DRAFT. Release Gate is BLOCKED. Official approval and compliance review required before publication.",
    };
  }
}
