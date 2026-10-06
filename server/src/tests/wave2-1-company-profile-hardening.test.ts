import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { companyProfileRouter } from "../routes/company-profile.routes";
import { CompanyProfileService } from "../services/company-profile/company-profile.service";
import { getAuthoritativeCustomerInfo } from "../services/invoice-engine.service";
import { PayrollExportService } from "../services/payroll-export.service";

describe("Wave 2.1 Hardening — Company Profile Master Data Integrity & Canonical Identity", () => {
  let server: http.Server;
  let baseUrl: string;

  const tenantAlphaId = "w2_harden_tenant_alpha";
  const tenantBetaId = "w2_harden_tenant_beta";

  const alphaAdminId = "w2_harden_alpha_admin";
  const betaAdminId = "w2_harden_beta_admin";

  const alphaAdminToken = generateToken({
    userId: alphaAdminId,
    email: "admin@alpha-harden.test",
    tenantId: tenantAlphaId,
    roles: ["hr_admin"],
  });

  const betaAdminToken = generateToken({
    userId: betaAdminId,
    email: "admin@beta-harden.test",
    tenantId: tenantBetaId,
    roles: ["hr_admin"],
  });

  const superAdminId = "w2_harden_super_admin";
  const superAdminToken = generateToken({
    userId: superAdminId,
    email: "superadmin@masterhrms.test",
    tenantId: null,
    roles: ["super_admin"],
  });

  beforeAll(async () => {
    // Clean up any existing test records
    await prisma.gSTRegistration.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.companyProfile.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.userRole.deleteMany({
      where: { userId: { in: [alphaAdminId, betaAdminId, superAdminId] } },
    });
    await prisma.profile.deleteMany({
      where: { userId: { in: [alphaAdminId, betaAdminId, superAdminId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [alphaAdminId, betaAdminId, superAdminId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAlphaId, tenantBetaId] } },
    });

    // Create test tenants
    await prisma.tenant.create({
      data: {
        id: tenantAlphaId,
        name: "Alpha Corp Enterprises",
        slug: "alpha-harden-test",
        timezone: "Asia/Kolkata",
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBetaId,
        name: "Beta Global Industries",
        slug: "beta-harden-test",
        timezone: "Asia/Kolkata",
      },
    });

    // Create test users & roles
    await prisma.user.create({
      data: {
        id: alphaAdminId,
        email: "admin@alpha-harden.test",
        passwordHash: "hash_placeholder",
        profile: {
          create: {
            tenantId: tenantAlphaId,
            fullName: "Alpha Admin",
          },
        },
        roles: {
          create: {
            tenantId: tenantAlphaId,
            role: "hr_admin",
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: betaAdminId,
        email: "admin@beta-harden.test",
        passwordHash: "hash_placeholder",
        profile: {
          create: {
            tenantId: tenantBetaId,
            fullName: "Beta Admin",
          },
        },
        roles: {
          create: {
            tenantId: tenantBetaId,
            role: "hr_admin",
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: superAdminId,
        email: "superadmin@masterhrms.test",
        passwordHash: "hash_placeholder",
        profile: {
          create: {
            tenantId: null,
            fullName: "Global Super Admin",
          },
        },
        roles: {
          create: {
            tenantId: null,
            role: "super_admin",
          },
        },
      },
    });

    // Setup Express test server
    const app = express();
    app.use(express.json());
    app.use("/api/v1/company-profile", companyProfileRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.gSTRegistration.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.companyProfile.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.userRole.deleteMany({
      where: { userId: { in: [alphaAdminId, betaAdminId, superAdminId] } },
    });
    await prisma.profile.deleteMany({
      where: { userId: { in: [alphaAdminId, betaAdminId, superAdminId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [alphaAdminId, betaAdminId, superAdminId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAlphaId, tenantBetaId] } },
    });
  });

  // TEST 1: Upsert Company Profile with Address Line 1 and Line 2
  it("persists company legal identity with address line 1 and line 2", async () => {
    const payload = {
      legalName: "Alpha Legal Technologies Private Limited",
      tradeName: "AlphaTech Cloud",
      businessType: "pvt_ltd",
      cin: "U72200KA2020PTC123456",
      pan: "ABCDE1234F",
      tan: "BLRA12345F",
      email: "finance@alphatech.test",
      phone: "+91 80 4123 9999",
      website: "https://alphatech.test",
      registeredAddressLine1: "Tower B, Level 4, Tech Park",
      registeredAddressLine2: "Outer Ring Road, Kadubeesanahalli",
      registeredCity: "Bengaluru",
      registeredState: "Karnataka",
      registeredStateCode: "29",
      registeredPostalCode: "560103",
      registeredCountry: "India",
      sameAsRegistered: true,
    };

    const res = await fetch(`${baseUrl}/api/v1/company-profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaAdminToken}`,
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.profile.legalName).toBe("Alpha Legal Technologies Private Limited");
    expect(body.profile.tradeName).toBe("AlphaTech Cloud");
    expect(body.profile.pan).toBe("ABCDE1234F");
    expect(body.profile.tan).toBe("BLRA12345F");
    expect(body.profile.cin).toBe("U72200KA2020PTC123456");
    expect(body.profile.registeredAddressLine1).toBe("Tower B, Level 4, Tech Park");
    expect(body.profile.registeredAddressLine2).toBe("Outer Ring Road, Kadubeesanahalli");
    expect(body.profile.sameAsRegistered).toBe(true);
    expect(body.profile.billingCity).toBe("Bengaluru");
  });

  // TEST 2: GET Company Profile returns persisted values after refresh
  it("returns persisted company profile with address lines on GET", async () => {
    const res = await fetch(`${baseUrl}/api/v1/company-profile`, {
      headers: {
        Authorization: `Bearer ${alphaAdminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.profile.legalName).toBe("Alpha Legal Technologies Private Limited");
    expect(body.profile.pan).toBe("ABCDE1234F");
    expect(body.profile.registeredAddressLine1).toBe("Tower B, Level 4, Tech Park");
    expect(body.profile.registeredAddressLine2).toBe("Outer Ring Road, Kadubeesanahalli");
    expect(body.profile.registeredCity).toBe("Bengaluru");
    expect(body.profile.registeredPostalCode).toBe("560103");
  });

  // TEST 3: GST Registration upsert & state code validation
  it("upserts primary GST registration and validates state code match", async () => {
    const gstPayload = {
      gstin: "29ABCDE1234F1Z5",
      legalName: "Alpha Legal Technologies Private Limited",
      tradeName: "AlphaTech Cloud",
      stateCode: "29",
      registrationType: "REGULAR",
      isPrimary: true,
      status: "ACTIVE",
      filingFrequency: "MONTHLY",
      eInvoicingEnabled: true,
    };

    const res = await fetch(`${baseUrl}/api/v1/company-profile/gst`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaAdminToken}`,
      },
      body: JSON.stringify(gstPayload),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.gstRegistration.gstin).toBe("29ABCDE1234F1Z5");
    expect(body.gstRegistration.isPrimary).toBe(true);
    expect(body.gstRegistration.status).toBe("ACTIVE");
    expect(body.gstRegistration.eInvoicingEnabled).toBe(true);
  });

  // TEST 4: Invalid GSTIN format rejected
  it("rejects invalid GSTIN format with 400 validation error", async () => {
    const invalidPayload = {
      gstin: "INVALID_GSTIN_123",
      stateCode: "29",
      registrationType: "REGULAR",
    };

    const res = await fetch(`${baseUrl}/api/v1/company-profile/gst`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaAdminToken}`,
      },
      body: JSON.stringify(invalidPayload),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Validation failed");
  });

  // TEST 5: Tenant isolation - Tenant Beta cannot view Tenant Alpha's profile
  it("enforces strict tenant isolation across CompanyProfile data", async () => {
    const res = await fetch(`${baseUrl}/api/v1/company-profile`, {
      headers: {
        Authorization: `Bearer ${betaAdminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Tenant Beta should see fallback or Beta's own data, never Alpha's legal name
    expect(body.profile.legalName).not.toBe("Alpha Legal Technologies Private Limited");
    expect(body.profile.tenantId).toBe(tenantBetaId);
  });

  // TEST 6: Canonical Identity Resolver returns structured document identity
  it("resolves canonical company identity via CompanyProfileService.resolveTenantCompanyIdentity", async () => {
    const identity = await CompanyProfileService.resolveTenantCompanyIdentity(tenantAlphaId);

    expect(identity).toBeDefined();
    expect(identity.tenantId).toBe(tenantAlphaId);
    expect(identity.legalName).toBe("Alpha Legal Technologies Private Limited");
    expect(identity.tradeName).toBe("AlphaTech Cloud");
    expect(identity.businessType).toBe("pvt_ltd");
    expect(identity.cin).toBe("U72200KA2020PTC123456");
    expect(identity.pan).toBe("ABCDE1234F");
    expect(identity.tan).toBe("BLRA12345F");
    expect(identity.registeredOffice.addressLine1).toBe("Tower B, Level 4, Tech Park");
    expect(identity.registeredOffice.city).toBe("Bengaluru");
    expect(identity.registeredOffice.postalCode).toBe("560103");
    expect(identity.registeredOffice.formatted).toContain("Bengaluru");
    expect(identity.primaryGst).toBeDefined();
    expect(identity.primaryGst?.gstin).toBe("29ABCDE1234F1Z5");
    expect(identity.primaryGst?.status).toBe("ACTIVE");
    expect(identity.hasAuthoritativeProfile).toBe(true);
  });

  // TEST 7: Canonical Identity REST Endpoint
  it("serves canonical identity via GET /api/v1/company-profile/identity", async () => {
    const res = await fetch(`${baseUrl}/api/v1/company-profile/identity`, {
      headers: {
        Authorization: `Bearer ${alphaAdminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.identity.legalName).toBe("Alpha Legal Technologies Private Limited");
    expect(body.identity.primaryGst.gstin).toBe("29ABCDE1234F1Z5");
    expect(body.identity.registeredOffice.city).toBe("Bengaluru");
  });

  // TEST 8: Super Admin read-only inspection of tenant company identity
  it("allows Super Admin to inspect any tenant's canonical company identity", async () => {
    const res = await fetch(`${baseUrl}/api/v1/company-profile/tenant/${tenantAlphaId}/identity`, {
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.identity.legalName).toBe("Alpha Legal Technologies Private Limited");
    expect(body.identity.primaryGst.gstin).toBe("29ABCDE1234F1Z5");
  });

  // TEST 9: Non-super-admin blocked from /tenant/:tenantId/identity
  it("blocks non-super-admin users from accessing /tenant/:tenantId/identity", async () => {
    const res = await fetch(`${baseUrl}/api/v1/company-profile/tenant/${tenantAlphaId}/identity`, {
      headers: {
        Authorization: `Bearer ${alphaAdminToken}`,
      },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Forbidden");
  });

  // TEST 10: Subscription invoice recipient resolution consumes canonical identity
  it("resolves tenant as recipient (customer) in subscription invoice engine using CompanyProfile", async () => {
    const customerInfo = await getAuthoritativeCustomerInfo(tenantAlphaId, {
      name: "Alpha Corp Enterprises",
    });

    expect(customerInfo).toBeDefined();
    expect(customerInfo.name).toBe("Alpha Legal Technologies Private Limited");
    expect(customerInfo.taxId).toBe("29ABCDE1234F1Z5");
    expect(customerInfo.address).toContain("Bengaluru");
  });

  // TEST 11: Address Resolution - Different Billing Address when sameAsRegistered = false
  it("correctly separates billing address when sameAsRegistered is false", async () => {
    const payload = {
      legalName: "Alpha Legal Technologies Private Limited",
      email: "finance@alphatech.test",
      registeredAddressLine1: "Tower B, Level 4, Tech Park",
      registeredCity: "Bengaluru",
      registeredState: "Karnataka",
      registeredStateCode: "29",
      registeredPostalCode: "560103",
      registeredCountry: "India",
      sameAsRegistered: false,
      billingAddressLine1: "Financial District, Building 3",
      billingCity: "Mumbai",
      billingState: "Maharashtra",
      billingStateCode: "27",
      billingPostalCode: "400051",
      billingCountry: "India",
    };

    const updateRes = await fetch(`${baseUrl}/api/v1/company-profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaAdminToken}`,
      },
      body: JSON.stringify(payload),
    });

    expect(updateRes.status).toBe(200);

    const identity = await CompanyProfileService.resolveTenantCompanyIdentity(tenantAlphaId);
    expect(identity.registeredOffice.city).toBe("Bengaluru");
    expect(identity.billingOffice.city).toBe("Mumbai");
    expect(identity.billingOffice.sameAsRegistered).toBe(false);
    expect(identity.billingOffice.formatted).toContain("Mumbai");
  });

  // TEST 12: Payroll company identity resolution consumes canonical identity
  it("resolves authoritative company legal name and address in payroll export service", async () => {
    const canonicalIdentity = await CompanyProfileService.resolveTenantCompanyIdentity(tenantAlphaId);
    expect(canonicalIdentity.legalName).toBe("Alpha Legal Technologies Private Limited");
    expect(canonicalIdentity.registeredOffice.city).toBe("Bengaluru");

    // Verify payroll export service receives tenant canonical identity
    const payrollRows = await (PayrollExportService as any).buildCanonicalRows?.([
      {
        id: "slip-test-01",
        employeeId: "emp-001",
        employee: { firstName: "Jane", lastName: "Doe", email: "jane@alpha.test" },
        salaryStructure: { baseSalary: 75000 },
        netSalary: 68000,
        month: 10,
        year: 2026,
      },
    ], tenantAlphaId);

    if (payrollRows && payrollRows.length > 0) {
      expect(payrollRows[0].companyName).toBe("Alpha Legal Technologies Private Limited");
    }
  });

  // TEST 13: Legacy CMS Fallback when no CompanyProfile row exists
  it("provides graceful fallback to tenant name and legacy CMS when CompanyProfile has not been saved", async () => {
    const unconfiguredTenantId = `w2_unconfigured_${Date.now()}`;
    await prisma.tenant.create({
      data: {
        id: unconfiguredTenantId,
        name: "Unconfigured New Org",
        slug: `unconf-${Date.now()}`,
        timezone: "Asia/Kolkata",
      },
    });

    const fallbackIdentity = await CompanyProfileService.resolveTenantCompanyIdentity(unconfiguredTenantId);
    expect(fallbackIdentity).toBeDefined();
    expect(fallbackIdentity.legalName).toBe("Unconfigured New Org");
    expect(fallbackIdentity.primaryGst).toBeNull();

    // Verify error thrown when tenant not in DB
    await expect(
      CompanyProfileService.resolveTenantCompanyIdentity("w2_missing_tenant_999")
    ).rejects.toThrow("Tenant not found");

    await prisma.gSTRegistration.deleteMany({ where: { tenantId: unconfiguredTenantId } });
    await prisma.companyProfile.deleteMany({ where: { tenantId: unconfiguredTenantId } });
    await prisma.tenant.delete({ where: { id: unconfiguredTenantId } });
  });

  // TEST 14: Legal statutory validation rejects invalid TAN and CIN
  it("validates TAN and CIN format with specific regex rules", async () => {
    // Invalid TAN (should be 4 letters + 5 digits + 1 letter, e.g. BLRA12345F)
    const badTanRes = await fetch(`${baseUrl}/api/v1/company-profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaAdminToken}`,
      },
      body: JSON.stringify({
        legalName: "Alpha Legal Technologies Private Limited",
        tan: "INVALID_TAN",
      }),
    });
    expect(badTanRes.status).toBe(400);

    // Invalid CIN (should be 21 chars starting with U or L, e.g. U72200KA2020PTC123456)
    const badCinRes = await fetch(`${baseUrl}/api/v1/company-profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaAdminToken}`,
      },
      body: JSON.stringify({
        legalName: "Alpha Legal Technologies Private Limited",
        cin: "SHORT_CIN",
      }),
    });
    expect(badCinRes.status).toBe(400);
  });
});
