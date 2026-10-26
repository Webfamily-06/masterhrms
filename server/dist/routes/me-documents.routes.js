"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meDocumentsRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const tenant_context_js_1 = require("../context/tenant-context.js");
const document_service_js_1 = require("../services/document.service.js");
exports.meDocumentsRouter = (0, express_1.Router)();
async function resolveEmployee(req) {
    const tenantId = req.user?.tenantId;
    const user = req.user;
    const userId = user.userId || user.id;
    const db = (0, tenant_context_js_1.getTenantDb)();
    return await db.employee.findFirst({
        where: { tenantId, userId },
    });
}
// My Company Documents (General company policies or assigned to me)
exports.meDocumentsRouter.get("/", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const db = (0, tenant_context_js_1.getTenantDb)();
        const docs = await db.companyDocument.findMany({
            where: {
                tenantId,
                OR: [
                    { employeeId: employee.id },
                    { employeeId: null }, // Company-wide policies
                ],
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(docs);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// My Contracts
exports.meDocumentsRouter.get("/contracts", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const contracts = await document_service_js_1.documentService.listContracts(tenantId, {
            employeeId: employee.id,
        });
        return res.json(contracts);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// My Acknowledgements
exports.meDocumentsRouter.get("/acknowledgements", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const acks = await document_service_js_1.documentService.listAcknowledgements(tenantId, {
            employeeId: employee.id,
        });
        return res.json(acks);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Acknowledge Policy / Document
exports.meDocumentsRouter.post("/acknowledgements/:documentId", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(403).json({ error: "Employee profile not found" });
        const ipAddress = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
        const result = await document_service_js_1.documentService.submitAcknowledgement(tenantId, employee.id, req.params.documentId, ipAddress, req.body.comments);
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// My Document / Letter Requests
exports.meDocumentsRouter.get("/requests", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const requests = await document_service_js_1.documentService.listRequests(tenantId, {
            employeeId: employee.id,
        });
        return res.json(requests);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.meDocumentsRouter.post("/requests", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(403).json({ error: "Employee profile not found" });
        const request = await document_service_js_1.documentService.createRequest(tenantId, employee.id, req.body);
        return res.status(201).json(request);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
