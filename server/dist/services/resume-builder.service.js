"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeBuilderService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class ResumeBuilderService {
    static async getResumesList(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "resume_builder", key: "resumes" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveResumesList(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "resume_builder", key: "resumes" },
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
                    group: "resume_builder",
                    key: "resumes",
                    valueJson: { items },
                    valueType: "json",
                    version: 1,
                },
            });
        }
    }
    static async listResumes(tenantId, filters) {
        let list = await this.getResumesList(tenantId);
        if (filters?.candidateId) {
            list = list.filter((r) => r.candidateId === filters.candidateId);
        }
        if (filters?.employeeId) {
            list = list.filter((r) => r.employeeId === filters.employeeId);
        }
        if (filters?.search) {
            const q = filters.search.toLowerCase();
            list = list.filter((r) => r.title.toLowerCase().includes(q) ||
                r.fullName.toLowerCase().includes(q) ||
                r.summary.toLowerCase().includes(q));
        }
        return list;
    }
    static async getResume(tenantId, id) {
        const list = await this.getResumesList(tenantId);
        return list.find((r) => r.id === id) || null;
    }
    static async createResume(tenantId, data, userId) {
        const list = await this.getResumesList(tenantId);
        const now = new Date().toISOString();
        // Compute basic ATS completeness score
        let score = 40; // baseline
        if (data.experience && data.experience.length > 0)
            score += 20;
        if (data.education && data.education.length > 0)
            score += 15;
        if (data.skillGroups && data.skillGroups.length > 0)
            score += 15;
        if (data.summary && data.summary.length > 100)
            score += 10;
        const resume = {
            id: crypto_1.default.randomUUID(),
            tenantId,
            candidateId: data.candidateId || null,
            employeeId: data.employeeId || null,
            title: data.title.trim(),
            template: data.template || "MODERN",
            fullName: data.fullName.trim(),
            email: data.email.trim(),
            phone: data.phone?.trim(),
            location: data.location?.trim(),
            summary: data.summary.trim(),
            experience: data.experience || [],
            education: data.education || [],
            skillGroups: data.skillGroups || [],
            certifications: data.certifications || [],
            projects: data.projects || [],
            version: 1,
            atsScore: Math.min(100, score),
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
        };
        list.unshift(resume);
        await this.saveResumesList(tenantId, list);
        return resume;
    }
    static async updateResume(tenantId, id, updates) {
        const list = await this.getResumesList(tenantId);
        const resume = list.find((r) => r.id === id);
        if (!resume) {
            throw new Error(`Resume '${id}' not found`);
        }
        Object.assign(resume, updates, {
            version: resume.version + 1,
            updatedAt: new Date().toISOString(),
        });
        await this.saveResumesList(tenantId, list);
        return resume;
    }
    static async deleteResume(tenantId, id) {
        let list = await this.getResumesList(tenantId);
        const prevLen = list.length;
        list = list.filter((r) => r.id !== id);
        if (list.length === prevLen)
            return false;
        await this.saveResumesList(tenantId, list);
        return true;
    }
}
exports.ResumeBuilderService = ResumeBuilderService;
