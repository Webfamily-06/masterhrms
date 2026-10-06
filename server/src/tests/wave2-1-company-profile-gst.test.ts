import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { companyProfileRouter } from "../routes/company-profile.routes";
import { invoicesRouter } from "../routes/invoices.routes";
import { CompanyProfileService } from "../services/company-profile/company-profile.service";
import { SettingsService } from "../services/settings/settings.service";
import { BrandingResolverService } from "../services/branding/branding-resolver.service";

describe("Wave 2.1 — Company Profile & GST Foundation", () => {
  let server: http.Server;
  let baseUrl: string;

  const tenantAlphaId = "w2_1_tenant_alpha";
  const tenantBetaId = "w2_1_tenant_beta";

  const alphaAdminId = "w2_1_alpha_admin";
  const betaAdminId = "w2_1_beta_admin";
  const alphaEmployeeId = "w2_1_alpha_employee";

  const alphaAdminToken = generateToken({
    userId: alphaAdminId,
    email: "admin@alpha-corp.test",
    tenantId: tenantAlphaId,
    roles: ["hr_admin"],
  });

  const betaAdminToken = generateToken({
    userId: betaAdminId,
    email: "admin@beta-corp.test",
    tenantId: tenantBetaId,
    roles: ["hr_admin"],
  });

  const alphaEmployeeToken = generateToken({
    userId: alphaEmployeeId,
    email: "emp@alpha-corp.test",
    tenantId: tenantAlphaId,
    roles: ["employee"],
  });

  const superAdminId = "w2_1_super_admin";
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
    await prisma.cmsPage.deleteMany({
      where: { slug: { in: [`tenant-${tenantAlphaId}-settings`, `tenant-${tenantBetaId}-settings`] } },
    });
    await prisma.userRole.deleteMany({
      where: { userId: { in: [alphaAdminId, betaAdminId, alphaEmployeeId, superAdminId] } },
    });
    await prisma.profile.deleteMany({
      where: { userId: { in: [alphaAdminId, betaAdminId, alphaEmployeeId, superAdminId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [alphaAdminId, betaAdminId, alphaEmployeeId, superAdminId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAlphaId, tenantBetaId] } },
    });

    // 1. Create Tenants
    await prisma.tenant.create({
      data: {
        id: tenantAlphaId,
        name: "Alpha Corp Technologies",
        slug: "alpha-corp-tech",
        timezone: "Asia/Kolkata",
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBetaId,
        name: "Beta Logistics India",
        slug: "beta-logistics-in",
        timezone: "Asia/Kolkata",
      },
    });

    // 2. Create Users & Profiles
    await prisma.user.create({
      data: {
        id: alphaAdminId,
        email: "admin@alpha-corp.test",
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
        email: "admin@beta-corp.test",
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
        id: alphaEmployeeId,
        email: "emp@alpha-corp.test",
        passwordHash: "hash_placeholder",
        profile: {
          create: {
            tenantId: tenantAlphaId,
            fullName: "Alpha Employee",
          },
        },
        roles: {
          create: {
            tenantId: tenantAlphaId,
            role: "employee",
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

    // 3. Start Test Express Server
    const app = express();
    app.use(express.json());
    app.use("/api/v1/company-profile", companyProfileRouter);
    app.use("/api/invoices", invoicesRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
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
    // Cleanup
    await prisma.gSTRegistration.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.companyProfile.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.cmsPage.deleteMany({
      where: { slug: { in: [`tenant-${tenantAlphaId}-settings`, `tenant-${tenantBetaId}-settings`] } },
    });
    await prisma.userRole.deleteMany({
      where: { userId: { in: [alphaAdminId, betaAdminId, alphaEmployeeId, superAdminId] } },
    });
    await prisma.profile.deleteMany({
      where: { userId: { in: [alphaAdminId, betaAdminId, alphaEmployeeId, superAdminId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [alphaAdminId, betaAdminId, alphaEmployeeId, superAdminId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAlphaId, tenantBetaId] } },
    });
  });

  describe("A. Company Profile CRUD & Tenant Isolation", () => {
    it("should return fallback data if no profile or legacy data exists yet", async () => {
      const res = await fetch(`${baseUrl}/api/v1/company-profile`, {
        headers: { Authorization: `Bearer ${alphaAdminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.profile.legalName).toBe("Alpha Corp Technologies");
      expect(data.gstRegistrations).toEqual([]);
      expect(data.primaryGst).toBeNull();
    });

    it("should allow Tenant Alpha Admin to upsert legal identity and address", async () => {
      const payload = {
        legalName: "Alpha Corporation Private Limited",
        tradeName: "Alpha Cloud",
        businessType: "pvt_ltd",
        pan: "ABCDE1234F",
        tan: "BLRA12345F",
        cin: "U72200KA2021PTC145000",
        email: "billing@alphacorp.test",
        phone: "+91 80 4123 5678",
        registeredAddress: "Level 4, Prestige Tech Park, Marathahalli-Sarjapur Ring Rd",
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
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.profile.legalName).toBe("Alpha Corporation Private Limited");
      expect(data.profile.pan).toBe("ABCDE1234F");
      expect(data.profile.registeredStateCode).toBe("29");
      // Billing address should mirror registered address due to sameAsRegistered: true
      expect(data.profile.billingCity).toBe("Bengaluru");
    });

    it("should enforce strict tenant isolation: Tenant Beta cannot read Tenant Alpha data", async () => {
      const res = await fetch(`${baseUrl}/api/v1/company-profile`, {
        headers: { Authorization: `Bearer ${betaAdminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.profile.legalName).toBe("Beta Logistics India");
      expect(data.profile.pan).toBeNull();
      expect(data.profile.tenantId).toBe(tenantBetaId);
    });

    it("should reject non-admin/employee from mutating company profile", async () => {
      const res = await fetch(`${baseUrl}/api/v1/company-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${alphaEmployeeToken}`,
        },
        body: JSON.stringify({
          legalName: "Hacked Alpha",
          email: "hacker@test.com",
        }),
      });
      expect(res.status).toBe(403);
    });

    it("should validate Indian PAN format and reject invalid patterns", async () => {
      const res = await fetch(`${baseUrl}/api/v1/company-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${alphaAdminToken}`,
        },
        body: JSON.stringify({
          legalName: "Alpha Corporation Private Limited",
          email: "billing@alphacorp.test",
          pan: "INVALID123", // invalid PAN
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation failed");
    });
  });

  describe("B. Primary GST Registration", () => {
    it("should successfully register Primary GSTIN with state code prefix match", async () => {
      const payload = {
        gstin: "29ABCDE1234F1Z5", // 29 matches Karnataka
        legalName: "Alpha Corporation Private Limited",
        tradeName: "Alpha Cloud",
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
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.gstRegistration.gstin).toBe("29ABCDE1234F1Z5");
      expect(data.gstRegistration.stateCode).toBe("29");
      expect(data.gstRegistration.isPrimary).toBe(true);
    });

    it("should reject GSTIN when stateCode does not match first 2 digits", async () => {
      const payload = {
        gstin: "27ABCDE1234F1Z5", // Maharashtra (27)
        stateCode: "29", // Mismatched state code Karnataka (29)
        registrationType: "REGULAR",
        isPrimary: true,
        status: "ACTIVE",
      };

      const res = await fetch(`${baseUrl}/api/v1/company-profile/gst`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${alphaAdminToken}`,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation failed");
      expect(JSON.stringify(data.details)).toContain("State code prefix does not match the first 2 digits of GSTIN");
    });

    it("should reject invalid GSTIN format (length or bad characters)", async () => {
      const payload = {
        gstin: "29ABCDE1234F1Z", // only 14 characters
        stateCode: "29",
        registrationType: "REGULAR",
        isPrimary: true,
      };

      const res = await fetch(`${baseUrl}/api/v1/company-profile/gst`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${alphaAdminToken}`,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
    });

    it("should ensure only 1 Primary GST registration exists per tenant", async () => {
      // Register a second GSTIN as primary (e.g. Maharashtra branch)
      const payload2 = {
        gstin: "27ABCDE1234F1Z8",
        stateCode: "27",
        registrationType: "REGULAR",
        isPrimary: true,
        status: "ACTIVE",
      };

      const res2 = await fetch(`${baseUrl}/api/v1/company-profile/gst`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${alphaAdminToken}`,
        },
        body: JSON.stringify(payload2),
      });
      expect(res2.status).toBe(200);

      // Verify the previous registration (29ABCDE1234F1Z5) was demoted to isPrimary: false
      const prevGst = await prisma.gSTRegistration.findUnique({
        where: {
          tenantId_gstin: {
            tenantId: tenantAlphaId,
            gstin: "29ABCDE1234F1Z5",
          },
        },
      });
      expect(prevGst?.isPrimary).toBe(false);

      // Re-assert primary on Karnataka for subsequent tests
      await fetch(`${baseUrl}/api/v1/company-profile/gst`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${alphaAdminToken}`,
        },
        body: JSON.stringify({
          gstin: "29ABCDE1234F1Z5",
          stateCode: "29",
          registrationType: "REGULAR",
          isPrimary: true,
          status: "ACTIVE",
        }),
      });
    });
  });

  describe("C. Legacy CMS Data Migration", () => {
    it("should lazily and idempotently migrate legacy CMS JSON without overwriting normalized data", async () => {
      const legacyTenantId = "w2_1_legacy_tenant";

      // Setup legacy tenant with CMS page
      await prisma.tenant.create({
        data: {
          id: legacyTenantId,
          name: "Legacy Hardware Corp",
          slug: "legacy-hw-corp",
          timezone: "Asia/Kolkata",
        },
      });

      await prisma.cmsPage.create({
        data: {
          slug: `tenant-${legacyTenantId}-settings`,
          title: "Legacy Settings",
          content: {
            company: {
              name: "Legacy Hardware Corp LLP",
              email: "support@legacyhw.test",
              phone: "+91 22 2490 1234",
              address: "Shop 12, Lamington Road",
              city: "Mumbai",
              state: "Maharashtra",
              zipCode: "400007",
              country: "India",
              taxNumber: "27AAACL1234M1Z2", // Valid Maharashtra GSTIN
            },
          },
          updatedBy: "system",
        },
      });

      // Call getProfile which triggers lazy migration
      const migrated = await CompanyProfileService.getProfile(legacyTenantId);
      expect(migrated).not.toBeNull();
      expect(migrated?.legalName).toBe("Legacy Hardware Corp LLP");
      expect(migrated?.email).toBe("support@legacyhw.test");
      expect(migrated?.registeredCity).toBe("Mumbai");
      expect(migrated?.registeredStateCode).toBe("27");
      expect(migrated?.gstRegistrations?.length).toBe(1);
      expect(migrated?.gstRegistrations?.[0]?.gstin).toBe("27AAACL1234M1Z2");

      // Verify CMS Page was preserved intact
      const preservedCms = await prisma.cmsPage.findUnique({
        where: { slug: `tenant-${legacyTenantId}-settings` },
      });
      expect(preservedCms).not.toBeNull();
      expect((preservedCms?.content as any)?.company?.name).toBe("Legacy Hardware Corp LLP");

      // Clean up legacy test data
      await prisma.gSTRegistration.deleteMany({ where: { tenantId: legacyTenantId } });
      await prisma.companyProfile.deleteMany({ where: { tenantId: legacyTenantId } });
      await prisma.cmsPage.deleteMany({ where: { slug: `tenant-${legacyTenantId}-settings` } });
      await prisma.tenant.deleteMany({ where: { id: legacyTenantId } });
    });
  });

  describe("D. Dynamic Seller Identity & State Code Resolution", () => {
    it("should dynamically resolve companyState from persisted primary GSTRegistration", async () => {
      // In the earlier test, Alpha tenant's primary GST was set to 29ABCDE1234F1Z5 (State 29)
      const profile = await CompanyProfileService.getProfile(tenantAlphaId);
      const primaryGst = profile?.gstRegistrations?.find((g: any) => g.isPrimary && g.status === "ACTIVE");
      expect(primaryGst?.stateCode).toBe("29");

      // For Beta tenant, set primary GST to Maharashtra (27)
      await CompanyProfileService.upsertProfile(tenantBetaId, {
        legalName: "Beta Logistics India Pvt Ltd",
        email: "billing@betalogistics.test",
        businessType: "pvt_ltd",
        registeredAddress: "Andheri East",
        registeredCity: "Mumbai",
        registeredState: "Maharashtra",
        registeredStateCode: "27",
        registeredCountry: "India",
        sameAsRegistered: true,
      });

      await CompanyProfileService.upsertGstRegistration(tenantBetaId, {
        gstin: "27BETAP1234A1Z3",
        stateCode: "27",
        registrationType: "REGULAR",
        isPrimary: true,
        status: "ACTIVE",
        filingFrequency: "MONTHLY",
        eInvoicingEnabled: false,
      });

      const betaProfile = await CompanyProfileService.getProfile(tenantBetaId);
      const betaPrimaryGst = betaProfile?.gstRegistrations?.find((g: any) => g.isPrimary && g.status === "ACTIVE");
      expect(betaPrimaryGst?.stateCode).toBe("27");
    });
  });

  describe("E. Phase 1 Non-Regression Invariants", () => {
    it("should verify SettingsService and BrandingResolverService remain locked and functional", async () => {
      // Ensure SettingsService can read group
      const brandingGroup = await SettingsService.getGroup("TENANT", tenantAlphaId, "branding");
      expect(brandingGroup).toBeDefined();
      expect(brandingGroup.values).toBeDefined();

      // Ensure BrandingResolverService resolves branding correctly
      const resolved = await BrandingResolverService.resolve({ tenantId: tenantAlphaId });
      expect(resolved).toBeDefined();
      expect(resolved.appName).toBeDefined();
    });
  });

  describe("F. Super Admin CompanyProfile & GST Integration (Wave 2.1 Follow-Up)", () => {
    it("should allow Super Admin to fetch Tenant Alpha profile via /tenant/:tenantId", async () => {
      const res = await fetch(`${baseUrl}/api/v1/company-profile/tenant/${tenantAlphaId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.profile.tenantId).toBe(tenantAlphaId);
      expect(data.profile.legalName).toBe("Alpha Corporation Private Limited");
      expect(data.primaryGst.gstin).toBe("29ABCDE1234F1Z5");
    });

    it("should allow Super Admin to fetch Tenant Beta profile via /tenant/:tenantId and prove Tenant Alpha ≠ Tenant Beta", async () => {
      const resAlpha = await fetch(`${baseUrl}/api/v1/company-profile/tenant/${tenantAlphaId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const dataAlpha = await resAlpha.json();

      const resBeta = await fetch(`${baseUrl}/api/v1/company-profile/tenant/${tenantBetaId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      expect(resBeta.status).toBe(200);
      const dataBeta = await resBeta.json();

      expect(dataBeta.success).toBe(true);
      expect(dataBeta.profile.tenantId).toBe(tenantBetaId);
      expect(dataBeta.profile.legalName).toBe("Beta Logistics India Pvt Ltd");
      expect(dataBeta.primaryGst.gstin).toBe("27BETAP1234A1Z3");

      // Verify complete tenant isolation
      expect(dataAlpha.profile.tenantId).not.toBe(dataBeta.profile.tenantId);
      expect(dataAlpha.profile.legalName).not.toBe(dataBeta.profile.legalName);
      expect(dataAlpha.primaryGst.gstin).not.toBe(dataBeta.primaryGst.gstin);
      expect(dataAlpha.primaryGst.stateCode).not.toBe(dataBeta.primaryGst.stateCode);
    });

    it("should block non-super users from accessing /tenant/:tenantId (HTTP 403)", async () => {
      // Alpha Admin (hr_admin) attempting to access Beta's company profile
      const res1 = await fetch(`${baseUrl}/api/v1/company-profile/tenant/${tenantBetaId}`, {
        headers: { Authorization: `Bearer ${alphaAdminToken}` },
      });
      expect(res1.status).toBe(403);
      const data1 = await res1.json();
      expect(data1.error).toContain("Super Admin access required");

      // Alpha Employee attempting to access Alpha via the super admin endpoint
      const res2 = await fetch(`${baseUrl}/api/v1/company-profile/tenant/${tenantAlphaId}`, {
        headers: { Authorization: `Bearer ${alphaEmployeeToken}` },
      });
      expect(res2.status).toBe(403);
    });

    it("should return HTTP 404 for non-existent tenantId", async () => {
      const res = await fetch(`${baseUrl}/api/v1/company-profile/tenant/non_existent_tenant_999`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Tenant not found");
    });

    it("should prove Tenant A mutation is reflected when Super Admin refetches and does not alter Tenant B", async () => {
      // 1. Tenant Alpha updates legal name and address
      const updateRes = await fetch(`${baseUrl}/api/v1/company-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${alphaAdminToken}`,
        },
        body: JSON.stringify({
          legalName: "Alpha Corp Global Technologies Pvt Ltd",
          email: "admin@alpha-corp.test",
          businessType: "pvt_ltd",
          registeredAddress: "Level 12, Alpha Tower, Outer Ring Road",
          registeredCity: "Bengaluru",
          registeredState: "Karnataka",
          registeredStateCode: "29",
          registeredPostalCode: "560103",
          registeredCountry: "India",
          sameAsRegistered: true,
        }),
      });
      expect(updateRes.status).toBe(200);

      // 2. Super Admin refetches Tenant Alpha
      const refetchAlpha = await fetch(`${baseUrl}/api/v1/company-profile/tenant/${tenantAlphaId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const alphaRefetched = await refetchAlpha.json();
      expect(alphaRefetched.profile.legalName).toBe("Alpha Corp Global Technologies Pvt Ltd");
      expect(alphaRefetched.profile.registeredAddress).toBe("Level 12, Alpha Tower, Outer Ring Road");

      // 3. Super Admin refetches Tenant Beta and verifies Tenant Beta is completely unaffected
      const refetchBeta = await fetch(`${baseUrl}/api/v1/company-profile/tenant/${tenantBetaId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const betaRefetched = await refetchBeta.json();
      expect(betaRefetched.profile.legalName).toBe("Beta Logistics India Pvt Ltd");
      expect(betaRefetched.profile.registeredCity).toBe("Mumbai");
    });

    it("should verify non-super user query parameter ?tenantId=... is strictly ignored on tenant endpoints", async () => {
      // Alpha Admin calls standard GET /api/v1/company-profile with ?tenantId=w2_1_tenant_beta
      const res = await fetch(`${baseUrl}/api/v1/company-profile?tenantId=${tenantBetaId}`, {
        headers: { Authorization: `Bearer ${alphaAdminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      // Must still return Alpha's profile, NOT Beta's
      expect(data.profile.tenantId).toBe(tenantAlphaId);
      expect(data.profile.legalName).toBe("Alpha Corp Global Technologies Pvt Ltd");
    });
  });
});
