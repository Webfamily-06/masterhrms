"use strict";
/**
 * MASTERHRMS — Reporting Hierarchy Validation Utility
 * Enforces strict enterprise organizational hierarchy rules:
 * 1. Self-reporting is rejected (employee cannot be their own manager).
 * 2. Cross-tenant manager assignment is rejected.
 * 3. Circular reporting is detected and rejected (cycles in the reporting graph).
 * 4. Manager existence and active employment status are enforced.
 * 5. Clearing manager (managerId = null) is always safe.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateReportingHierarchy = validateReportingHierarchy;
async function validateReportingHierarchy(tenantId, employeeId, targetManagerId, db) {
    // Clearing manager is always valid (e.g. employee promoted to top executive / CEO)
    if (!targetManagerId || targetManagerId.trim() === "") {
        return { valid: true };
    }
    const cleanManagerId = targetManagerId.trim();
    // 1. Rule: An employee cannot report to themselves
    if (employeeId && cleanManagerId === employeeId) {
        return {
            valid: false,
            error: "Self-reporting is forbidden: An employee cannot be assigned as their own reporting manager.",
        };
    }
    // 2. Rule: Validate manager exists and belongs to the same tenant
    const manager = await db.employee.findFirst({
        where: {
            id: cleanManagerId,
            tenantId,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            status: true,
            managerId: true,
        },
    });
    if (!manager) {
        return {
            valid: false,
            error: "Selected reporting manager does not exist in this organization workspace.",
        };
    }
    // 3. Rule: Inactive or terminated employee cannot be assigned as an active reporting manager
    if (manager.status !== "active") {
        return {
            valid: false,
            error: `Cannot assign inactive employee (${manager.firstName} ${manager.lastName} - ${manager.employeeCode}) as reporting manager.`,
        };
    }
    // 4. Rule: Circular reporting detection (A -> B -> ... -> A)
    // Only applies when updating an existing employee whose ID is known
    if (employeeId) {
        let currentAncestorId = manager.managerId;
        const visited = new Set([cleanManagerId]);
        let depth = 0;
        const MAX_HIERARCHY_DEPTH = 60; // Safe upper bound for enterprise hierarchy depth
        while (currentAncestorId && depth < MAX_HIERARCHY_DEPTH) {
            if (currentAncestorId === employeeId) {
                return {
                    valid: false,
                    error: `Circular reporting detected: Assigning this manager would create a reporting loop because ${manager.firstName} ${manager.lastName} (${manager.employeeCode}) already reports to this employee directly or indirectly.`,
                };
            }
            if (visited.has(currentAncestorId)) {
                // Break out if a pre-existing cycle is encountered elsewhere in the graph
                break;
            }
            visited.add(currentAncestorId);
            const ancestor = await db.employee.findFirst({
                where: { id: currentAncestorId, tenantId },
                select: { id: true, managerId: true },
            });
            currentAncestorId = ancestor?.managerId || null;
            depth++;
        }
    }
    return { valid: true };
}
