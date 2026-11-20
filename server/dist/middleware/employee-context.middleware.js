"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireEmployee = requireEmployee;
const prisma_1 = require("../prisma");
/**
 * requireEmployee - Middleware for Employee Self-Service (ESS)
 * Derives the caller employee record securely from req.user (JWT identity)
 * without trusting client-supplied employeeId.
 */
async function requireEmployee(req, res, next) {
    if (!req.user || !req.user.tenantId || !req.user.userId) {
        return res.status(401).json({ error: "Unauthorized: Missing user authentication or tenant context" });
    }
    const db = prisma_1.rawPrisma || prisma_1.prisma;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    try {
        let employee = await db.employee.findFirst({
            where: {
                tenantId,
                userId,
            },
            select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                email: true,
                departmentId: true,
                branchId: true,
                designationId: true,
                managerId: true,
                status: true,
                userId: true,
                tenantId: true,
            },
        });
        // Fallback 1: Check by email if employee wasn't linked to userId yet
        if (!employee && req.user.email) {
            const empByEmail = await db.employee.findFirst({
                where: {
                    tenantId,
                    email: { equals: req.user.email, mode: "insensitive" },
                },
                select: {
                    id: true,
                    employeeCode: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    departmentId: true,
                    branchId: true,
                    designationId: true,
                    managerId: true,
                    status: true,
                    userId: true,
                    tenantId: true,
                },
            });
            if (empByEmail) {
                await db.employee.update({
                    where: { id: empByEmail.id },
                    data: { userId },
                }).catch((e) => console.warn("[requireEmployee] Linking employee userId:", e?.message));
                employee = { ...empByEmail, userId };
            }
        }
        // Fallback 2: If user is authenticated in this tenant (e.g. HR Admin, Workspace Admin, Staff)
        // but no Employee row was ever seeded/created, auto-provision an active employee profile
        if (!employee) {
            const userRecord = await db.user.findUnique({
                where: { id: userId },
                include: { profile: true },
            });
            const email = userRecord?.email || req.user.email || `user-${userId.slice(0, 8)}@workspace.local`;
            const fullName = userRecord?.profile?.fullName || userRecord?.email?.split("@")[0] || "User";
            const nameParts = fullName.trim().split(" ");
            const firstName = nameParts[0] || "Staff";
            const lastName = nameParts.slice(1).join(" ") || "Member";
            const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            try {
                const createdEmp = await db.employee.create({
                    data: {
                        tenantId,
                        userId,
                        email,
                        firstName,
                        lastName,
                        employeeCode: `EMP-${codeSuffix}`,
                        position: "Administrator / Staff",
                        status: "active",
                        employmentType: "full_time",
                        employmentCategory: "permanent",
                    },
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        departmentId: true,
                        branchId: true,
                        designationId: true,
                        managerId: true,
                        status: true,
                        userId: true,
                        tenantId: true,
                    },
                });
                employee = createdEmp;
            }
            catch (createErr) {
                console.warn("[requireEmployee] Auto-provision fallback failed:", createErr?.message);
            }
        }
        if (!employee) {
            return res.status(403).json({
                error: "Forbidden: No employee profile is linked to this account in the current workspace.",
                code: "EMPLOYEE_PROFILE_REQUIRED",
            });
        }
        if (employee.userId !== userId) {
            return res.status(403).json({
                error: "Forbidden: Employee user identity mismatch.",
                code: "EMPLOYEE_USER_MISMATCH",
            });
        }
        if (employee.tenantId !== tenantId) {
            return res.status(403).json({
                error: "Forbidden: Cross-tenant employee access denied.",
                code: "EMPLOYEE_TENANT_MISMATCH",
            });
        }
        const normalizedStatus = (employee.status || "").toLowerCase().trim();
        if (normalizedStatus === "terminated" || normalizedStatus === "archived") {
            return res.status(403).json({
                error: "Forbidden: Your employee profile has been terminated.",
                code: "EMPLOYEE_TERMINATED",
            });
        }
        if (normalizedStatus === "inactive" || normalizedStatus === "suspended") {
            return res.status(403).json({
                error: "Forbidden: Your employee profile is inactive.",
                code: "EMPLOYEE_INACTIVE",
            });
        }
        req.employee = employee;
        next();
    }
    catch (err) {
        console.error("[requireEmployee] Error looking up employee profile:", err);
        return res.status(500).json({ error: "Failed to resolve employee identity" });
    }
}
