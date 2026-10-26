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
    // Delegate platform foundation sub-routers (e.g. /lifecycle, /meetings, /documents) to their dedicated handlers
    if (req.path.startsWith("/lifecycle") ||
        req.path.startsWith("/meetings") ||
        req.path.startsWith("/documents") ||
        req.path.startsWith("/collaboration")) {
        return next();
    }
    if (!req.user || !req.user.tenantId) {
        return res.status(401).json({ error: "Unauthorized: Missing user authentication or tenant context" });
    }
    const db = prisma_1.rawPrisma || prisma_1.prisma;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    try {
        const employee = await db.employee.findFirst({
            where: {
                tenantId,
                OR: [
                    { userId },
                    ...(req.user.email ? [{ email: req.user.email }] : []),
                ],
            },
            select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                email: true,
                departmentId: true,
                designationId: true,
                managerId: true,
                status: true,
            },
        });
        if (!employee) {
            return res.status(403).json({
                error: "Forbidden: No employee profile is linked to this account in the current workspace.",
                code: "EMPLOYEE_PROFILE_REQUIRED",
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
