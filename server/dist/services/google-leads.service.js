"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleLeadsService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class GoogleLeadsService {
    static async getIngestedLeads(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "google_leads", key: "lead_events" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveIngestedLeads(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "google_leads", key: "lead_events" },
        });
        if (existing) {
            await db.setting.update({
                where: { id: existing.id },
                data: { valueJson: { items }, version: { increment: 1 } },
            });
        }
        else {
            await db.setting.create({
                data: {
                    scope: "TENANT",
                    scopeId: tenantId,
                    group: "google_leads",
                    key: "lead_events",
                    valueType: "JSON",
                    valueJson: { items },
                    version: 1,
                },
            });
        }
    }
    /**
     * Ingest lead form payload from Google Ads webhook
     */
    static async ingestLead(tenantId, payload) {
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
        const leadRecord = {
            id: `lead_${Date.now()}_${crypto_1.default.randomBytes(2).toString("hex")}`,
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
    static async listLeads(tenantId) {
        return await this.getIngestedLeads(tenantId);
    }
}
exports.GoogleLeadsService = GoogleLeadsService;
