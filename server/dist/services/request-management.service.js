"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestManagementService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class RequestManagementService {
    static async getRequests(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "request_management", key: "requests" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveRequests(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "request_management", key: "requests" },
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
                    group: "request_management",
                    key: "requests",
                    valueType: "JSON",
                    valueJson: { items },
                    version: 1,
                },
            });
        }
    }
    /**
     * List employee service requests
     */
    static async listRequests(tenantId, filters) {
        let requests = await this.getRequests(tenantId);
        if (filters?.employeeId) {
            requests = requests.filter((r) => r.employeeId === filters.employeeId);
        }
        if (filters?.status) {
            requests = requests.filter((r) => r.status === filters.status);
        }
        if (filters?.category) {
            requests = requests.filter((r) => r.category === filters.category);
        }
        return requests;
    }
    /**
     * Get single request by ID
     */
    static async getById(tenantId, id) {
        const requests = await this.getRequests(tenantId);
        return requests.find((r) => r.id === id) || null;
    }
    /**
     * Submit new service request
     */
    static async createRequest(tenantId, data) {
        const requests = await this.getRequests(tenantId);
        const count = requests.length + 1;
        const requestNo = `REQ-${String(count).padStart(4, "0")}`;
        const now = new Date().toISOString();
        const newRequest = {
            id: `req_${Date.now()}_${crypto_1.default.randomBytes(2).toString("hex")}`,
            tenantId,
            requestNo,
            employeeId: data.employeeId,
            employeeName: data.employeeName,
            category: data.category,
            title: data.title,
            details: data.details,
            priority: data.priority || "MEDIUM",
            status: "PENDING",
            createdAt: now,
            updatedAt: now,
        };
        requests.unshift(newRequest);
        await this.saveRequests(tenantId, requests);
        return newRequest;
    }
    /**
     * Review / transition service request status
     */
    static async reviewRequest(tenantId, id, status, reviewer, reviewNotes) {
        const requests = await this.getRequests(tenantId);
        const request = requests.find((r) => r.id === id);
        if (!request) {
            throw new Error("Service request not found.");
        }
        const now = new Date().toISOString();
        request.status = status;
        request.reviewedBy = reviewer;
        request.reviewedAt = now;
        request.reviewNotes = reviewNotes || null;
        request.updatedAt = now;
        await this.saveRequests(tenantId, requests);
        return request;
    }
    /**
     * Delete request
     */
    static async deleteRequest(tenantId, id) {
        let requests = await this.getRequests(tenantId);
        const countBefore = requests.length;
        requests = requests.filter((r) => r.id !== id);
        if (requests.length === countBefore) {
            throw new Error("Service request not found.");
        }
        await this.saveRequests(tenantId, requests);
        return true;
    }
}
exports.RequestManagementService = RequestManagementService;
