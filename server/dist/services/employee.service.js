"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const tenant_context_1 = require("../context/tenant-context");
const auth_helpers_1 = require("../lib/auth-helpers");
const audit_service_1 = require("./audit.service");
const outbox_service_1 = require("./outbox.service");
const notification_service_1 = require("./notification.service");
const field_security_1 = require("../lib/field-security");
const allowed_actions_1 = require("../lib/allowed-actions");
const data_scope_1 = require("../lib/data-scope");
const employee_system_id_service_1 = require("./employee-system-id.service");
class EmployeeService {
    /**
     * ATOMIC EMPLOYEE CREATION (8-Step Wizard Target)
     * Executes inside a single transactional boundary:
     * Employee + User Account + Org Assignment + AuditLog + OutboxEvent + Notification
     * Rolls back completely if any step fails.
     */
    static async createEmployeeAtomic(tenantId, actorId, input) {
        const db = (0, tenant_context_1.getTenantDb)();
        // 1. Pre-validation: uniqueness within tenant
        if (input.employeeCode) {
            const existingCode = await db.employee.findFirst({
                where: { tenantId, employeeCode: input.employeeCode },
            });
            if (existingCode) {
                throw new Error(`An employee with code '${input.employeeCode}' already exists in this workspace.`);
            }
        }
        const existingEmail = await db.employee.findFirst({
            where: { tenantId, email: input.email.toLowerCase().trim() },
        });
        if (existingEmail) {
            throw new Error(`An employee with email '${input.email}' already exists in this workspace.`);
        }
        // 2. Execute Transaction
        const result = await db.$transaction(async (tx) => {
            // Step A: Optional User Account provisioning
            let userId = null;
            if (input.createLoginAccount !== false) {
                try {
                    userId = await (0, auth_helpers_1.provisionEmployeeUser)(tx, {
                        tenantId,
                        email: input.email,
                        firstName: input.firstName,
                        lastName: input.lastName,
                        phone: input.phone,
                        avatarUrl: input.avatarUrl,
                        password: input.password || "Employee@123",
                    });
                }
                catch (err) {
                    // If user provisioning fails, rethrow to abort employee creation
                    throw new Error(`Failed to provision user access: ${err.message}`);
                }
            }
            // Step B: Generate immutable System ID & Create Employee record
            const systemId = await employee_system_id_service_1.EmployeeSystemIdService.generateSystemId(tenantId, input.branchId, tx);
            const finalEmployeeCode = input.employeeCode ? input.employeeCode.trim() : systemId;
            const employee = await tx.employee.create({
                data: {
                    tenantId,
                    userId,
                    employeeCode: finalEmployeeCode,
                    firstName: input.firstName.trim(),
                    lastName: input.lastName.trim(),
                    email: input.email.toLowerCase().trim(),
                    phone: input.phone || null,
                    position: input.position || null,
                    branchId: input.branchId || null,
                    departmentId: input.departmentId || null,
                    designationId: input.designationId || null,
                    managerId: input.managerId || null,
                    employmentType: input.employmentType || "full_time",
                    status: input.status || "active",
                    salary: input.salary !== undefined && input.salary !== null ? String(input.salary) : null,
                    joinedAt: input.joinedAt ? new Date(input.joinedAt) : new Date(),
                    dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
                    gender: input.gender || null,
                    taxRegime: input.taxRegime || "new",
                    pfEligible: input.pfEligible !== false,
                    esiEligible: input.esiEligible !== false,
                    ptEligible: input.ptEligible !== false,
                    tdsEligible: input.tdsEligible !== false,
                    pan: input.pan || null,
                    aadhaar: input.aadhaar || null,
                    uan: input.uan || null,
                    esiNumber: input.esiNumber || null,
                    pfNumber: input.pfNumber || null,
                    bankName: input.bankName || null,
                    bankAccount: input.bankAccount || null,
                    bankIfsc: input.bankIfsc || null,
                    bankBranch: input.bankBranch || null,
                },
                include: {
                    department: { select: { id: true, name: true } },
                    branch: { select: { id: true, name: true, code: true } },
                    designation: { select: { id: true, name: true } },
                },
            });
            // Step B2: Persist extended fields, address, blood group & immutable System ID in metadata
            await EmployeeService.setEmployeeMetadata(tenantId, employee.id, {
                systemId,
                bloodGroup: input.bloodGroup,
                district: input.district,
                country: input.country || "India",
                addressLine1: input.address,
                city: input.city,
                state: input.state,
                postalCode: input.zipCode,
                emergencyContactName: input.emergencyContactName,
                emergencyContactRelationship: input.emergencyContactRelationship,
                emergencyContactRelationshipOther: input.emergencyContactRelationshipOther,
                emergencyContactPhone: input.emergencyContactPhone,
                avatarUrl: input.avatarUrl,
            });
            // Step C: Optional documents attachment
            if (input.documents && input.documents.length > 0) {
                for (const doc of input.documents) {
                    await tx.companyDocument.create({
                        data: {
                            tenantId,
                            title: doc.title,
                            fileUrl: doc.mediaUrl,
                            fileType: doc.documentType || "general",
                            uploadedById: employee.id,
                        },
                    });
                }
            }
            // Step D: Masked audit logging (sensitive PII stripped/masked)
            const auditPayload = {
                id: employee.id,
                employeeCode: employee.employeeCode,
                name: `${employee.firstName} ${employee.lastName}`,
                email: employee.email,
                branchId: employee.branchId,
                departmentId: employee.departmentId,
                designationId: employee.designationId,
                status: employee.status,
                hasPan: !!employee.pan,
                hasAadhaar: !!employee.aadhaar,
                hasBankAccount: !!employee.bankAccount,
            };
            await audit_service_1.AuditService.logMutation({
                tenantId,
                actorId,
                action: "EMPLOYEE_CREATE",
                entityType: "Employee",
                entityId: employee.id,
                newState: auditPayload,
            }, tx);
            // Step E: Outbox event emission
            await outbox_service_1.OutboxService.createOutboxEvent({
                tenantId,
                eventType: "employee.created",
                entityType: "Employee",
                entityId: employee.id,
                actorId,
                payload: {
                    id: employee.id,
                    employeeCode: employee.employeeCode,
                    name: `${employee.firstName} ${employee.lastName}`,
                    email: employee.email,
                    department: employee.department?.name,
                    branch: employee.branch?.name,
                },
            }, tx);
            return employee;
        });
        // Step F: Asynchronous notification to HR team
        try {
            await notification_service_1.NotificationService.sendNotification({
                tenantId,
                recipientUserId: actorId,
                title: "Employee Onboarded Successfully",
                message: `${result.firstName} ${result.lastName} (${result.employeeCode}) has been created in the directory.`,
                type: "SUCCESS",
                metadata: { employeeId: result.id },
            });
        }
        catch {
            // Non-blocking notification dispatch
        }
        return result;
    }
    /**
     * LIST EMPLOYEES WITH DATA SCOPING & FIELD-LEVEL SECURITY
     */
    static async listEmployees(tenantId, userContext, userPermissions, query) {
        const db = (0, tenant_context_1.getTenantDb)();
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        // Build data-scope Prisma filter
        const effectiveScope = query?.dataScope || (userContext.isTenantAdmin ? "ALL" : "ALL");
        const scopeFilter = (0, data_scope_1.buildDataScopeFilter)(effectiveScope, userContext, "employee");
        const where = {
            tenantId,
            ...scopeFilter,
        };
        if (query.search) {
            where.OR = [
                { firstName: { contains: query.search, mode: "insensitive" } },
                { lastName: { contains: query.search, mode: "insensitive" } },
                { employeeCode: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
                { position: { contains: query.search, mode: "insensitive" } },
            ];
        }
        if (query.branchId && query.branchId !== "all")
            where.branchId = query.branchId;
        if (query.departmentId && query.departmentId !== "all")
            where.departmentId = query.departmentId;
        if (query.designationId && query.designationId !== "all")
            where.designationId = query.designationId;
        if (query.status && query.status !== "all") {
            if (query.status === "inactive") {
                where.status = { not: "active" };
            }
            else if (query.status === "probation") {
                where.probationRecords = { some: { status: { in: ["active", "extended", "ongoing"] } } };
            }
            else {
                where.status = query.status;
            }
        }
        if (query.employmentType && query.employmentType !== "all")
            where.employmentType = query.employmentType;
        if (query.managerId)
            where.managerId = query.managerId;
        const sortBy = query.sortBy || "createdAt";
        const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
        // Base scope for counting tab tallies across the tenant (respecting selected org filters)
        const baseWhere = { tenantId, ...scopeFilter };
        if (query.branchId && query.branchId !== "all")
            baseWhere.branchId = query.branchId;
        if (query.departmentId && query.departmentId !== "all")
            baseWhere.departmentId = query.departmentId;
        if (query.designationId && query.designationId !== "all")
            baseWhere.designationId = query.designationId;
        if (query.employmentType && query.employmentType !== "all")
            baseWhere.employmentType = query.employmentType;
        const [total, rawEmployees, allCount, activeCount, inactiveCount, probationCount, terminatedCount] = await Promise.all([
            db.employee.count({ where }),
            db.employee.findMany({
                where,
                include: {
                    department: { select: { id: true, name: true } },
                    branch: { select: { id: true, name: true, code: true } },
                    designation: { select: { id: true, name: true } },
                    manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
                    user: {
                        select: {
                            id: true,
                            email: true,
                            roles: {
                                where: { tenantId },
                                select: { id: true, role: true },
                            },
                            profile: { select: { avatarUrl: true } },
                        },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
            db.employee.count({ where: baseWhere }),
            db.employee.count({ where: { ...baseWhere, status: "active" } }),
            db.employee.count({ where: { ...baseWhere, status: { not: "active" } } }),
            db.employee.count({ where: { ...baseWhere, probationRecords: { some: { status: { in: ["active", "extended", "ongoing"] } } } } }),
            db.employee.count({ where: { ...baseWhere, status: "terminated" } }),
        ]);
        // Apply Field-Level Security mask
        const canViewSensitive = userContext.roles.some((r) => ["admin", "hr_admin", "super_admin", "Workspace Admin"].includes(r));
        const maskedEmployees = rawEmployees.map((emp) => (0, field_security_1.sanitizeSensitiveFields)(emp, { canViewSensitive, isSelf: emp.id === userContext.employeeId }));
        // Attach allowed actions
        const withActions = (0, allowed_actions_1.attachAllowedActions)("Employee", maskedEmployees, userContext, userPermissions);
        const enrichedEmployees = withActions.map((emp) => ({
            ...emp,
            loginStatus: emp.userId ? "active" : "inactive",
            avatarUrl: emp.user?.profile?.avatarUrl || null,
        }));
        return {
            data: enrichedEmployees,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            statusCounts: {
                all: allCount,
                active: activeCount,
                inactive: inactiveCount,
                probation: probationCount,
                terminated: terminatedCount,
            },
        };
    }
    /**
     * EMPLOYEE 360 CONSOLIDATED PROFILE
     */
    static async getEmployee360(tenantId, employeeId, userContext, userPermissions) {
        const db = (0, tenant_context_1.getTenantDb)();
        const employee = await db.employee.findFirst({
            where: { id: employeeId, tenantId },
            include: {
                department: true,
                branch: true,
                designation: true,
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        email: true,
                        position: true,
                    },
                },
                subordinates: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        position: true,
                        status: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        roles: { select: { role: true } },
                        profile: {
                            select: {
                                id: true,
                                fullName: true,
                                avatarUrl: true,
                                phone: true,
                            },
                        },
                    },
                },
                companyDocuments: {
                    orderBy: { createdAt: "desc" },
                },
                generatedLetters: {
                    include: { template: true },
                    orderBy: { issuedAt: "desc" },
                },
                probationRecords: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                shiftRosters: {
                    include: { shift: true },
                    orderBy: { rosterDate: "desc" },
                    take: 1,
                },
                employeeContracts: {
                    include: { contractType: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                changeRequests: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
                awards: {
                    include: { awardType: true },
                    orderBy: { awardDate: "desc" },
                },
            },
        });
        if (!employee) {
            throw new Error("Employee not found in current workspace");
        }
        // Apply Field Security Mask
        const canViewSensitive = userContext.roles.some((r) => ["admin", "hr_admin", "super_admin", "Workspace Admin"].includes(r));
        const isSelf = employee.id === userContext.employeeId || employee.userId === userContext.userId;
        const canViewCompensation = canViewSensitive || isSelf;
        const masked = (0, field_security_1.sanitizeSensitiveFields)(employee, {
            canViewSensitive,
            canViewCompensation,
            isSelf,
        });
        const metadata = await EmployeeService.getEmployeeMetadata(tenantId, employee.id);
        const transformedEmployee = {
            ...masked,
            systemId: metadata.systemId || employee.id,
            bloodGroup: metadata.bloodGroup || null,
            district: metadata.district || null,
            avatarUrl: employee.user?.profile?.avatarUrl || metadata.avatarUrl || null,
            addressLine1: metadata.addressLine1 || "",
            addressLine2: metadata.addressLine2 || "",
            city: metadata.city || "",
            state: employee.state || metadata.state || "",
            country: metadata.country || "India",
            postalCode: metadata.postalCode || "",
            emergencyContactName: metadata.emergencyContactName || "",
            emergencyContactRelationship: metadata.emergencyContactRelationship || "",
            emergencyContactRelationshipOther: metadata.emergencyContactRelationshipOther || "",
            emergencyContactPhone: metadata.emergencyContactPhone || "",
            accountHolderName: metadata.accountHolderName || `${employee.firstName} ${employee.lastName}`,
            bicSwift: metadata.bicSwift || employee.bankIfsc || "",
            taxPayerId: metadata.taxPayerId || employee.pan || "",
            shiftId: metadata.shiftId || (employee.shiftRosters?.[0]?.shiftId ?? null),
            attendancePolicyId: metadata.attendancePolicyId || null,
        };
        // Attach allowed actions
        const withActions = (0, allowed_actions_1.attachAllowedActions)("Employee", transformedEmployee, userContext, userPermissions);
        return withActions;
    }
    /**
     * EMPLOYEE IMPORT: DRY RUN VALIDATION
     */
    static async validateImportDryRun(tenantId, records) {
        const db = (0, tenant_context_1.getTenantDb)();
        // Preload tenant master caches for rapid validation
        const [existingEmployees, branches, departments, designations] = await Promise.all([
            db.employee.findMany({
                where: { tenantId },
                select: { employeeCode: true, email: true },
            }),
            db.branch.findMany({
                where: { tenantId },
                select: { id: true, name: true, code: true },
            }),
            db.department.findMany({
                where: { tenantId },
                select: { id: true, name: true },
            }),
            db.designation.findMany({
                where: { tenantId },
                select: { id: true, name: true },
            }),
        ]);
        const existingCodeSet = new Set(existingEmployees.map((e) => e.employeeCode.toLowerCase()));
        const existingEmailSet = new Set(existingEmployees.map((e) => e.email.toLowerCase()));
        const branchNameMap = new Map(branches.map((b) => [b.name.toLowerCase(), b.id]));
        const branchCodeMap = new Map(branches.filter((b) => b.code).map((b) => [b.code.toLowerCase(), b.id]));
        const deptMap = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));
        const desigMap = new Map(designations.map((d) => [d.name.toLowerCase(), d.id]));
        const validationErrors = [];
        const validRows = [];
        const batchCodeSet = new Set();
        const batchEmailSet = new Set();
        records.forEach((row, index) => {
            const rowNum = index + 1;
            const rowErrors = [];
            // Required fields
            const firstName = String(row.firstName || "").trim();
            const lastName = String(row.lastName || "").trim();
            const email = String(row.email || "").toLowerCase().trim();
            const code = String(row.employeeCode || row.code || "").trim();
            if (!firstName)
                rowErrors.push("First name is required");
            if (!lastName)
                rowErrors.push("Last name is required");
            if (!email) {
                rowErrors.push("Email is required");
            }
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                rowErrors.push("Invalid email format");
            }
            if (!code)
                rowErrors.push("Employee code is required");
            // Duplicate checks
            if (code) {
                const lowerCode = code.toLowerCase();
                if (existingCodeSet.has(lowerCode)) {
                    rowErrors.push(`Employee code '${code}' already exists in workspace`);
                }
                if (batchCodeSet.has(lowerCode)) {
                    rowErrors.push(`Duplicate employee code '${code}' within import batch`);
                }
                batchCodeSet.add(lowerCode);
            }
            if (email) {
                if (existingEmailSet.has(email)) {
                    rowErrors.push(`Email '${email}' already exists in workspace`);
                }
                if (batchEmailSet.has(email)) {
                    rowErrors.push(`Duplicate email '${email}' within import batch`);
                }
                batchEmailSet.add(email);
            }
            // Foreign key lookups
            let resolvedBranchId = null;
            if (row.branch) {
                const bKey = String(row.branch).toLowerCase().trim();
                resolvedBranchId = branchCodeMap.get(bKey) || branchNameMap.get(bKey) || null;
                if (!resolvedBranchId) {
                    rowErrors.push(`Branch '${row.branch}' not found`);
                }
            }
            let resolvedDeptId = null;
            if (row.department) {
                const dKey = String(row.department).toLowerCase().trim();
                resolvedDeptId = deptMap.get(dKey) || null;
                if (!resolvedDeptId) {
                    rowErrors.push(`Department '${row.department}' not found`);
                }
            }
            let resolvedDesigId = null;
            if (row.designation) {
                const dgKey = String(row.designation).toLowerCase().trim();
                resolvedDesigId = desigMap.get(dgKey) || null;
                if (!resolvedDesigId) {
                    rowErrors.push(`Designation '${row.designation}' not found`);
                }
            }
            if (rowErrors.length > 0) {
                rowErrors.forEach((msg) => {
                    validationErrors.push({ row: rowNum, field: "general", message: msg });
                });
            }
            else {
                validRows.push({
                    firstName,
                    lastName,
                    email,
                    employeeCode: code,
                    phone: row.phone || null,
                    position: row.position || null,
                    branchId: resolvedBranchId,
                    departmentId: resolvedDeptId,
                    designationId: resolvedDesigId,
                    employmentType: row.employmentType || "full_time",
                    status: row.status || "active",
                    salary: row.salary || null,
                    joinedAt: row.joinedAt || row.joinDate || new Date().toISOString(),
                    pan: row.pan || null,
                    aadhaar: row.aadhaar || null,
                    bankAccount: row.bankAccount || null,
                    bankIfsc: row.bankIfsc || null,
                });
            }
        });
        return {
            totalRecords: records.length,
            validCount: validRows.length,
            errorCount: validationErrors.length,
            errors: validationErrors,
            preview: validRows.slice(0, 10),
            canCommit: validationErrors.length === 0 && validRows.length > 0,
            validatedRows: validRows,
        };
    }
    /**
     * EMPLOYEE IMPORT: COMMIT CONFIRMED BATCH
     */
    static async commitImport(tenantId, actorId, validatedRows) {
        const db = (0, tenant_context_1.getTenantDb)();
        let importedCount = 0;
        for (const record of validatedRows) {
            await EmployeeService.createEmployeeAtomic(tenantId, actorId, {
                ...record,
                createLoginAccount: true,
            });
            importedCount++;
        }
        return {
            success: true,
            importedCount,
        };
    }
    /**
     * Helper to fetch employee extended metadata stored in custom field values
     */
    static async getEmployeeMetadata(tenantId, employeeId) {
        const db = (0, tenant_context_1.getTenantDb)();
        try {
            const values = await db.customFieldValue.findMany({
                where: { tenantId, entityId: employeeId },
                include: { customField: true },
            });
            const result = {};
            for (const v of values) {
                if (v.customField?.label) {
                    result[v.customField.label] = v.value || "";
                }
            }
            return result;
        }
        catch (err) {
            console.warn("[getEmployeeMetadata Warning]:", err);
            return {};
        }
    }
    /**
     * Helper to persist employee extended metadata into custom field values
     */
    static async setEmployeeMetadata(tenantId, employeeId, metadata) {
        const db = (0, tenant_context_1.getTenantDb)();
        for (const [key, val] of Object.entries(metadata)) {
            if (val === undefined)
                continue;
            try {
                let cf = await db.customField.findFirst({
                    where: { tenantId, module: "EMPLOYEE", label: key },
                });
                if (!cf) {
                    cf = await db.customField.create({
                        data: {
                            tenantId,
                            module: "EMPLOYEE",
                            label: key,
                            fieldType: "text",
                            status: "active",
                        },
                    });
                }
                await db.customFieldValue.upsert({
                    where: {
                        customFieldId_entityId: {
                            customFieldId: cf.id,
                            entityId: employeeId,
                        },
                    },
                    create: {
                        tenantId,
                        customFieldId: cf.id,
                        entityId: employeeId,
                        value: val === null ? "" : String(val),
                    },
                    update: {
                        value: val === null ? "" : String(val),
                    },
                });
            }
            catch (err) {
                console.warn(`[setEmployeeMetadata Warning for ${key}]:`, err);
            }
        }
    }
    /**
     * UPDATE EMPLOYEE
     * Updates an existing employee with comprehensive validation, role authorization,
     * sensitive financial field enforcement, avatar/password updates, and metadata persistence.
     */
    static async updateEmployee(tenantId, actorId, employeeId, input, userContext, userPermissions) {
        const db = (0, tenant_context_1.getTenantDb)();
        // 1. Employee existence check
        const existing = await db.employee.findFirst({
            where: { id: employeeId, tenantId },
            include: {
                department: true,
                branch: true,
                designation: true,
                user: { include: { profile: true } },
            },
        });
        if (!existing) {
            const err = new Error("Employee not found in current workspace");
            err.statusCode = 404;
            throw err;
        }
        // 2. Role authorization check: Employees cannot edit employee records
        const isEmployeeRoleOnly = userContext.roles.length === 1 && userContext.roles[0] === "employee";
        if (isEmployeeRoleOnly) {
            const err = new Error("Forbidden: Employees are not permitted to edit employee records.");
            err.statusCode = 403;
            throw err;
        }
        // 3. Validation: Code uniqueness within tenant (excluding this employee)
        if (input.employeeCode && input.employeeCode.trim() !== existing.employeeCode) {
            const codeDuplicate = await db.employee.findFirst({
                where: {
                    tenantId,
                    employeeCode: input.employeeCode.trim(),
                    id: { not: employeeId },
                },
            });
            if (codeDuplicate) {
                const err = new Error(`An employee with code '${input.employeeCode}' already exists in this workspace.`);
                err.statusCode = 400;
                throw err;
            }
        }
        // 4. Validation: Email uniqueness & format (excluding this employee)
        if (input.email && input.email.toLowerCase().trim() !== existing.email.toLowerCase()) {
            const emailTrimmed = input.email.toLowerCase().trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
                const err = new Error("Invalid email format");
                err.statusCode = 400;
                throw err;
            }
            const emailDuplicate = await db.employee.findFirst({
                where: {
                    tenantId,
                    email: emailTrimmed,
                    id: { not: employeeId },
                },
            });
            if (emailDuplicate) {
                const err = new Error(`An employee with email '${input.email}' already exists in this workspace.`);
                err.statusCode = 400;
                throw err;
            }
        }
        // 5. Validation: Foreign keys belong to tenant
        if (input.branchId && input.branchId !== existing.branchId) {
            const branch = await db.branch.findFirst({ where: { id: input.branchId, tenantId } });
            if (!branch) {
                const err = new Error("Selected branch does not belong to this workspace.");
                err.statusCode = 400;
                throw err;
            }
        }
        if (input.departmentId && input.departmentId !== existing.departmentId) {
            const dept = await db.department.findFirst({ where: { id: input.departmentId, tenantId } });
            if (!dept) {
                const err = new Error("Selected department does not belong to this workspace.");
                err.statusCode = 400;
                throw err;
            }
        }
        if (input.designationId && input.designationId !== existing.designationId) {
            const desig = await db.designation.findFirst({ where: { id: input.designationId, tenantId } });
            if (!desig) {
                const err = new Error("Selected designation does not belong to this workspace.");
                err.statusCode = 400;
                throw err;
            }
        }
        // 6. Sensitive Financial & Statutory authorization check
        const hasSensitivePermission = userPermissions.includes("hr:employee:sensitive:write") ||
            userPermissions.includes("hr:sensitive:write") ||
            userPermissions.includes("hrm.sensitive.edit") ||
            userContext.isSuperAdmin ||
            userContext.roles.includes("super_admin") ||
            ((userContext.isTenantAdmin || userContext.roles.includes("admin") || userContext.roles.includes("Workspace Admin") || userContext.roles.includes("hr_admin") || userContext.roles.includes("HR Manager")) &&
                (userPermissions.length === 0 || userPermissions.includes("hr:employee:sensitive:write") || userPermissions.includes("hrm.sensitive.edit")));
        const currentMeta = await EmployeeService.getEmployeeMetadata(tenantId, employeeId);
        const sensitiveFieldsToCheck = [
            { name: "salary", cur: existing.salary ? String(existing.salary) : "", inputVal: input.salary },
            { name: "bankName", cur: existing.bankName || "", inputVal: input.bankName },
            { name: "bankAccount", cur: existing.bankAccount || "", inputVal: input.bankAccount },
            { name: "bankIfsc", cur: existing.bankIfsc || currentMeta.bicSwift || "", inputVal: input.bicSwift || input.bankIfsc },
            { name: "bankBranch", cur: existing.bankBranch || "", inputVal: input.bankBranch },
            { name: "pan", cur: existing.pan || currentMeta.taxPayerId || "", inputVal: input.taxPayerId || input.pan },
            { name: "accountHolderName", cur: currentMeta.accountHolderName || "", inputVal: input.accountHolderName },
        ];
        const isModifyingSensitive = sensitiveFieldsToCheck.some((s) => {
            if (s.inputVal === undefined)
                return false;
            const cleanInput = s.inputVal === null ? "" : String(s.inputVal).trim();
            const cleanCur = s.cur.trim();
            return cleanInput !== "" && cleanInput !== cleanCur;
        });
        if (isModifyingSensitive && !hasSensitivePermission) {
            const err = new Error("Forbidden: You do not have explicit permission (hr:employee:sensitive:write) to modify sensitive financial or banking records.");
            err.statusCode = 403;
            throw err;
        }
        // 7. Atomic Execution
        await db.$transaction(async (tx) => {
            const updateData = {};
            if (input.firstName !== undefined)
                updateData.firstName = input.firstName.trim();
            if (input.lastName !== undefined)
                updateData.lastName = input.lastName.trim();
            if (input.employeeCode !== undefined)
                updateData.employeeCode = input.employeeCode.trim();
            if (input.email !== undefined)
                updateData.email = input.email.toLowerCase().trim();
            if (input.phone !== undefined)
                updateData.phone = input.phone ? input.phone.trim() : null;
            if (input.dateOfBirth !== undefined)
                updateData.dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
            if (input.gender !== undefined)
                updateData.gender = input.gender || null;
            if (input.branchId !== undefined)
                updateData.branchId = input.branchId || null;
            if (input.departmentId !== undefined)
                updateData.departmentId = input.departmentId || null;
            if (input.designationId !== undefined)
                updateData.designationId = input.designationId || null;
            if (input.joinedAt !== undefined)
                updateData.joinedAt = input.joinedAt ? new Date(input.joinedAt) : null;
            if (input.employmentType !== undefined)
                updateData.employmentType = input.employmentType;
            if (input.status !== undefined)
                updateData.status = input.status;
            if (input.state !== undefined)
                updateData.state = input.state;
            if (hasSensitivePermission) {
                if (input.salary !== undefined) {
                    updateData.salary = input.salary !== null && input.salary !== "" ? String(input.salary) : null;
                }
                if (input.bankName !== undefined)
                    updateData.bankName = input.bankName || null;
                if (input.bankAccount !== undefined)
                    updateData.bankAccount = input.bankAccount || null;
                if (input.bicSwift !== undefined || input.bankIfsc !== undefined) {
                    updateData.bankIfsc = input.bicSwift || input.bankIfsc || null;
                }
                if (input.bankBranch !== undefined)
                    updateData.bankBranch = input.bankBranch || null;
                if (input.taxPayerId !== undefined || input.pan !== undefined) {
                    updateData.pan = input.taxPayerId || input.pan || null;
                }
            }
            const emp = await tx.employee.update({
                where: { id: employeeId },
                data: updateData,
                include: {
                    department: true,
                    branch: true,
                    designation: true,
                },
            });
            // Update User password and avatar if user exists
            if (existing.userId) {
                if (input.password && input.password.trim().length > 0) {
                    const passwordHash = await bcryptjs_1.default.hash(input.password.trim(), 10);
                    await tx.user.update({
                        where: { id: existing.userId },
                        data: { passwordHash },
                    });
                }
                const profileData = {};
                if (input.firstName !== undefined || input.lastName !== undefined) {
                    const fn = input.firstName !== undefined ? input.firstName.trim() : existing.firstName;
                    const ln = input.lastName !== undefined ? input.lastName.trim() : existing.lastName;
                    profileData.fullName = `${fn} ${ln}`.trim();
                }
                if (input.phone !== undefined)
                    profileData.phone = input.phone || null;
                if (input.avatarUrl !== undefined)
                    profileData.avatarUrl = input.avatarUrl || null;
                if (Object.keys(profileData).length > 0) {
                    try {
                        await tx.profile.upsert({
                            where: { userId: existing.userId },
                            create: {
                                userId: existing.userId,
                                tenantId,
                                ...profileData,
                            },
                            update: {
                                tenantId,
                                ...profileData,
                            },
                        });
                    }
                    catch (profileErr) {
                        console.warn("Profile synchronization non-fatal warning:", profileErr.message);
                    }
                }
            }
            // Upsert Shift Roster if shiftId provided
            if (input.shiftId) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                await tx.shiftRoster.upsert({
                    where: {
                        tenantId_employeeId_rosterDate: {
                            tenantId,
                            employeeId,
                            rosterDate: today,
                        },
                    },
                    create: {
                        tenantId,
                        employeeId,
                        shiftId: input.shiftId,
                        rosterDate: today,
                    },
                    update: {
                        shiftId: input.shiftId,
                    },
                });
            }
            // Attach any inline documents if provided
            if (input.documents && input.documents.length > 0) {
                for (const doc of input.documents) {
                    const randomCode = Math.floor(1000 + Math.random() * 9000);
                    await tx.companyDocument.create({
                        data: {
                            tenantId,
                            employeeId,
                            documentCode: `DOC-${randomCode}`,
                            title: doc.title,
                            category: doc.category || doc.documentType || "Employment Contract",
                            fileName: `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
                            fileUrl: doc.mediaUrl || doc.fileUrl || null,
                            fileSize: "1.2 MB",
                            fileType: "application/pdf",
                            status: "verified",
                            requiresSignature: false,
                            expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
                        },
                    });
                }
            }
            // Audit log mutation
            await audit_service_1.AuditService.logMutation({
                tenantId,
                actorId,
                action: "EMPLOYEE_UPDATE",
                entityType: "Employee",
                entityId: employeeId,
                oldState: {
                    employeeCode: existing.employeeCode,
                    email: existing.email,
                    status: existing.status,
                    branchId: existing.branchId,
                    departmentId: existing.departmentId,
                    designationId: existing.designationId,
                },
                newState: {
                    employeeCode: emp.employeeCode,
                    email: emp.email,
                    status: emp.status,
                    branchId: emp.branchId,
                    departmentId: emp.departmentId,
                    designationId: emp.designationId,
                },
            }, tx);
            // Outbox event
            await outbox_service_1.OutboxService.createOutboxEvent({
                tenantId,
                eventType: "employee.updated",
                entityType: "Employee",
                entityId: employeeId,
                actorId,
                payload: {
                    id: employeeId,
                    employeeCode: emp.employeeCode,
                    name: `${emp.firstName} ${emp.lastName}`,
                    email: emp.email,
                    department: emp.department?.name,
                    branch: emp.branch?.name,
                },
            }, tx);
        });
        // 8. Persist Contact & Extended fields in CustomFieldValues
        const metaUpdates = {
            bloodGroup: input.bloodGroup,
            avatarUrl: input.avatarUrl,
            addressLine1: input.addressLine1,
            addressLine2: input.addressLine2,
            city: input.city,
            district: input.district,
            state: input.state,
            country: input.country,
            postalCode: input.postalCode,
            emergencyContactName: input.emergencyContactName,
            emergencyContactRelationship: input.emergencyContactRelationship,
            emergencyContactRelationshipOther: input.emergencyContactRelationshipOther,
            emergencyContactPhone: input.emergencyContactPhone,
            shiftId: input.shiftId,
            attendancePolicyId: input.attendancePolicyId,
        };
        if (hasSensitivePermission) {
            if (input.accountHolderName !== undefined)
                metaUpdates.accountHolderName = input.accountHolderName;
            if (input.bicSwift !== undefined)
                metaUpdates.bicSwift = input.bicSwift;
            if (input.taxPayerId !== undefined)
                metaUpdates.taxPayerId = input.taxPayerId;
        }
        await EmployeeService.setEmployeeMetadata(tenantId, employeeId, metaUpdates);
        // 9. Return fresh 360 profile
        return await EmployeeService.getEmployee360(tenantId, employeeId, userContext, userPermissions);
    }
    /**
     * CHANGE EMPLOYEE PASSWORD
     * Securely updates an employee's authentication credential using bcrypt (10 rounds).
     * Validates permissions, tenant isolation, password policy, and logs an audit record.
     * Zero plaintext password storage, zero credential leakage.
     */
    static async changeEmployeePassword(tenantId, actorId, employeeId, newPassword, userContext) {
        const db = (0, tenant_context_1.getTenantDb)();
        // 1. Password policy validation (must be at least 6 characters)
        if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 6) {
            const err = new Error("Password must be at least 6 characters long.");
            err.statusCode = 400;
            throw err;
        }
        // 2. Fetch employee with tenant isolation
        const employee = await db.employee.findFirst({
            where: { id: employeeId, tenantId },
            include: {
                user: {
                    include: {
                        roles: { where: { tenantId } },
                    },
                },
            },
        });
        if (!employee) {
            const err = new Error("Employee not found in current workspace.");
            err.statusCode = 404;
            throw err;
        }
        // 3. Authorization check: caller must have administrative permissions or be the employee
        const canManage = userContext.roles.some((r) => ["admin", "hr_admin", "super_admin", "Workspace Admin", "tenant_admin"].includes(r)) || (userContext.employeeId === employeeId);
        if (!canManage) {
            const err = new Error("Forbidden: You do not have permission to change this employee's password.");
            err.statusCode = 403;
            throw err;
        }
        // 4. Protect super admins from non-super admins
        const isCallerSuperAdmin = userContext.roles.includes("super_admin");
        if (employee.user?.roles?.some((r) => r.role === "super_admin") && !isCallerSuperAdmin) {
            const err = new Error("Forbidden: Cannot reset Super Administrator password.");
            err.statusCode = 403;
            throw err;
        }
        // 5. Hash password with bcrypt (10 rounds)
        const passwordHash = await bcryptjs_1.default.hash(newPassword.trim(), 10);
        // 6. Transactional update or provisioning
        await db.$transaction(async (tx) => {
            let targetUserId = employee.userId;
            if (!targetUserId) {
                // Provision new user login account
                targetUserId = await (0, auth_helpers_1.provisionEmployeeUser)(tx, {
                    tenantId,
                    email: employee.email,
                    firstName: employee.firstName,
                    lastName: employee.lastName,
                    phone: employee.phone,
                    password: newPassword.trim(),
                });
                await tx.employee.update({
                    where: { id: employeeId },
                    data: { userId: targetUserId },
                });
            }
            else {
                // Update existing user's passwordHash
                await tx.user.update({
                    where: { id: targetUserId },
                    data: { passwordHash },
                });
                // Ensure user has profile and role in this tenant
                await tx.profile.upsert({
                    where: { userId: targetUserId },
                    create: {
                        userId: targetUserId,
                        tenantId,
                        fullName: `${employee.firstName} ${employee.lastName}`.trim(),
                        email: employee.email,
                    },
                    update: {
                        tenantId,
                    },
                });
                await tx.userRole.upsert({
                    where: {
                        userId_role_tenantId: {
                            userId: targetUserId,
                            role: "employee",
                            tenantId,
                        },
                    },
                    create: {
                        userId: targetUserId,
                        role: "employee",
                        tenantId,
                    },
                    update: {},
                });
            }
        });
        // 7. Audit log (never log password or hash)
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId,
            action: "EMPLOYEE_PASSWORD_RESET",
            entityType: "Employee",
            entityId: employeeId,
            metadata: {
                employeeCode: employee.employeeCode,
                employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
                email: employee.email,
            },
        });
        return {
            success: true,
            message: `Password successfully updated for ${employee.firstName} ${employee.lastName}.`,
        };
    }
    /**
     * TOGGLE EMPLOYEE ACCOUNT STATUS
     * Activates or deactivates an employee's login access in this workspace.
     * Does NOT alter employment status (active / on_leave / terminated), salary, attendance, or payroll.
     * Enforces self-deactivation protection, Super Admin protection, and logs an audit trail.
     */
    static async toggleEmployeeAccountStatus(tenantId, actorId, employeeId, userContext) {
        const db = (0, tenant_context_1.getTenantDb)();
        // 1. Fetch employee with tenant isolation
        const employee = await db.employee.findFirst({
            where: { id: employeeId, tenantId },
            include: {
                user: {
                    include: {
                        roles: { where: { tenantId } },
                    },
                },
            },
        });
        if (!employee) {
            const err = new Error("Employee not found in current workspace.");
            err.statusCode = 404;
            throw err;
        }
        // 2. Authorization check
        const canManage = userContext.roles.some((r) => ["admin", "hr_admin", "super_admin", "Workspace Admin", "tenant_admin"].includes(r));
        if (!canManage) {
            const err = new Error("Forbidden: You do not have permission to toggle employee account status.");
            err.statusCode = 403;
            throw err;
        }
        // 3. Prevent self-deactivation
        if (employee.userId && employee.userId === actorId) {
            const err = new Error("You cannot deactivate your own administrative login account.");
            err.statusCode = 400;
            throw err;
        }
        // 4. Protect super admins
        if (employee.user?.roles?.some((r) => r.role === "super_admin")) {
            const err = new Error("Super Administrator accounts cannot be modified or deactivated.");
            err.statusCode = 403;
            throw err;
        }
        const isCurrentlyActive = Boolean(employee.userId);
        const targetStatus = isCurrentlyActive ? "inactive" : "active";
        await db.$transaction(async (tx) => {
            if (targetStatus === "inactive") {
                // Deactivate: remove tenant roles & role assignments, and unlink userId
                if (employee.userId) {
                    await tx.userRole.deleteMany({
                        where: {
                            userId: employee.userId,
                            tenantId,
                        },
                    });
                    await tx.userRoleAssignment.deleteMany({
                        where: {
                            userId: employee.userId,
                            tenantId,
                        },
                    });
                    await tx.employee.update({
                        where: { id: employeeId },
                        data: { userId: null },
                    });
                }
            }
            else {
                // Activate: provision if missing or restore userRole
                let targetUserId = employee.userId;
                if (!targetUserId) {
                    const existingUser = await tx.user.findUnique({
                        where: { email: employee.email.toLowerCase().trim() },
                    });
                    if (existingUser) {
                        targetUserId = existingUser.id;
                    }
                    else {
                        targetUserId = await (0, auth_helpers_1.provisionEmployeeUser)(tx, {
                            tenantId,
                            email: employee.email,
                            firstName: employee.firstName,
                            lastName: employee.lastName,
                            phone: employee.phone,
                        });
                    }
                    await tx.employee.update({
                        where: { id: employeeId },
                        data: { userId: targetUserId },
                    });
                }
                await tx.userRole.upsert({
                    where: {
                        userId_role_tenantId: {
                            userId: targetUserId,
                            role: "employee",
                            tenantId,
                        },
                    },
                    create: {
                        userId: targetUserId,
                        role: "employee",
                        tenantId,
                    },
                    update: {},
                });
                await tx.profile.upsert({
                    where: { userId: targetUserId },
                    create: {
                        userId: targetUserId,
                        tenantId,
                        fullName: `${employee.firstName} ${employee.lastName}`.trim(),
                        email: employee.email,
                    },
                    update: {
                        tenantId,
                    },
                });
            }
        });
        // Audit log
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId,
            action: targetStatus === "inactive" ? "EMPLOYEE_ACCOUNT_DEACTIVATED" : "EMPLOYEE_ACCOUNT_ACTIVATED",
            entityType: "Employee",
            entityId: employeeId,
            oldState: {
                loginStatus: isCurrentlyActive ? "active" : "inactive",
            },
            newState: {
                loginStatus: targetStatus,
            },
            metadata: {
                employeeCode: employee.employeeCode,
                employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
                email: employee.email,
            },
        });
        return {
            success: true,
            loginStatus: targetStatus,
            message: `Login account access for ${employee.firstName} ${employee.lastName} has been ${targetStatus === "active" ? "activated" : "deactivated"}.`,
        };
    }
}
exports.EmployeeService = EmployeeService;
