"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetainerService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class RetainerService {
    static async getAgreements(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "finance", key: "retainer_agreements" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveAgreements(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "finance", key: "retainer_agreements" },
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
                    group: "finance",
                    key: "retainer_agreements",
                    valueType: "JSON",
                    valueJson: { items },
                    version: 1,
                },
            });
        }
    }
    /**
     * List retainer agreements for a tenant
     */
    static async list(tenantId, filters) {
        let agreements = await this.getAgreements(tenantId);
        if (filters?.status) {
            agreements = agreements.filter((a) => a.status === filters.status);
        }
        if (filters?.clientId) {
            agreements = agreements.filter((a) => a.clientId === filters.clientId);
        }
        return agreements;
    }
    /**
     * Get retainer agreement by ID
     */
    static async getById(tenantId, id) {
        const agreements = await this.getAgreements(tenantId);
        return agreements.find((a) => a.id === id) || null;
    }
    /**
     * Create a new retainer agreement
     */
    static async create(tenantId, data) {
        const agreements = await this.getAgreements(tenantId);
        const id = `ret_${Date.now()}_${crypto_1.default.randomBytes(3).toString("hex")}`;
        const count = agreements.length + 1;
        const retainerNo = `RET-${String(count).padStart(4, "0")}`;
        const now = new Date().toISOString();
        const initialTx = {
            id: `tx_${Date.now()}_${crypto_1.default.randomBytes(2).toString("hex")}`,
            date: now.split("T")[0],
            type: "DEPOSIT",
            amount: data.totalAmount,
            description: "Initial Retainer Advance Deposit",
            createdAt: now,
        };
        const newAgreement = {
            id,
            tenantId,
            retainerNo,
            clientId: data.clientId,
            clientName: data.clientName,
            title: data.title,
            totalAmount: data.totalAmount,
            advanceBalance: data.totalAmount,
            drawnAmount: 0,
            startDate: data.startDate,
            endDate: data.endDate,
            status: "ACTIVE",
            notes: data.notes || null,
            transactions: [initialTx],
            createdAt: now,
            updatedAt: now,
        };
        agreements.unshift(newAgreement);
        await this.saveAgreements(tenantId, agreements);
        return newAgreement;
    }
    /**
     * Drawdown funds against an active retainer agreement
     */
    static async drawdown(tenantId, id, data) {
        const agreements = await this.getAgreements(tenantId);
        const agreement = agreements.find((a) => a.id === id);
        if (!agreement) {
            throw new Error("Retainer agreement not found.");
        }
        if (agreement.status === "CLOSED") {
            throw new Error("Cannot drawdown against a closed retainer agreement.");
        }
        if (data.amount <= 0) {
            throw new Error("Drawdown amount must be greater than zero.");
        }
        if (agreement.advanceBalance < data.amount) {
            throw new Error(`Insufficient retainer balance. Available: ${agreement.advanceBalance}, requested: ${data.amount}`);
        }
        const now = new Date().toISOString();
        const newBalance = Math.round((agreement.advanceBalance - data.amount) * 100) / 100;
        const newDrawn = Math.round((agreement.drawnAmount + data.amount) * 100) / 100;
        const tx = {
            id: `tx_${Date.now()}_${crypto_1.default.randomBytes(2).toString("hex")}`,
            date: now.split("T")[0],
            type: "DRAWDOWN",
            amount: data.amount,
            description: data.description,
            milestoneId: data.milestoneId || null,
            invoiceId: data.invoiceId || null,
            createdAt: now,
        };
        agreement.advanceBalance = newBalance;
        agreement.drawnAmount = newDrawn;
        agreement.status = newBalance === 0 ? "DEPLETED" : "ACTIVE";
        agreement.transactions.push(tx);
        agreement.updatedAt = now;
        await this.saveAgreements(tenantId, agreements);
        return agreement;
    }
    /**
     * Deposit / top-up funds into retainer
     */
    static async deposit(tenantId, id, data) {
        const agreements = await this.getAgreements(tenantId);
        const agreement = agreements.find((a) => a.id === id);
        if (!agreement) {
            throw new Error("Retainer agreement not found.");
        }
        if (data.amount <= 0) {
            throw new Error("Deposit amount must be greater than zero.");
        }
        const now = new Date().toISOString();
        const newBalance = Math.round((agreement.advanceBalance + data.amount) * 100) / 100;
        const newTotal = Math.round((agreement.totalAmount + data.amount) * 100) / 100;
        const tx = {
            id: `tx_${Date.now()}_${crypto_1.default.randomBytes(2).toString("hex")}`,
            date: now.split("T")[0],
            type: "DEPOSIT",
            amount: data.amount,
            description: data.description,
            createdAt: now,
        };
        agreement.totalAmount = newTotal;
        agreement.advanceBalance = newBalance;
        if (agreement.status === "DEPLETED") {
            agreement.status = "ACTIVE";
        }
        agreement.transactions.push(tx);
        agreement.updatedAt = now;
        await this.saveAgreements(tenantId, agreements);
        return agreement;
    }
    /**
     * Close a retainer agreement
     */
    static async close(tenantId, id) {
        const agreements = await this.getAgreements(tenantId);
        const agreement = agreements.find((a) => a.id === id);
        if (!agreement) {
            throw new Error("Retainer agreement not found.");
        }
        agreement.status = "CLOSED";
        agreement.updatedAt = new Date().toISOString();
        await this.saveAgreements(tenantId, agreements);
        return agreement;
    }
    /**
     * Delete retainer agreement
     */
    static async delete(tenantId, id) {
        let agreements = await this.getAgreements(tenantId);
        const countBefore = agreements.length;
        agreements = agreements.filter((a) => a.id !== id);
        if (agreements.length === countBefore) {
            throw new Error("Retainer agreement not found.");
        }
        await this.saveAgreements(tenantId, agreements);
        return true;
    }
}
exports.RetainerService = RetainerService;
