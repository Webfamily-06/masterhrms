"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrDocumentsRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const document_service_js_1 = require("../services/document.service.js");
const contract_lifecycle_service_js_1 = require("../services/contract-lifecycle.service.js");
exports.hrDocumentsRouter = (0, express_1.Router)();
// Categories
exports.hrDocumentsRouter.get("/categories", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const categories = await document_service_js_1.documentService.listCategories(tenantId, {
            search: req.query.search,
        });
        return res.json(categories);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.post("/categories", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const cat = await document_service_js_1.documentService.createCategory(tenantId, req.body);
        return res.status(201).json(cat);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.put("/categories/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const cat = await document_service_js_1.documentService.updateCategory(tenantId, req.params.id, req.body);
        return res.json(cat);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.delete("/categories/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const result = await document_service_js_1.documentService.deleteCategory(tenantId, req.params.id);
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Templates
exports.hrDocumentsRouter.get("/templates", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const templates = await document_service_js_1.documentService.listTemplates(tenantId, {
            type: req.query.type,
            category: req.query.category,
            search: req.query.search,
        });
        return res.json(templates);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.get("/templates/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const template = await document_service_js_1.documentService.getTemplate(tenantId, req.params.id);
        return res.json(template);
    }
    catch (err) {
        return res.status(404).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.post("/templates", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const template = await document_service_js_1.documentService.createTemplate(tenantId, req.body);
        return res.status(201).json(template);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.put("/templates/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const template = await document_service_js_1.documentService.updateTemplate(tenantId, req.params.id, req.body);
        return res.json(template);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.delete("/templates/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const result = await document_service_js_1.documentService.deleteTemplate(tenantId, req.params.id);
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Documents Vault (Company Documents)
exports.hrDocumentsRouter.get("/", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const docs = await document_service_js_1.documentService.listDocuments(tenantId, {
            category: req.query.category,
            status: req.query.status,
            employeeId: req.query.employeeId,
            search: req.query.search,
        });
        return res.json(docs);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.post("/", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const doc = await document_service_js_1.documentService.createDocument(tenantId, req.body);
        return res.status(201).json(doc);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.get("/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const doc = await document_service_js_1.documentService.getDocument(tenantId, req.params.id);
        return res.json(doc);
    }
    catch (err) {
        return res.status(404).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.put("/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const updated = await document_service_js_1.documentService.updateDocument(tenantId, req.params.id, req.body);
        return res.json(updated);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.delete("/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const result = await document_service_js_1.documentService.deleteDocument(tenantId, req.params.id);
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Contract Types
exports.hrDocumentsRouter.get("/contract-types", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const types = await document_service_js_1.documentService.listContractTypes(tenantId);
        return res.json(types);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.post("/contract-types", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const type = await document_service_js_1.documentService.createContractType(tenantId, req.body);
        return res.status(201).json(type);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.put("/contract-types/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const type = await document_service_js_1.documentService.updateContractType(tenantId, req.params.id, req.body);
        return res.json(type);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.delete("/contract-types/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const result = await document_service_js_1.documentService.deleteContractType(tenantId, req.params.id);
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Employee Contracts Settings
exports.hrDocumentsRouter.get("/contracts/vendors", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const suppliers = await prisma_js_1.rawPrisma.supplier.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                gstin: true,
                email: true,
                phone: true,
                city: true,
            },
            orderBy: { name: "asc" },
        });
        return res.json(suppliers);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.get("/contracts/settings", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const settings = await contract_lifecycle_service_js_1.ContractLifecycleService.getTenantExpirySettings(tenantId);
        return res.json(settings);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.put("/contracts/settings", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const settings = await contract_lifecycle_service_js_1.ContractLifecycleService.updateTenantExpirySettings(tenantId, req.body, actorId);
        return res.json(settings);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Employee Contracts
exports.hrDocumentsRouter.get("/contracts/overview", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const overview = await contract_lifecycle_service_js_1.ContractLifecycleService.getContractOverview(tenantId);
        return res.json(overview);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.get("/contracts", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const contracts = await document_service_js_1.documentService.listContracts(tenantId, {
            employeeId: req.query.employeeId,
            status: req.query.status,
            contractTypeId: req.query.contractTypeId,
            category: req.query.category,
            paymentWorkflow: req.query.paymentWorkflow,
            supplierId: req.query.supplierId,
        });
        const now = new Date();
        const settings = await contract_lifecycle_service_js_1.ContractLifecycleService.getTenantExpirySettings(tenantId);
        const evaluated = contracts.map((c) => {
            const cls = contract_lifecycle_service_js_1.ContractLifecycleService.classifyContract(c, now, settings.reminderIntervals);
            return {
                ...c,
                classification: cls.classification,
                daysRemaining: cls.daysRemaining,
                isExpired: cls.isExpired,
                isExpiringSoon: cls.isExpiringSoon,
                stage: cls.stage,
            };
        });
        return res.json(evaluated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.post("/contracts", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const contract = await document_service_js_1.documentService.createContract(tenantId, req.body);
        return res.status(201).json(contract);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// POST /contracts/:id/renew (Contract Renewal Lifecycle)
exports.hrDocumentsRouter.post("/contracts/:id/renew", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const result = await contract_lifecycle_service_js_1.ContractLifecycleService.renewContract({
            tenantId,
            actorUserId: actorId,
            predecessorId: req.params.id,
            renewal: req.body,
        });
        return res.status(201).json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// POST /contracts/:id/convert (Convert to Permanent Employment)
exports.hrDocumentsRouter.post("/contracts/:id/convert", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const result = await contract_lifecycle_service_js_1.ContractLifecycleService.convertContractToPermanent({
            tenantId,
            contractId: req.params.id,
            actorUserId: actorId,
            salary: req.body.salary,
            notes: req.body.notes,
        });
        return res.status(200).json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// POST /contracts/:id/amend (Amend Active Contract)
exports.hrDocumentsRouter.post("/contracts/:id/amend", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const result = await contract_lifecycle_service_js_1.ContractLifecycleService.amendContract({
            tenantId,
            contractId: req.params.id,
            actorUserId: actorId,
            amendment: req.body,
        });
        return res.status(200).json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// POST /contracts/:id/terminate (Terminate Contract)
exports.hrDocumentsRouter.post("/contracts/:id/terminate", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const result = await contract_lifecycle_service_js_1.ContractLifecycleService.terminateContract({
            tenantId,
            contractId: req.params.id,
            actorUserId: actorId,
            reason: req.body.reason,
        });
        return res.status(200).json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// POST /contracts/:id/payable-voucher (Workflow B: Accounts Payable Purchase Voucher)
exports.hrDocumentsRouter.post("/contracts/:id/payable-voucher", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const { period, amount, invoiceNumber, notes } = req.body;
        if (!period || amount === undefined) {
            return res.status(400).json({ error: "Billing period and amount are required." });
        }
        const voucher = await contract_lifecycle_service_js_1.ContractLifecycleService.createVendorPayableVoucher({
            tenantId,
            contractId: req.params.id,
            period,
            amount: Number(amount),
            invoiceNumber,
            notes,
            actorUserId: actorId,
        });
        return res.status(201).json(voucher);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.get("/contracts/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const contract = await document_service_js_1.documentService.getContract(tenantId, req.params.id);
        return res.json(contract);
    }
    catch (err) {
        return res.status(404).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.put("/contracts/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const updated = await document_service_js_1.documentService.updateContract(tenantId, req.params.id, req.body);
        return res.json(updated);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.delete("/contracts/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const result = await document_service_js_1.documentService.deleteContract(tenantId, req.params.id);
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Acknowledgements (Sign-off Campaigns)
exports.hrDocumentsRouter.get("/acknowledgements", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const acks = await document_service_js_1.documentService.listAcknowledgements(tenantId, {
            documentId: req.query.documentId,
            status: req.query.status,
        });
        return res.json(acks);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.post("/acknowledgements/campaign", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const campaign = await document_service_js_1.documentService.createCampaign(tenantId, req.body);
        return res.status(201).json(campaign);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Letters Center
exports.hrDocumentsRouter.get("/letters", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const letters = await document_service_js_1.documentService.listGeneratedLetters(tenantId, {
            employeeId: req.query.employeeId,
            letterType: req.query.letterType,
            search: req.query.search,
        });
        return res.json(letters);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.post("/letters/generate", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const issuedById = req.user?.userId;
        const letter = await document_service_js_1.documentService.generateLetter(tenantId, {
            ...req.body,
            issuedById,
        });
        return res.status(201).json(letter);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrDocumentsRouter.get("/letters/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const letter = await document_service_js_1.documentService.getGeneratedLetter(tenantId, req.params.id);
        return res.json(letter);
    }
    catch (err) {
        return res.status(404).json({ error: err.message });
    }
});
