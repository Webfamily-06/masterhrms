"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customFieldsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
exports.customFieldsRouter = (0, express_1.Router)();
exports.customFieldsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/custom-fields - List custom fields (filtered by module if provided)
exports.customFieldsRouter.get("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { module: moduleName, status } = req.query;
        const where = { tenantId };
        if (moduleName && moduleName !== "all") {
            where.module = String(moduleName);
        }
        if (status && status !== "all") {
            where.status = String(status);
        }
        const fields = await prisma_1.prisma.customField.findMany({
            where,
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });
        res.json({
            success: true,
            data: fields,
            total: fields.length,
        });
    }
    catch (error) {
        console.error("Error fetching custom fields:", error);
        res.status(500).json({ error: error.message || "Failed to fetch custom fields" });
    }
});
// POST /api/custom-fields - Create a custom field
exports.customFieldsRouter.post("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { module: moduleName, label, fieldType, defaultValue, options, isRequired, status, sortOrder, } = req.body;
        if (!moduleName || !label || !fieldType) {
            return res.status(400).json({
                error: "module, label, and fieldType are required fields",
            });
        }
        const newField = await prisma_1.prisma.customField.create({
            data: {
                tenantId,
                module: String(moduleName).trim(),
                label: String(label).trim(),
                fieldType: String(fieldType).toLowerCase().trim(),
                defaultValue: defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : null,
                options: options ? (typeof options === "string" ? options : JSON.stringify(options)) : null,
                isRequired: Boolean(isRequired),
                status: status ? String(status).toLowerCase() : "active",
                sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
            },
        });
        res.status(201).json({
            success: true,
            message: "Custom field created successfully",
            data: newField,
        });
    }
    catch (error) {
        console.error("Error creating custom field:", error);
        res.status(500).json({ error: error.message || "Failed to create custom field" });
    }
});
// PUT /api/custom-fields/:id - Update a custom field
exports.customFieldsRouter.put("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const existing = await prisma_1.prisma.customField.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Custom field not found" });
        }
        const { module: moduleName, label, fieldType, defaultValue, options, isRequired, status, sortOrder, } = req.body;
        const updated = await prisma_1.prisma.customField.update({
            where: { id },
            data: {
                ...(moduleName && { module: String(moduleName).trim() }),
                ...(label && { label: String(label).trim() }),
                ...(fieldType && { fieldType: String(fieldType).toLowerCase().trim() }),
                ...(defaultValue !== undefined ? { defaultValue: defaultValue ? String(defaultValue) : null } : {}),
                ...(options !== undefined ? { options: options ? (typeof options === "string" ? options : JSON.stringify(options)) : null } : {}),
                ...(isRequired !== undefined && { isRequired: Boolean(isRequired) }),
                ...(status && { status: String(status).toLowerCase() }),
                ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
            },
        });
        res.json({
            success: true,
            message: "Custom field updated successfully",
            data: updated,
        });
    }
    catch (error) {
        console.error("Error updating custom field:", error);
        res.status(500).json({ error: error.message || "Failed to update custom field" });
    }
});
// DELETE /api/custom-fields/:id - Delete a custom field
exports.customFieldsRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const existing = await prisma_1.prisma.customField.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Custom field not found" });
        }
        await prisma_1.prisma.customField.delete({
            where: { id },
        });
        res.json({
            success: true,
            message: "Custom field deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting custom field:", error);
        res.status(500).json({ error: error.message || "Failed to delete custom field" });
    }
});
// GET /api/custom-fields/values/:entityId - Get values for an entity
exports.customFieldsRouter.get("/values/:entityId", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { entityId } = req.params;
        const values = await prisma_1.prisma.customFieldValue.findMany({
            where: { tenantId, entityId },
            include: {
                customField: true,
            },
        });
        res.json({
            success: true,
            data: values,
        });
    }
    catch (error) {
        console.error("Error fetching custom field values:", error);
        res.status(500).json({ error: error.message || "Failed to fetch custom field values" });
    }
});
// POST /api/custom-fields/values/:entityId - Upsert custom field values for an entity
exports.customFieldsRouter.post("/values/:entityId", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { entityId } = req.params;
        const { values } = req.body; // Array of { customFieldId, value }
        if (!Array.isArray(values)) {
            return res.status(400).json({ error: "values must be an array of { customFieldId, value }" });
        }
        const savedValues = await prisma_1.prisma.$transaction(values.map((v) => prisma_1.prisma.customFieldValue.upsert({
            where: {
                customFieldId_entityId: {
                    customFieldId: v.customFieldId,
                    entityId,
                },
            },
            create: {
                tenantId,
                customFieldId: v.customFieldId,
                entityId,
                value: v.value !== undefined && v.value !== null ? String(v.value) : null,
            },
            update: {
                value: v.value !== undefined && v.value !== null ? String(v.value) : null,
            },
        })));
        res.json({
            success: true,
            message: "Custom field values saved successfully",
            data: savedValues,
        });
    }
    catch (error) {
        console.error("Error saving custom field values:", error);
        res.status(500).json({ error: error.message || "Failed to save custom field values" });
    }
});
