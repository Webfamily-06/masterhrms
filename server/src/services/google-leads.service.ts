import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export interface GoogleLeadFormPayload {
  leadId: string;
  formId: string;
  campaignId?: string;
  adGroupId?: string;
  userColumnData: {
    fullName?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    city?: string;
    notes?: string;
  };
  utmSource?: string;
  utmCampaign?: string;
}

export interface IngestedLeadRecord {
  id: string;
  tenantId: string;
  leadId: string;
  contactId: string;
  campaignId?: string;
  leadData: any;
  receivedAt: string;
}

export class GoogleLeadsService {
  private static async getIngestedLeads(tenantId: string): Promise<IngestedLeadRecord[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "google_leads", key: "lead_events" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveIngestedLeads(tenantId: string, items: IngestedLeadRecord[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "google_leads", key: "lead_events" },
    });

    if (existing) {
      await db.setting.update({
        where: { id: existing.id },
        data: { valueJson: { items } as any, version: { increment: 1 } },
      });
    } else {
      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantId,
          group: "google_leads",
          key: "lead_events",
          valueType: "JSON",
          valueJson: { items } as any,
          version: 1,
        },
      });
    }
  }

  /**
   * Ingest lead form payload from Google Ads webhook
   */
  static async ingestLead(
    tenantId: string,
    payload: GoogleLeadFormPayload
  ): Promise<{ success: boolean; contactId: string; leadId: string; isDuplicate: boolean }> {
    const existingLeads = await this.getIngestedLeads(tenantId);

    // Idempotency check: prevent duplicate ingestion for the same leadId
    const duplicate = existingLeads.find((l) => l.leadId === payload.leadId);
    if (duplicate) {
      return {
        success: true,
        contactId: duplicate.contactId,
        leadId: duplicate.leadId,
        isDuplicate: true,
      };
    }

    const { userColumnData } = payload;
    const name = userColumnData.fullName || "Google Ads Inbound Lead";
    const email = userColumnData.email || null;
    const phone = userColumnData.phone || null;
    const company = userColumnData.companyName || null;
    const city = userColumnData.city || null;

    // Create or link formal CrmContact record in PostgreSQL
    const contact = await db.crmContact.create({
      data: {
        tenantId,
        name,
        email,
        phone,
        company,
        city,
        owner: "Google Ads Automation",
        role: "Inbound Prospect",
        notes: `Captured via Google Lead Form ${payload.formId}. Campaign: ${payload.campaignId || "Direct"}. Notes: ${userColumnData.notes || "N/A"}`,
        activities: [
          {
            type: "LEAD_INGESTION",
            source: "google_ads_webhook",
            leadId: payload.leadId,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });

    const leadRecord: IngestedLeadRecord = {
      id: `lead_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
      tenantId,
      leadId: payload.leadId,
      contactId: contact.id,
      campaignId: payload.campaignId,
      leadData: payload,
      receivedAt: new Date().toISOString(),
    };

    existingLeads.unshift(leadRecord);
    await this.saveIngestedLeads(tenantId, existingLeads);

    return {
      success: true,
      contactId: contact.id,
      leadId: payload.leadId,
      isDuplicate: false,
    };
  }

  /**
   * List ingested leads for a tenant
   */
  static async listLeads(tenantId: string): Promise<IngestedLeadRecord[]> {
    return await this.getIngestedLeads(tenantId);
  }
}
