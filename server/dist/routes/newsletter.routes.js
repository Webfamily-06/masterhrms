"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsletterRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const newsletter_service_1 = require("../services/newsletter.service");
exports.newsletterRouter = (0, express_1.Router)();
exports.newsletterRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/newsletter/stats
exports.newsletterRouter.get("/stats", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const stats = await newsletter_service_1.NewsletterService.getStats(tenantId);
        return res.json({ success: true, stats });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/newsletter/subscribers
exports.newsletterRouter.get("/subscribers", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { status, tag, search } = req.query;
        const subscribers = await newsletter_service_1.NewsletterService.listSubscribers(tenantId, {
            status: status,
            tag: tag,
            search: search,
        });
        return res.json({ success: true, subscribers });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/newsletter/subscribers
exports.newsletterRouter.post("/subscribers", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { email, name, tags, source } = req.body;
        if (!email || !email.includes("@")) {
            return res.status(400).json({ success: false, error: "Valid email address is required" });
        }
        const subscriber = await newsletter_service_1.NewsletterService.addSubscriber(tenantId, { email, name, tags, source });
        return res.status(201).json({ success: true, subscriber });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/newsletter/unsubscribe
exports.newsletterRouter.post("/unsubscribe", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, error: "Email address is required" });
        }
        const unsubscribed = await newsletter_service_1.NewsletterService.unsubscribe(tenantId, email);
        return res.json({ success: true, unsubscribed });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/newsletter/campaigns
exports.newsletterRouter.get("/campaigns", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { status } = req.query;
        const campaigns = await newsletter_service_1.NewsletterService.listCampaigns(tenantId, status);
        return res.json({ success: true, campaigns });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/newsletter/campaigns/:id
exports.newsletterRouter.get("/campaigns/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const campaign = await newsletter_service_1.NewsletterService.getCampaign(tenantId, req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, error: "Campaign not found" });
        }
        return res.json({ success: true, campaign });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/newsletter/campaigns
exports.newsletterRouter.post("/campaigns", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user_system";
        const { title, subject, previewText, contentHtml, targetTags, scheduledAt } = req.body;
        if (!title || !subject || !contentHtml) {
            return res.status(400).json({ success: false, error: "Title, subject, and contentHtml are required" });
        }
        const campaign = await newsletter_service_1.NewsletterService.createCampaign(tenantId, { title, subject, previewText, contentHtml, targetTags, scheduledAt }, userId);
        return res.status(201).json({ success: true, campaign });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/newsletter/campaigns/:id/send
exports.newsletterRouter.post("/campaigns/:id/send", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const campaign = await newsletter_service_1.NewsletterService.sendCampaign(tenantId, req.params.id);
        return res.json({ success: true, campaign });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
