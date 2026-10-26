"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentService = exports.DocumentService = void 0;
const tenant_context_js_1 = require("../context/tenant-context.js");
class DocumentService {
    db;
    constructor(databaseClient) {
        this.db = databaseClient;
    }
    getClient() {
        return this.db || (0, tenant_context_js_1.getTenantDb)();
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // 1. DOCUMENT CATEGORIES
    // ─────────────────────────────────────────────────────────────────────────────
    async listCategories(tenantId, options = {}) {
        const where = { tenantId };
        if (options.isActive !== undefined) {
            where.isActive = options.isActive;
        }
        if (options.search) {
            where.OR = [
                { name: { contains: options.search, mode: 'insensitive' } },
                { code: { contains: options.search, mode: 'insensitive' } },
            ];
        }
        return this.getClient().documentCategory.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    }
    async createCategory(tenantId, data) {
        const existing = await this.getClient().documentCategory.findUnique({
            where: { tenantId_code: { tenantId, code: data.code.toUpperCase() } },
        });
        if (existing) {
            throw new Error(`Document category with code ${data.code} already exists`);
        }
        return this.getClient().documentCategory.create({
            data: {
                tenantId,
                name: data.name,
                code: data.code.toUpperCase(),
                description: data.description,
                isActive: true,
            },
        });
    }
    async updateCategory(tenantId, id, data) {
        const cat = await this.getClient().documentCategory.findFirst({ where: { id, tenantId } });
        if (!cat)
            throw new Error('Document category not found');
        return this.getClient().documentCategory.update({
            where: { id },
            data,
        });
    }
    async deleteCategory(tenantId, id) {
        const cat = await this.getClient().documentCategory.findFirst({ where: { id, tenantId } });
        if (!cat)
            throw new Error('Document category not found');
        return this.getClient().documentCategory.delete({ where: { id } });
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // 2. DOCUMENT TEMPLATES
    // ─────────────────────────────────────────────────────────────────────────────
    async listTemplates(tenantId, options = {}) {
        const where = { tenantId };
        if (options.type)
            where.type = options.type;
        if (options.category)
            where.category = options.category;
        if (options.search) {
            where.OR = [
                { title: { contains: options.search, mode: 'insensitive' } },
                { code: { contains: options.search, mode: 'insensitive' } },
            ];
        }
        return this.getClient().documentTemplate.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }
    async getTemplate(tenantId, id) {
        const t = await this.getClient().documentTemplate.findFirst({
            where: { id, tenantId },
        });
        if (!t)
            throw new Error('Document template not found');
        return t;
    }
    async createTemplate(tenantId, data) {
        const existing = await this.getClient().documentTemplate.findUnique({
            where: { tenantId_code: { tenantId, code: data.code.toUpperCase() } },
        });
        if (existing) {
            throw new Error(`Template with code ${data.code} already exists`);
        }
        return this.getClient().documentTemplate.create({
            data: {
                tenantId,
                title: data.title,
                code: data.code.toUpperCase(),
                category: data.category || 'General',
                type: data.type || 'letter',
                content: data.content,
                tokens: data.tokens || [
                    'employeeName',
                    'employeeCode',
                    'designation',
                    'department',
                    'joiningDate',
                    'salary',
                    'currentDate',
                    'companyName',
                ],
                isActive: true,
            },
        });
    }
    async updateTemplate(tenantId, id, data) {
        const t = await this.getClient().documentTemplate.findFirst({ where: { id, tenantId } });
        if (!t)
            throw new Error('Template not found');
        return this.getClient().documentTemplate.update({
            where: { id },
            data,
        });
    }
    async deleteTemplate(tenantId, id) {
        const t = await this.getClient().documentTemplate.findFirst({ where: { id, tenantId } });
        if (!t)
            throw new Error('Template not found');
        return this.getClient().documentTemplate.delete({ where: { id } });
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // 3. COMPANY DOCUMENTS / VAULT
    // ─────────────────────────────────────────────────────────────────────────────
    async listDocuments(tenantId, options = {}) {
        const where = { tenantId };
        if (options.category)
            where.category = options.category;
        if (options.status)
            where.status = options.status;
        if (options.employeeId)
            where.employeeId = options.employeeId;
        if (options.search) {
            where.OR = [
                { title: { contains: options.search, mode: 'insensitive' } },
                { documentCode: { contains: options.search, mode: 'insensitive' } },
                { fileName: { contains: options.search, mode: 'insensitive' } },
            ];
        }
        return this.getClient().companyDocument.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
                _count: {
                    select: { acknowledgements: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getDocument(tenantId, id) {
        const doc = await this.getClient().companyDocument.findFirst({
            where: { id, tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
                acknowledgements: {
                    include: {
                        employee: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                employeeCode: true,
                            },
                        },
                    },
                },
            },
        });
        if (!doc)
            throw new Error('Document not found');
        return doc;
    }
    async createDocument(tenantId, data) {
        const documentCode = data.documentCode || `DOC-${Date.now().toString().slice(-6)}`;
        return this.getClient().companyDocument.create({
            data: {
                tenantId,
                title: data.title,
                documentCode,
                category: data.category,
                fileUrl: data.fileUrl || '/mock/docs/sample.pdf',
                fileName: data.fileName,
                fileSize: data.fileSize || '1.2 MB',
                fileType: data.fileType || 'application/pdf',
                employeeId: data.employeeId,
                requiresSignature: data.requiresSignature ?? false,
                expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
                notes: data.notes,
                status: data.requiresSignature ? 'pending_signature' : 'verified',
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
            },
        });
    }
    async updateDocument(tenantId, id, data) {
        const doc = await this.getClient().companyDocument.findFirst({ where: { id, tenantId } });
        if (!doc)
            throw new Error('Document not found');
        const updateData = { ...data };
        if (data.expiryDate)
            updateData.expiryDate = new Date(data.expiryDate);
        return this.getClient().companyDocument.update({
            where: { id },
            data: updateData,
        });
    }
    async deleteDocument(tenantId, id) {
        const doc = await this.getClient().companyDocument.findFirst({ where: { id, tenantId } });
        if (!doc)
            throw new Error('Document not found');
        return this.getClient().companyDocument.delete({ where: { id } });
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // 4. CONTRACT TYPES & EMPLOYEE CONTRACTS
    // ─────────────────────────────────────────────────────────────────────────────
    async listContractTypes(tenantId) {
        return this.getClient().contractType.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' },
        });
    }
    async createContractType(tenantId, data) {
        return this.getClient().contractType.create({
            data: {
                tenantId,
                name: data.name,
                description: data.description,
                status: 'active',
            },
        });
    }
    async updateContractType(tenantId, id, data) {
        const ct = await this.getClient().contractType.findFirst({ where: { id, tenantId } });
        if (!ct)
            throw new Error('Contract type not found');
        return this.getClient().contractType.update({
            where: { id },
            data,
        });
    }
    async deleteContractType(tenantId, id) {
        const ct = await this.getClient().contractType.findFirst({ where: { id, tenantId } });
        if (!ct)
            throw new Error('Contract type not found');
        return this.getClient().contractType.delete({ where: { id } });
    }
    async listContracts(tenantId, options = {}) {
        const where = { tenantId };
        if (options.employeeId)
            where.employeeId = options.employeeId;
        if (options.status)
            where.status = options.status;
        if (options.contractTypeId)
            where.contractTypeId = options.contractTypeId;
        return this.getClient().employeeContract.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
                contractType: true,
            },
            orderBy: { startDate: 'desc' },
        });
    }
    async getContract(tenantId, id) {
        const c = await this.getClient().employeeContract.findFirst({
            where: { id, tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
                contractType: true,
            },
        });
        if (!c)
            throw new Error('Contract not found');
        return c;
    }
    async createContract(tenantId, data) {
        return this.getClient().employeeContract.create({
            data: {
                tenantId,
                employeeId: data.employeeId,
                contractTypeId: data.contractTypeId,
                title: data.title,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
                salary: data.salary ? Number(data.salary) : null,
                notes: data.notes,
                status: 'active',
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
                contractType: true,
            },
        });
    }
    async updateContract(tenantId, id, data) {
        const c = await this.getClient().employeeContract.findFirst({ where: { id, tenantId } });
        if (!c)
            throw new Error('Contract not found');
        const updateData = { ...data };
        if (data.startDate)
            updateData.startDate = new Date(data.startDate);
        if (data.endDate !== undefined)
            updateData.endDate = data.endDate ? new Date(data.endDate) : null;
        if (data.salary !== undefined)
            updateData.salary = data.salary ? Number(data.salary) : null;
        return this.getClient().employeeContract.update({
            where: { id },
            data: updateData,
        });
    }
    async deleteContract(tenantId, id) {
        const c = await this.getClient().employeeContract.findFirst({ where: { id, tenantId } });
        if (!c)
            throw new Error('Contract not found');
        return this.getClient().employeeContract.delete({ where: { id } });
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // 5. ACKNOWLEDGEMENTS / POLICY SIGN-OFF CAMPAIGNS
    // ─────────────────────────────────────────────────────────────────────────────
    async listAcknowledgements(tenantId, options = {}) {
        const where = { tenantId };
        if (options.documentId)
            where.documentId = options.documentId;
        if (options.employeeId)
            where.employeeId = options.employeeId;
        if (options.status)
            where.status = options.status;
        return this.getClient().documentAcknowledgement.findMany({
            where,
            include: {
                document: {
                    select: {
                        id: true,
                        title: true,
                        documentCode: true,
                        category: true,
                        fileUrl: true,
                    },
                },
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createCampaign(tenantId, data) {
        const doc = await this.getClient().companyDocument.findFirst({
            where: { id: data.documentId, tenantId },
        });
        if (!doc)
            throw new Error('Document not found');
        let targetEmployees = [];
        if (data.allEmployees) {
            const emps = await this.getClient().employee.findMany({
                where: { tenantId, status: 'active' },
                select: { id: true },
            });
            targetEmployees = emps.map((e) => e.id);
        }
        else if (data.employeeIds && data.employeeIds.length > 0) {
            targetEmployees = data.employeeIds;
        }
        if (targetEmployees.length === 0) {
            throw new Error('No employees selected for policy sign-off campaign');
        }
        // Upsert or skip existing
        let createdCount = 0;
        for (const empId of targetEmployees) {
            const existing = await this.getClient().documentAcknowledgement.findUnique({
                where: {
                    tenantId_documentId_employeeId: {
                        tenantId,
                        documentId: data.documentId,
                        employeeId: empId,
                    },
                },
            });
            if (!existing) {
                await this.getClient().documentAcknowledgement.create({
                    data: {
                        tenantId,
                        documentId: data.documentId,
                        employeeId: empId,
                        status: 'pending',
                    },
                });
                createdCount++;
            }
        }
        return {
            success: true,
            totalTargeted: targetEmployees.length,
            createdCount,
        };
    }
    async submitAcknowledgement(tenantId, employeeId, documentId, ipAddress, comments) {
        const ack = await this.getClient().documentAcknowledgement.findUnique({
            where: {
                tenantId_documentId_employeeId: {
                    tenantId,
                    documentId,
                    employeeId,
                },
            },
        });
        if (!ack) {
            throw new Error('Acknowledgement record not found for this document');
        }
        if (ack.status === 'acknowledged') {
            return ack;
        }
        return this.getClient().documentAcknowledgement.update({
            where: { id: ack.id },
            data: {
                status: 'acknowledged',
                acknowledgedAt: new Date(),
                ipAddress: ipAddress || '127.0.0.1',
                comments: comments || null,
            },
        });
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // 6. LETTERS CENTER & TOKEN MERGE
    // ─────────────────────────────────────────────────────────────────────────────
    async listGeneratedLetters(tenantId, options = {}) {
        const where = { tenantId };
        if (options.employeeId)
            where.employeeId = options.employeeId;
        if (options.letterType)
            where.letterType = options.letterType;
        if (options.search) {
            where.title = { contains: options.search, mode: 'insensitive' };
        }
        return this.getClient().generatedLetter.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
                template: {
                    select: {
                        id: true,
                        title: true,
                        code: true,
                    },
                },
            },
            orderBy: { issuedAt: 'desc' },
        });
    }
    async getGeneratedLetter(tenantId, id) {
        const letter = await this.getClient().generatedLetter.findFirst({
            where: { id, tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: true,
                        designation: true,
                        joinedAt: true,
                    },
                },
                template: true,
            },
        });
        if (!letter)
            throw new Error('Generated letter not found');
        return letter;
    }
    async generateLetter(tenantId, data) {
        const employee = await this.getClient().employee.findFirst({
            where: { id: data.employeeId, tenantId },
            include: {
                department: true,
                designation: true,
            },
        });
        if (!employee)
            throw new Error('Employee not found');
        const tenant = await this.getClient().tenant.findUnique({
            where: { id: tenantId },
            select: { name: true },
        });
        let rawTemplate = '';
        if (data.templateId) {
            const template = await this.getClient().documentTemplate.findFirst({
                where: { id: data.templateId, tenantId },
            });
            if (template) {
                rawTemplate = template.content;
            }
        }
        if (!rawTemplate) {
            // Standard fallback letter template based on letterType
            rawTemplate = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b;">
          <h2>{{companyName}}</h2>
          <hr />
          <h3>{{title}}</h3>
          <p>Date: {{currentDate}}</p>
          <p>Dear <strong>{{employeeName}}</strong> (Code: {{employeeCode}}),</p>
          <p>This is an official {{letterType}} issued to confirm your appointment/service with {{companyName}}.</p>
          <p>Designation: <strong>{{designation}}</strong></p>
          <p>Department: <strong>{{department}}</strong></p>
          <p>Date of Joining: <strong>{{joiningDate}}</strong></p>
          <br/>
          <p>Sincerely,</p>
          <p>Human Resources Team<br/>{{companyName}}</p>
        </div>
      `;
        }
        // Safe Token Replacement
        const tokens = {
            employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
            employeeCode: employee.employeeCode,
            designation: employee.designation?.name || 'Associate',
            department: employee.department?.name || 'General',
            joiningDate: employee.joinedAt ? new Date(employee.joinedAt).toLocaleDateString() : 'N/A',
            currentDate: new Date().toLocaleDateString(),
            companyName: tenant?.name || 'Enterprise HRMS',
            letterType: data.letterType,
            title: data.title,
            ...(data.customData || {}),
        };
        let contentHtml = rawTemplate;
        for (const [key, val] of Object.entries(tokens)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            contentHtml = contentHtml.replace(regex, String(val));
        }
        return this.getClient().generatedLetter.create({
            data: {
                tenantId,
                employeeId: data.employeeId,
                templateId: data.templateId || null,
                letterType: data.letterType,
                title: data.title,
                contentHtml,
                issuedById: data.issuedById,
                issuedAt: new Date(),
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
            },
        });
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // 7. EMPLOYEE DOCUMENT REQUESTS
    // ─────────────────────────────────────────────────────────────────────────────
    async listRequests(tenantId, options = {}) {
        const where = { tenantId };
        if (options.employeeId)
            where.employeeId = options.employeeId;
        if (options.status)
            where.status = options.status;
        return this.getClient().documentRequest.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createRequest(tenantId, employeeId, data) {
        return this.getClient().documentRequest.create({
            data: {
                tenantId,
                employeeId,
                letterType: data.letterType,
                purpose: data.purpose,
                status: 'PENDING',
            },
        });
    }
    async resolveRequest(tenantId, id, data) {
        const req = await this.getClient().documentRequest.findFirst({ where: { id, tenantId } });
        if (!req)
            throw new Error('Document request not found');
        return this.getClient().documentRequest.update({
            where: { id },
            data: {
                status: data.status,
                rejectionNotes: data.rejectionNotes,
                issuedMediaId: data.issuedMediaId,
                issuedAt: data.status === 'ISSUED' ? new Date() : null,
            },
        });
    }
}
exports.DocumentService = DocumentService;
exports.documentService = new DocumentService();
