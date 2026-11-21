"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialGoalService = void 0;
const prisma_1 = require("../prisma");
const client_1 = require("@prisma/client");
const db = prisma_1.rawPrisma || prisma_1.prisma;
class FinancialGoalService {
    /**
     * Helper to format a FinancialGoal Prisma entity with calculated metrics
     */
    static formatGoal(goal) {
        const target = Number(goal.targetAmount);
        const current = Number(goal.currentAmount);
        const progressPercentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
        const variance = target - current;
        return {
            id: goal.id,
            tenantId: goal.tenantId,
            name: goal.name,
            goalType: goal.goalType,
            targetAmount: target,
            currentAmount: current,
            startDate: goal.startDate instanceof Date ? goal.startDate.toISOString().split("T")[0] : String(goal.startDate),
            targetDate: goal.targetDate instanceof Date ? goal.targetDate.toISOString().split("T")[0] : String(goal.targetDate),
            status: goal.status,
            description: goal.description,
            progressPercentage,
            variance,
            createdAt: goal.createdAt instanceof Date ? goal.createdAt.toISOString() : String(goal.createdAt),
            updatedAt: goal.updatedAt instanceof Date ? goal.updatedAt.toISOString() : String(goal.updatedAt),
        };
    }
    /**
     * List financial goals for a tenant with optional filtering
     */
    static async list(tenantId, filters) {
        const where = { tenantId };
        if (filters?.status && filters.status !== "all") {
            where.status = filters.status;
        }
        if (filters?.goalType && filters.goalType !== "all") {
            where.goalType = filters.goalType;
        }
        if (filters?.search) {
            where.name = { contains: filters.search, mode: "insensitive" };
        }
        const goals = await db.financialGoal.findMany({
            where,
            orderBy: { targetDate: "asc" },
        });
        return goals.map(this.formatGoal);
    }
    /**
     * Get single financial goal by ID
     */
    static async getById(tenantId, id) {
        const goal = await db.financialGoal.findFirst({
            where: { id, tenantId },
        });
        if (!goal)
            return null;
        return this.formatGoal(goal);
    }
    /**
     * Create a new financial goal
     */
    static async create(tenantId, data) {
        const target = new client_1.Prisma.Decimal(data.targetAmount);
        const current = new client_1.Prisma.Decimal(data.currentAmount || 0);
        const goal = await db.financialGoal.create({
            data: {
                tenantId,
                name: data.name,
                goalType: data.goalType || "revenue",
                targetAmount: target,
                currentAmount: current,
                startDate: new Date(data.startDate),
                targetDate: new Date(data.targetDate),
                status: current.gte(target) ? "achieved" : "in_progress",
                description: data.description || null,
            },
        });
        return this.formatGoal(goal);
    }
    /**
     * Update an existing financial goal
     */
    static async update(tenantId, id, data) {
        const existing = await db.financialGoal.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            throw new Error("Financial goal not found.");
        }
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.goalType !== undefined)
            updateData.goalType = data.goalType;
        if (data.targetAmount !== undefined)
            updateData.targetAmount = new client_1.Prisma.Decimal(data.targetAmount);
        if (data.currentAmount !== undefined)
            updateData.currentAmount = new client_1.Prisma.Decimal(data.currentAmount);
        if (data.startDate !== undefined)
            updateData.startDate = new Date(data.startDate);
        if (data.targetDate !== undefined)
            updateData.targetDate = new Date(data.targetDate);
        if (data.description !== undefined)
            updateData.description = data.description;
        const target = data.targetAmount !== undefined ? new client_1.Prisma.Decimal(data.targetAmount) : existing.targetAmount;
        const current = data.currentAmount !== undefined ? new client_1.Prisma.Decimal(data.currentAmount) : existing.currentAmount;
        if (data.status !== undefined) {
            updateData.status = data.status;
        }
        else if (current.gte(target) && existing.status === "in_progress") {
            updateData.status = "achieved";
        }
        const updated = await db.financialGoal.update({
            where: { id },
            data: updateData,
        });
        return this.formatGoal(updated);
    }
    /**
     * Increment progress / record progress towards a financial goal
     */
    static async recordProgress(tenantId, id, incrementAmount) {
        const existing = await db.financialGoal.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            throw new Error("Financial goal not found.");
        }
        const inc = new client_1.Prisma.Decimal(incrementAmount);
        const newAmount = client_1.Prisma.Decimal.add(existing.currentAmount, inc);
        const isAchieved = newAmount.gte(existing.targetAmount);
        const updated = await db.financialGoal.update({
            where: { id },
            data: {
                currentAmount: newAmount,
                status: isAchieved ? "achieved" : existing.status,
            },
        });
        return this.formatGoal(updated);
    }
    /**
     * Delete a financial goal
     */
    static async delete(tenantId, id) {
        const existing = await db.financialGoal.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            throw new Error("Financial goal not found.");
        }
        await db.financialGoal.delete({ where: { id } });
        return true;
    }
}
exports.FinancialGoalService = FinancialGoalService;
