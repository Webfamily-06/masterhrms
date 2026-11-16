"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentComplianceService = void 0;
const prisma_js_1 = require("../prisma.js");
const document_expiry_service_js_1 = require("./document-expiry.service.js");
class DocumentComplianceService {
    /**
     * Computes authoritative tenant-wide document compliance summary,
     * including department breakdowns and compliance percentage.
     */
    static async getTenantComplianceSummary(tenantId, filters = {}, dbOverride) {
        const db = dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
        const now = new Date();
        // 1. Fetch active employees (excluding terminated/inactive)
        const employeeWhere = {
            tenantId,
            status: { notIn: ["terminated", "inactive"] },
        };
        if (filters.departmentId) {
            employeeWhere.departmentId = filters.departmentId;
        }
        const employees = await db.employee.findMany({
            where: employeeWhere,
            select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                departmentId: true,
                department: {
                    select: { id: true, name: true },
                },
            },
        });
        // 2. Fetch active mandatory document types
        const requiredTypes = await db.documentType.findMany({
            where: {
                tenantId,
                isRequired: true,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                code: true,
                description: true,
            },
        });
        // 3. Fetch all active documents for these employees and required types
        const employeeIds = employees.map((e) => e.id);
        const requiredTypeIds = requiredTypes.map((t) => t.id);
        const documents = employeeIds.length > 0 && requiredTypeIds.length > 0
            ? await db.companyDocument.findMany({
                where: {
                    tenantId,
                    employeeId: { in: employeeIds },
                    documentTypeId: { in: requiredTypeIds },
                    status: { notIn: ["superseded"] },
                },
                orderBy: { createdAt: "desc" },
            })
            : [];
        // Group documents by employeeId + documentTypeId
        const docMap = new Map();
        for (const d of documents) {
            const key = `${d.employeeId}_${d.documentTypeId}`;
            if (!docMap.has(key)) {
                docMap.set(key, d); // Latest active record
            }
        }
        const statusCounts = {
            compliant: 0,
            expiring30: 0,
            expiring15: 0,
            expiring7: 0,
            expired: 0,
            pendingVerification: 0,
            rejected: 0,
            missingMandatory: 0,
        };
        // Department grouping
        const deptMap = new Map();
        for (const emp of employees) {
            const dId = emp.departmentId || "unassigned";
            const dName = emp.department?.name || "General / Unassigned";
            if (!deptMap.has(dId)) {
                deptMap.set(dId, {
                    departmentId: emp.departmentId || null,
                    departmentName: dName,
                    employees: [],
                    totalObligations: 0,
                    compliantObligations: 0,
                    expiredCount: 0,
                    missingCount: 0,
                    pendingCount: 0,
                });
            }
            const deptGroup = deptMap.get(dId);
            deptGroup.employees.push(emp);
            for (const reqType of requiredTypes) {
                deptGroup.totalObligations++;
                const key = `${emp.id}_${reqType.id}`;
                const doc = docMap.get(key);
                if (!doc) {
                    statusCounts.missingMandatory++;
                    deptGroup.missingCount++;
                    continue;
                }
                const classification = document_expiry_service_js_1.DocumentExpiryService.classifyDocument(doc, now);
                if (doc.status === "rejected") {
                    statusCounts.rejected++;
                }
                else if (doc.status === "pending_verification") {
                    statusCounts.pendingVerification++;
                    deptGroup.pendingCount++;
                }
                else if (classification.isExpired) {
                    statusCounts.expired++;
                    deptGroup.expiredCount++;
                }
                else {
                    // Document is verified/valid and not expired
                    statusCounts.compliant++;
                    deptGroup.compliantObligations++;
                    if (classification.classification === "EXPIRING_7_DAYS") {
                        statusCounts.expiring7++;
                    }
                    else if (classification.classification === "EXPIRING_15_DAYS") {
                        statusCounts.expiring15++;
                    }
                    else if (classification.classification === "EXPIRING_30_DAYS") {
                        statusCounts.expiring30++;
                    }
                }
            }
        }
        const totalObligations = employees.length * requiredTypes.length;
        const compliantObligations = statusCounts.compliant;
        const complianceRate = totalObligations > 0
            ? Number(((compliantObligations / totalObligations) * 100).toFixed(1))
            : 100;
        const departmentBreakdown = Array.from(deptMap.values()).map((d) => {
            const deptRate = d.totalObligations > 0
                ? Number(((d.compliantObligations / d.totalObligations) * 100).toFixed(1))
                : 100;
            return {
                departmentId: d.departmentId,
                departmentName: d.departmentName,
                employeeCount: d.employees.length,
                totalObligations: d.totalObligations,
                compliantObligations: d.compliantObligations,
                complianceRate: deptRate,
                expiredCount: d.expiredCount,
                missingCount: d.missingCount,
                pendingCount: d.pendingCount,
            };
        });
        return {
            tenantId,
            calculatedAt: now.toISOString(),
            totalEmployees: employees.length,
            totalRequiredDocTypes: requiredTypes.length,
            totalObligations,
            compliantObligations,
            complianceRate,
            statusCounts,
            departmentBreakdown,
        };
    }
    /**
     * Retrieves individual compliance checklist for a specific employee.
     */
    static async getEmployeeDocumentCompliance(tenantId, employeeId, dbOverride) {
        const db = dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
        const now = new Date();
        const employee = await db.employee.findUnique({
            where: { id: employeeId },
            select: {
                id: true,
                tenantId: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                departmentId: true,
                department: { select: { id: true, name: true } },
                user: { select: { email: true } },
            },
        });
        if (!employee || employee.tenantId !== tenantId) {
            throw new Error("Employee not found in current tenant context");
        }
        const requiredTypes = await db.documentType.findMany({
            where: {
                tenantId,
                isRequired: true,
                isActive: true,
            },
            orderBy: { name: "asc" },
        });
        const docs = await db.companyDocument.findMany({
            where: {
                tenantId,
                employeeId,
                documentTypeId: { in: requiredTypes.map((t) => t.id) },
                status: { notIn: ["superseded"] },
            },
            orderBy: { createdAt: "desc" },
        });
        const docMap = new Map();
        for (const d of docs) {
            if (d.documentTypeId && !docMap.has(d.documentTypeId)) {
                docMap.set(d.documentTypeId, d);
            }
        }
        let compliantCount = 0;
        const checklist = requiredTypes.map((type) => {
            const doc = docMap.get(type.id);
            if (!doc) {
                return {
                    documentTypeId: type.id,
                    documentTypeName: type.name,
                    documentTypeCode: type.code,
                    description: type.description,
                    isRequired: type.isRequired,
                    fulfillmentStatus: "MISSING",
                    document: null,
                };
            }
            const classification = document_expiry_service_js_1.DocumentExpiryService.classifyDocument(doc, now);
            let fulfillmentStatus = "COMPLIANT";
            if (doc.status === "rejected") {
                fulfillmentStatus = "REJECTED";
            }
            else if (doc.status === "pending_verification") {
                fulfillmentStatus = "PENDING_VERIFICATION";
            }
            else if (classification.isExpired) {
                fulfillmentStatus = "EXPIRED";
            }
            else if (classification.isExpiringSoon) {
                fulfillmentStatus = "EXPIRING_SOON";
                compliantCount++;
            }
            else {
                fulfillmentStatus = "COMPLIANT";
                compliantCount++;
            }
            return {
                documentTypeId: type.id,
                documentTypeName: type.name,
                documentTypeCode: type.code,
                description: type.description,
                isRequired: type.isRequired,
                fulfillmentStatus,
                document: {
                    id: doc.id,
                    documentCode: doc.documentCode,
                    title: doc.title,
                    status: doc.status,
                    expiryDate: doc.expiryDate,
                    daysRemaining: classification.daysRemaining,
                    fileUrl: doc.fileUrl,
                    verifiedAt: doc.verifiedAt,
                    verifiedBy: doc.verifiedBy,
                    notes: doc.notes,
                },
            };
        });
        const totalRequired = requiredTypes.length;
        const complianceRate = totalRequired > 0 ? Number(((compliantCount / totalRequired) * 100).toFixed(1)) : 100;
        return {
            employee: {
                id: employee.id,
                employeeCode: employee.employeeCode,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.user?.email || null,
                departmentId: employee.departmentId,
                departmentName: employee.department?.name || "General",
            },
            totalRequired,
            compliantCount,
            complianceRate,
            checklist,
        };
    }
    /**
     * Retrieves paginated list of expiring and expired documents with filtering.
     */
    static async getExpiringDocumentsList(tenantId, filters = {}, dbOverride) {
        const db = dbOverride || prisma_js_1.rawPrisma || prisma_js_1.prisma;
        const now = new Date();
        const page = Math.max(1, Number(filters.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
        const skip = (page - 1) * limit;
        const where = {
            tenantId,
            expiryDate: { not: null },
            status: { notIn: ["superseded"] },
        };
        if (filters.departmentId) {
            where.employee = { departmentId: filters.departmentId };
        }
        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search, mode: "insensitive" } },
                { documentCode: { contains: filters.search, mode: "insensitive" } },
                { employee: { firstName: { contains: filters.search, mode: "insensitive" } } },
                { employee: { lastName: { contains: filters.search, mode: "insensitive" } } },
                { employee: { employeeCode: { contains: filters.search, mode: "insensitive" } } },
            ];
        }
        const docs = await db.companyDocument.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                documentType: {
                    select: { id: true, name: true, code: true, isRequired: true },
                },
            },
            orderBy: { expiryDate: "asc" },
        });
        // Filter by stage/days in-memory with the authoritative classification logic
        const evaluatedDocs = docs.map((doc) => {
            const cls = document_expiry_service_js_1.DocumentExpiryService.classifyDocument(doc, now);
            return {
                ...doc,
                classification: cls.classification,
                daysRemaining: cls.daysRemaining,
                isExpired: cls.isExpired,
                isExpiringSoon: cls.isExpiringSoon,
                stage: cls.stage,
            };
        });
        let filtered = evaluatedDocs;
        if (filters.stage && filters.stage !== "all") {
            filtered = evaluatedDocs.filter((d) => {
                if (filters.stage === "expired")
                    return d.isExpired;
                if (filters.stage === "7_days")
                    return d.stage === "7_days";
                if (filters.stage === "15_days")
                    return d.stage === "15_days";
                if (filters.stage === "30_days")
                    return d.stage === "30_days";
                if (filters.stage === "expiring_soon")
                    return d.isExpiringSoon;
                return true;
            });
        }
        else if (filters.days !== undefined) {
            const maxDays = Number(filters.days);
            filtered = evaluatedDocs.filter((d) => {
                if (d.daysRemaining === null)
                    return false;
                return d.daysRemaining <= maxDays;
            });
        }
        const total = filtered.length;
        const paginated = filtered.slice(skip, skip + limit);
        return {
            items: paginated,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}
exports.DocumentComplianceService = DocumentComplianceService;
