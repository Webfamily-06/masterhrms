import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, rawPrisma } from "../prisma";
import { SettingsService } from "../services/settings/settings.service";
import { resolveBranding, BrandingResolverService, toAbsoluteUrl } from "../services/branding/branding-resolver.service";
import { MediaService } from "../services/media/media.service";
import { getDynamicEmailConfig, sendTwoFactorOtpEmail, sendSubscriptionLifecycleEmail, sendPaymentConfirmationEmail } from "../lib/email";
import { getAuthoritativeSupplierInfo, getAuthoritativeCustomerInfo } from "../services/invoice-engine.service";
import { generateInvoicePdf, InvoicePdfData } from "../services/invoice-pdf.service";

describe("PART 22: Global White-Label Brand Identity Across Output Systems", () => {
  const db = rawPrisma || prisma;
  const testTenantAId = `test-wl-tenant-a-${Date.now()}`;
  const testTenantBId = `test-wl-tenant-b-${Date.now()}`;
  let platformLogoMedia: any = null;
  let tenantALogoMedia: any = null;
  let platformFaviconMedia: any = null;

  beforeAll(async () => {
    // 1. Create Test Tenants
    await db.tenant.createMany({
      data: [
        {
          id: testTenantAId,
          name: "Acme Enterprises Corp",
          slug: `acme-${Date.now()}`,
        },
        {
          id: testTenantBId,
          name: "Beta Logistics Ltd",
          slug: `beta-${Date.now()}`,
        },
      ],
    });

    // 2. Upload sample media assets for Platform and Tenant A
    const dummyPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    platformLogoMedia = await MediaService.uploadMedia(dummyPng, "platform-logo.png", {
      mimeType: "image/png",
      uploadedBy: "superadmin",
    });

    platformFaviconMedia = await MediaService.uploadMedia(dummyPng, "platform-favicon.png", {
      mimeType: "image/png",
      uploadedBy: "superadmin",
    });

    tenantALogoMedia = await MediaService.uploadMedia(dummyPng, "tenant-a-logo.png", {
      mimeType: "image/png",
      uploadedBy: "tenant-a-admin",
      tenantId: testTenantAId,
    });
  });

  afterAll(async () => {
    // Cleanup settings
    await db.settingAudit.deleteMany({
      where: { scopeId: { in: ["global", testTenantAId, testTenantBId] } },
    });
    await db.mediaUsage.deleteMany({
      where: { mediaId: { in: [platformLogoMedia?.id, platformFaviconMedia?.id, tenantALogoMedia?.id].filter(Boolean) } },
    });
    await db.setting.deleteMany({
      where: { scopeId: { in: ["global", testTenantAId, testTenantBId] } },
    });
    // Cleanup media
    const mediaIds = [platformLogoMedia?.id, platformFaviconMedia?.id, tenantALogoMedia?.id].filter(Boolean);
    if (mediaIds.length > 0) {
      await db.mediaFile.deleteMany({ where: { id: { in: mediaIds } } });
    }
    // Cleanup tenants
    await db.tenant.deleteMany({
      where: { id: { in: [testTenantAId, testTenantBId] } },
    });
  });

  it("TEST 1: Branding Resolver provides unified single source of truth without secret leaks", async () => {
    // Configure Platform default branding
    await SettingsService.setGroup("PLATFORM", null, "branding", {
      "branding.app_name": "Master HRMS Global Platform",
      "branding.primary_color": "#4F46E5",
      "branding.support_email": "platform-help@masterhrms.io",
      "branding.logo_light_id": platformLogoMedia.id,
      "branding.favicon_id": platformFaviconMedia.id,
      "branding.footer_text": "© 2026 Master HRMS Global Platform. All rights reserved.",
    });

    const platformBranding = await resolveBranding({ scope: "PLATFORM" });

    expect(platformBranding.scope).toBe("PLATFORM");
    expect(platformBranding.tenantId).toBeNull();
    expect(platformBranding.appName).toBe("Master HRMS Global Platform");
    expect(platformBranding.primaryColor).toBe("#4F46E5");
    expect(platformBranding.supportEmail).toBe("platform-help@masterhrms.io");
    expect(platformBranding.logoLightUrl).toBe(platformLogoMedia.url);
    expect(platformBranding.faviconUrl).toBe(platformFaviconMedia.url);
    expect(platformBranding.footerText).toBe("© 2026 Master HRMS Global Platform. All rights reserved.");

    // Critical Security Check: Ensure NO secrets or password material leak
    expect((platformBranding as any).secret).toBeUndefined();
    expect((platformBranding as any).ciphertext).toBeUndefined();
    expect((platformBranding as any).apiKey).toBeUndefined();
    expect((platformBranding as any).smtpPass).toBeUndefined();
  });

  it("TEST 2: Per-key inheritance - Tenant A partial override vs Tenant B platform inheritance", async () => {
    // Tenant A customizes: logo and primary color ONLY (inherits app_name, favicon, footer from Platform)
    await SettingsService.setGroup("TENANT", testTenantAId, "branding", {
      "branding.logo_light_id": tenantALogoMedia.id,
      "branding.primary_color": "#059669", // Emerald green
    });

    // Tenant B has NO custom overrides configured
    const brandingTenantA = await resolveBranding({ scope: "TENANT", tenantId: testTenantAId });
    const brandingTenantB = await resolveBranding({ scope: "TENANT", tenantId: testTenantBId });

    // Tenant A assertions:
    expect(brandingTenantA.scope).toBe("TENANT");
    expect(brandingTenantA.tenantId).toBe(testTenantAId);
    expect(brandingTenantA.logoLightUrl).toBe(tenantALogoMedia.url); // CUSTOM
    expect(brandingTenantA.primaryColor).toBe("#059669"); // CUSTOM
    expect(brandingTenantA.faviconUrl).toBe(platformFaviconMedia.url); // INHERITED FROM PLATFORM
    expect(brandingTenantA.footerText).toBe("© 2026 Master HRMS Global Platform. All rights reserved."); // INHERITED
    expect(brandingTenantA.isWhiteLabeled).toBe(true);

    // Tenant B assertions:
    expect(brandingTenantB.scope).toBe("TENANT");
    expect(brandingTenantB.tenantId).toBe(testTenantBId);
    expect(brandingTenantB.logoLightUrl).toBe(platformLogoMedia.url); // INHERITED FROM PLATFORM
    expect(brandingTenantB.primaryColor).toBe("#4F46E5"); // INHERITED FROM PLATFORM
    expect(brandingTenantB.faviconUrl).toBe(platformFaviconMedia.url); // INHERITED FROM PLATFORM
  });

  it("TEST 3: Email templates resolve branding strictly from tenant context of business event", async () => {
    // 1. Email for Tenant A event (e.g. employee welcome or 2FA OTP)
    const emailConfigTenantA = await getDynamicEmailConfig({ scope: "TENANT", tenantId: testTenantAId });
    expect(emailConfigTenantA.logoUrl).toContain(tenantALogoMedia.url);

    // 2. Email for Tenant B event (no override -> inherits platform logo)
    const emailConfigTenantB = await getDynamicEmailConfig({ scope: "TENANT", tenantId: testTenantBId });
    expect(emailConfigTenantB.logoUrl).toContain(platformLogoMedia.url);

    // 3. Super Admin platform-wide announcement / maintenance email (scope: PLATFORM)
    const emailConfigPlatform = await getDynamicEmailConfig({ scope: "PLATFORM" });
    expect(emailConfigPlatform.appName).toBe("Master HRMS Global Platform");
    expect(emailConfigPlatform.logoUrl).toContain(platformLogoMedia.url);
    expect(emailConfigPlatform.logoUrl).not.toContain(tenantALogoMedia.url);
  });

  it("TEST 4: Headless background job / worker resolves branding without browser dependencies", async () => {
    // Simulate background worker without DOM / window
    const jobPayload = {
      tenantId: testTenantAId,
      jobType: "subscription_reminder_worker",
    };

    // Worker invokes resolver directly
    const branding = await resolveBranding({ scope: "TENANT", tenantId: jobPayload.tenantId });
    expect(branding.appName).toBeDefined();
    expect(branding.primaryColor).toBe("#059669");
    expect(branding.logoLightUrl).toBe(tenantALogoMedia.url);
    expect(branding.absoluteLogoLightUrl).toMatch(/^https?:\/\//);
  });

  it("TEST 5: Invoice Engine consumes resolved branding for supplier & customer", async () => {
    // Platform billing invoice: supplier is PLATFORM
    const supplierInfo = await getAuthoritativeSupplierInfo({ scope: "PLATFORM" });
    expect(supplierInfo.name).toBe("Master HRMS Global Platform");
    expect(supplierInfo.email).toBe("platform-help@masterhrms.io");
    expect(supplierInfo.primaryColor).toBe("#4F46E5");

    // Customer info resolved for Tenant A
    const customerInfo = await getAuthoritativeCustomerInfo(testTenantAId, { name: "Acme Enterprises Corp" });
    expect(customerInfo.name).toBeDefined();
    expect(customerInfo.branding).toBeDefined();
    expect(customerInfo.branding.primaryColor).toBe("#059669");

    // Generate PDF with resolved branding
    const invoicePdfData: InvoicePdfData = {
      invoiceNo: "INV-PART22-001",
      classification: "TAX INVOICE",
      status: "PAID",
      issueDate: "05 Oct 2026",
      supplier: {
        name: supplierInfo.name,
        address: supplierInfo.address,
        email: supplierInfo.email,
        phone: supplierInfo.phone,
        gstin: supplierInfo.gstin,
        primaryColor: supplierInfo.primaryColor,
      },
      customer: {
        name: customerInfo.name,
        email: "billing@acme.com",
      },
      payment: {
        gateway: "Razorpay",
        currency: "INR",
      },
      items: [
        {
          description: "Enterprise SaaS Tier Plan",
          quantity: 1,
          unitPrice: 5000,
          taxableAmount: 5000,
          taxAmount: 900,
          totalAmount: 5900,
        },
      ],
      subtotal: 5000,
      discount: 0,
      tax: 900,
      total: 5900,
      currency: "INR",
    };

    const pdfBuffer = await generateInvoicePdf(invoicePdfData);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // PDF Magic bytes check
    expect(pdfBuffer.slice(0, 4).toString("utf-8")).toBe("%PDF");
  });

  it("TEST 6: No split-brain branding - Resetting tenant override immediately restores platform values", async () => {
    // Tenant A clears primary_color override (reverts to platform)
    await SettingsService.setGroup("TENANT", testTenantAId, "branding", {
      "branding.primary_color": null, // Reset override
    });

    const reverted = await resolveBranding({ scope: "TENANT", tenantId: testTenantAId });
    // Primary color should now fall back to Platform's #4F46E5
    expect(reverted.primaryColor).toBe("#4F46E5");
    // While custom logo remains
    expect(reverted.logoLightUrl).toBe(tenantALogoMedia.url);
  });
});
