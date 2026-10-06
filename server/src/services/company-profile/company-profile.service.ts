import { prisma, rawPrisma } from "../../prisma";
import { z } from "zod";

const db = rawPrisma || prisma;

// Indian Statutory Validation Regexes
export const INDIAN_PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const INDIAN_TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;
export const INDIAN_CIN_REGEX = /^[LUlu]{1}[0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$/;
export const INDIAN_GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const CompanyProfileSchema = z.object({
  legalName: z.string().min(2, "Legal company name must be at least 2 characters").max(255),
  tradeName: z.string().max(255).optional().nullable(),
  businessType: z.enum([
    "pvt_ltd",
    "public_ltd",
    "llp",
    "partnership",
    "proprietorship",
    "individual",
    "other",
  ]).default("pvt_ltd"),
  cin: z.string().trim().regex(INDIAN_CIN_REGEX, "Invalid Indian CIN format (e.g. U72200KA2020PTC123456)").optional().nullable().or(z.literal("")),
  pan: z.string().trim().toUpperCase().regex(INDIAN_PAN_REGEX, "Invalid Indian PAN format (e.g. AABCT1234F)").optional().nullable().or(z.literal("")),
  tan: z.string().trim().toUpperCase().regex(INDIAN_TAN_REGEX, "Invalid Indian TAN format (e.g. BLRA12345F)").optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email("Valid company email is required").max(150),
  website: z.string().url("Invalid website URL format").optional().nullable().or(z.literal("")),
  
  // Registered Office
  registeredAddress: z.string().max(1000).optional().nullable(),
  registeredAddressLine1: z.string().max(500).optional().nullable(),
  registeredAddressLine2: z.string().max(500).optional().nullable(),
  registeredCity: z.string().max(100).optional().nullable(),
  registeredState: z.string().max(100).optional().nullable(),
  registeredStateCode: z.string().max(10).optional().nullable(),
  registeredPostalCode: z.string().max(20).optional().nullable(),
  registeredCountry: z.string().max(100).default("India"),

  // Commercial / Billing Address
  billingAddress: z.string().max(1000).optional().nullable(),
  billingAddressLine1: z.string().max(500).optional().nullable(),
  billingAddressLine2: z.string().max(500).optional().nullable(),
  billingCity: z.string().max(100).optional().nullable(),
  billingState: z.string().max(100).optional().nullable(),
  billingStateCode: z.string().max(10).optional().nullable(),
  billingPostalCode: z.string().max(20).optional().nullable(),
  billingCountry: z.string().max(100).default("India"),
  sameAsRegistered: z.boolean().default(true),
});

export interface TenantCompanyIdentity {
  tenantId: string;
  legalName: string;
  tradeName: string | null;
  businessType: string;
  cin: string | null;
  pan: string | null;
  tan: string | null;
  phone: string | null;
  email: string;
  website: string | null;
  registeredOffice: {
    address: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    stateCode: string | null;
    postalCode: string | null;
    country: string;
    formatted: string;
  };
  billingOffice: {
    address: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    stateCode: string | null;
    postalCode: string | null;
    country: string;
    formatted: string;
    sameAsRegistered: boolean;
  };
  primaryGst: {
    gstin: string;
    legalName: string | null;
    tradeName: string | null;
    stateCode: string;
    registrationType: string;
    status: string;
    filingFrequency: string | null;
    eInvoicingEnabled: boolean;
  } | null;
  hasAuthoritativeProfile: boolean;
}

export function splitAddressLines(address: string | null | undefined): { line1: string | null; line2: string | null } {
  if (!address) return { line1: null, line2: null };
  const parts = address.split("\n");
  if (parts.length > 1) {
    return { line1: parts[0]?.trim() || null, line2: parts.slice(1).join(", ").trim() || null };
  }
  return { line1: address.trim(), line2: null };
}

export function formatAddress(opts: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): string {
  const parts = [
    opts.addressLine1,
    opts.addressLine2,
    opts.city,
    [opts.state, opts.postalCode].filter(Boolean).join(" "),
    opts.country || "India",
  ].filter(Boolean);
  return parts.join(", ");
}

export const GSTRegistrationSchema = z.object({
  gstin: z.string().trim().toUpperCase().regex(INDIAN_GSTIN_REGEX, "Invalid 15-character GSTIN format (e.g. 29AABCT1234F1Z5)"),
  legalName: z.string().max(255).optional().nullable(),
  tradeName: z.string().max(255).optional().nullable(),
  stateCode: z.string().min(2, "State code must be 2 digits").max(10),
  registrationType: z.enum(["REGULAR", "COMPOSITION", "SEZ", "ISD", "CASUAL"]).default("REGULAR"),
  isPrimary: z.boolean().default(true),
  status: z.enum(["ACTIVE", "INACTIVE", "CANCELLED"]).default("ACTIVE"),
  filingFrequency: z.enum(["MONTHLY", "QUARTERLY"]).default("MONTHLY"),
  eInvoicingEnabled: z.boolean().default(false),
}).refine((data) => {
  // Ensure the first 2 digits of GSTIN match stateCode
  return data.gstin.slice(0, 2) === data.stateCode;
}, {
  message: "State code prefix does not match the first 2 digits of GSTIN",
  path: ["stateCode"],
});

export class CompanyProfileService {
  /**
   * Lazily migrates unnormalized company info from legacy CmsPage JSON into CompanyProfile.
   * Idempotent: Never overwrites existing normalized CompanyProfile records.
   */
  static async migrateLegacyCmsData(tenantId: string) {
    if (!tenantId) return null;

    const existing = await db.companyProfile.findUnique({
      where: { tenantId },
      include: { gstRegistrations: true },
    });
    if (existing) {
      return existing;
    }

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return null;

    const legacyCms = await db.cmsPage.findUnique({
      where: { slug: `tenant-${tenantId}-settings` },
    });
    const cmsContent = (legacyCms?.content as Record<string, any>) || {};
    const legacyComp = cmsContent.company || {};

    const legalName = legacyComp.name || legacyComp.companyName || tenant.name;
    const email = legacyComp.email || `contact@${tenant.slug}.masterhrms.com`;
    const phone = legacyComp.phone || null;
    const registeredAddress = legacyComp.address || null;
    const registeredCity = legacyComp.city || null;
    const registeredState = legacyComp.state || null;
    const registeredPostalCode = legacyComp.zipCode || null;
    const registeredCountry = legacyComp.country || "India";

    // Attempt to extract GSTIN or PAN from legacy taxNumber
    const rawTax = (legacyComp.taxNumber || "").trim().toUpperCase();
    let pan: string | null = null;
    let initialGstin: string | null = null;
    let stateCode: string | null = null;

    if (INDIAN_GSTIN_REGEX.test(rawTax)) {
      initialGstin = rawTax;
      stateCode = rawTax.slice(0, 2);
      pan = rawTax.slice(2, 12);
    } else if (INDIAN_PAN_REGEX.test(rawTax)) {
      pan = rawTax;
    }

    const profile = await db.companyProfile.create({
      data: {
        tenantId,
        legalName,
        tradeName: tenant.name,
        email,
        phone,
        pan,
        registeredAddress,
        registeredCity,
        registeredState,
        registeredStateCode: stateCode,
        registeredPostalCode,
        registeredCountry,
        billingAddress: registeredAddress,
        billingCity: registeredCity,
        billingState: registeredState,
        billingStateCode: stateCode,
        billingPostalCode: registeredPostalCode,
        billingCountry: registeredCountry,
        sameAsRegistered: true,
      },
    });

    if (initialGstin && stateCode) {
      await db.gSTRegistration.create({
        data: {
          companyProfileId: profile.id,
          tenantId,
          gstin: initialGstin,
          legalName,
          stateCode,
          registrationType: "REGULAR",
          isPrimary: true,
          status: "ACTIVE",
        },
      });
    }

    return await db.companyProfile.findUnique({
      where: { tenantId },
      include: { gstRegistrations: true },
    });
  }

  /**
   * Retrieves the authoritative CompanyProfile and GST registrations for a Tenant.
   */
  static async getProfile(tenantId: string) {
    if (!tenantId) {
      throw new Error("Tenant ID is required to fetch CompanyProfile");
    }

    let profile = await db.companyProfile.findUnique({
      where: { tenantId },
      include: { gstRegistrations: { orderBy: { isPrimary: "desc" } } },
    });

    if (!profile) {
      profile = await this.migrateLegacyCmsData(tenantId);
    }

    if (!profile) {
      // Build safe fallback representation from Tenant record
      const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        const err: any = new Error(`Tenant not found: ${tenantId}`);
        err.status = 404;
        throw err;
      }

      return {
        id: "transient-fallback",
        tenantId,
        legalName: tenant.name,
        tradeName: tenant.name,
        businessType: "pvt_ltd",
        cin: null,
        pan: null,
        tan: null,
        phone: null,
        email: `admin@${tenant.slug}.masterhrms.com`,
        website: null,
        registeredAddress: null,
        registeredAddressLine1: null,
        registeredAddressLine2: null,
        registeredCity: null,
        registeredState: null,
        registeredStateCode: null,
        registeredPostalCode: null,
        registeredCountry: "India",
        billingAddress: null,
        billingAddressLine1: null,
        billingAddressLine2: null,
        billingCity: null,
        billingState: null,
        billingStateCode: null,
        billingPostalCode: null,
        billingCountry: "India",
        sameAsRegistered: true,
        gstRegistrations: [],
      };
    }

    const regSplit = splitAddressLines(profile.registeredAddress);
    const billSplit = splitAddressLines(profile.billingAddress);

    return {
      ...profile,
      registeredAddressLine1: regSplit.line1,
      registeredAddressLine2: regSplit.line2,
      billingAddressLine1: billSplit.line1,
      billingAddressLine2: billSplit.line2,
    };
  }

  /**
   * Upserts the legal identity and address fields of a Tenant's CompanyProfile.
   */
  static async upsertProfile(
    tenantId: string,
    data: z.infer<typeof CompanyProfileSchema>,
    context?: AuditContext
  ) {
    if (!tenantId) {
      throw new Error("Tenant ID is required to update CompanyProfile");
    }

    const validated = CompanyProfileSchema.parse(data);

    // If address lines were provided, compose into registeredAddress
    if (validated.registeredAddressLine1 !== undefined || validated.registeredAddressLine2 !== undefined) {
      const composite = [validated.registeredAddressLine1, validated.registeredAddressLine2].filter(Boolean).join("\n");
      if (composite) validated.registeredAddress = composite;
    }

    // If billing address lines were provided, compose into billingAddress
    if (validated.billingAddressLine1 !== undefined || validated.billingAddressLine2 !== undefined) {
      const composite = [validated.billingAddressLine1, validated.billingAddressLine2].filter(Boolean).join("\n");
      if (composite) validated.billingAddress = composite;
    }

    // If sameAsRegistered is true, mirror registered address into billing address
    if (validated.sameAsRegistered) {
      validated.billingAddress = validated.registeredAddress;
      validated.billingCity = validated.registeredCity;
      validated.billingState = validated.registeredState;
      validated.billingStateCode = validated.registeredStateCode;
      validated.billingPostalCode = validated.registeredPostalCode;
      validated.billingCountry = validated.registeredCountry;
    }

    const previous = await db.companyProfile.findUnique({ where: { tenantId } });

    const updated = await db.companyProfile.upsert({
      where: { tenantId },
      create: {
        tenantId,
        legalName: validated.legalName,
        tradeName: validated.tradeName || null,
        businessType: validated.businessType,
        cin: validated.cin || null,
        pan: validated.pan || null,
        tan: validated.tan || null,
        phone: validated.phone || null,
        email: validated.email,
        website: validated.website || null,
        registeredAddress: validated.registeredAddress || null,
        registeredCity: validated.registeredCity || null,
        registeredState: validated.registeredState || null,
        registeredStateCode: validated.registeredStateCode || null,
        registeredPostalCode: validated.registeredPostalCode || null,
        registeredCountry: validated.registeredCountry || "India",
        billingAddress: validated.billingAddress || null,
        billingCity: validated.billingCity || null,
        billingState: validated.billingState || null,
        billingStateCode: validated.billingStateCode || null,
        billingPostalCode: validated.billingPostalCode || null,
        billingCountry: validated.billingCountry || "India",
        sameAsRegistered: validated.sameAsRegistered,
      },
      update: {
        legalName: validated.legalName,
        tradeName: validated.tradeName || null,
        businessType: validated.businessType,
        cin: validated.cin || null,
        pan: validated.pan || null,
        tan: validated.tan || null,
        phone: validated.phone || null,
        email: validated.email,
        website: validated.website || null,
        registeredAddress: validated.registeredAddress || null,
        registeredCity: validated.registeredCity || null,
        registeredState: validated.registeredState || null,
        registeredStateCode: validated.registeredStateCode || null,
        registeredPostalCode: validated.registeredPostalCode || null,
        registeredCountry: validated.registeredCountry || "India",
        billingAddress: validated.billingAddress || null,
        billingCity: validated.billingCity || null,
        billingState: validated.billingState || null,
        billingStateCode: validated.billingStateCode || null,
        billingPostalCode: validated.billingPostalCode || null,
        billingCountry: validated.billingCountry || "India",
        sameAsRegistered: validated.sameAsRegistered,
      },
      include: {
        gstRegistrations: true,
      },
    });

    // Write audit log
    try {
      await db.settingAudit.create({
        data: {
          scope: "TENANT",
          scopeId: tenantId,
          key: "company.profile.update",
          oldValueMasked: previous ? JSON.stringify({ legalName: previous.legalName, pan: previous.pan }) : null,
          newValueMasked: JSON.stringify({ legalName: updated.legalName, pan: updated.pan }),
          changedBy: context?.userId || "system",
          ipAddress: context?.ipAddress || null,
          userAgent: context?.userAgent || null,
        },
      });
    } catch (auditErr) {
      console.warn("[CompanyProfileService] Audit logging failed:", auditErr);
    }

    const regSplit = splitAddressLines(updated.registeredAddress);
    const billSplit = splitAddressLines(updated.billingAddress);

    return {
      ...updated,
      registeredAddressLine1: regSplit.line1,
      registeredAddressLine2: regSplit.line2,
      billingAddressLine1: billSplit.line1,
      billingAddressLine2: billSplit.line2,
    };
  }

  /**
   * Upserts the Primary GST Registration for a Tenant.
   * Wave 2.1 enforces 1 Primary Registration per Tenant.
   */
  static async upsertGstRegistration(
    tenantId: string,
    data: z.infer<typeof GSTRegistrationSchema>,
    context?: AuditContext
  ) {
    if (!tenantId) {
      throw new Error("Tenant context required for GST registration");
    }

    const validated = GSTRegistrationSchema.parse(data);

    // Ensure companyProfile exists
    let profile = await db.companyProfile.findUnique({ where: { tenantId } });
    if (!profile) {
      profile = await this.migrateLegacyCmsData(tenantId);
    }
    if (!profile) {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
      profile = await db.companyProfile.create({
        data: {
          tenantId,
          legalName: tenant?.name || "Company Legal Name",
          email: `admin@${tenant?.slug || "tenant"}.masterhrms.com`,
        },
      });
    }

    // Demote any existing primary registrations for this tenant to ensure only 1 primary registration exists
    if (validated.isPrimary) {
      await db.gSTRegistration.updateMany({
        where: { tenantId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const upserted = await db.gSTRegistration.upsert({
      where: {
        tenantId_gstin: {
          tenantId,
          gstin: validated.gstin,
        },
      },
      create: {
        companyProfileId: profile.id,
        tenantId,
        gstin: validated.gstin,
        legalName: validated.legalName || profile.legalName,
        tradeName: validated.tradeName || profile.tradeName,
        stateCode: validated.stateCode,
        registrationType: validated.registrationType,
        isPrimary: validated.isPrimary,
        status: validated.status,
        filingFrequency: validated.filingFrequency,
        eInvoicingEnabled: validated.eInvoicingEnabled,
      },
      update: {
        legalName: validated.legalName || profile.legalName,
        tradeName: validated.tradeName || profile.tradeName,
        stateCode: validated.stateCode,
        registrationType: validated.registrationType,
        isPrimary: validated.isPrimary,
        status: validated.status,
        filingFrequency: validated.filingFrequency,
        eInvoicingEnabled: validated.eInvoicingEnabled,
      },
    });

    // Write audit log
    try {
      await db.settingAudit.create({
        data: {
          scope: "TENANT",
          scopeId: tenantId,
          key: "company.gst.upsert",
          oldValueMasked: null,
          newValueMasked: JSON.stringify({ gstin: upserted.gstin, stateCode: upserted.stateCode }),
          changedBy: context?.userId || "system",
          ipAddress: context?.ipAddress || null,
          userAgent: context?.userAgent || null,
        },
      });
    } catch (auditErr) {
      console.warn("[CompanyProfileService] GST Audit logging failed:", auditErr);
    }

    return upserted;
  }

  /**
   * Resolves the authoritative tenant company identity.
   * Canonical single source of truth for downstream document, invoice, payroll, and PDF generators.
   */
  static async resolveTenantCompanyIdentity(tenantId: string): Promise<TenantCompanyIdentity> {
    const profile = await this.getProfile(tenantId);
    const gstRegistrations = (profile as any)?.gstRegistrations || [];
    const primaryGst =
      gstRegistrations.find((g: any) => g.isPrimary && g.status === "ACTIVE") ||
      gstRegistrations.find((g: any) => g.isPrimary) ||
      gstRegistrations[0] ||
      null;

    const regSplit = splitAddressLines(profile.registeredAddress);
    const billSplit = splitAddressLines(profile.billingAddress);

    const registeredFormatted = formatAddress({
      addressLine1: regSplit.line1,
      addressLine2: regSplit.line2,
      city: profile.registeredCity,
      state: profile.registeredState,
      postalCode: profile.registeredPostalCode,
      country: profile.registeredCountry,
    });

    const billingFormatted = profile.sameAsRegistered
      ? registeredFormatted
      : formatAddress({
          addressLine1: billSplit.line1,
          addressLine2: billSplit.line2,
          city: profile.billingCity,
          state: profile.billingState,
          postalCode: profile.billingPostalCode,
          country: profile.billingCountry,
        });

    return {
      tenantId,
      legalName: profile.legalName,
      tradeName: profile.tradeName || null,
      businessType: profile.businessType || "pvt_ltd",
      cin: profile.cin || null,
      pan: profile.pan || null,
      tan: profile.tan || null,
      phone: profile.phone || null,
      email: profile.email,
      website: profile.website || null,
      registeredOffice: {
        address: profile.registeredAddress,
        addressLine1: regSplit.line1,
        addressLine2: regSplit.line2,
        city: profile.registeredCity,
        state: profile.registeredState,
        stateCode: profile.registeredStateCode,
        postalCode: profile.registeredPostalCode,
        country: profile.registeredCountry || "India",
        formatted: registeredFormatted,
      },
      billingOffice: {
        address: profile.sameAsRegistered ? profile.registeredAddress : profile.billingAddress,
        addressLine1: profile.sameAsRegistered ? regSplit.line1 : billSplit.line1,
        addressLine2: profile.sameAsRegistered ? regSplit.line2 : billSplit.line2,
        city: profile.sameAsRegistered ? profile.registeredCity : profile.billingCity,
        state: profile.sameAsRegistered ? profile.registeredState : profile.billingState,
        stateCode: profile.sameAsRegistered ? profile.registeredStateCode : profile.billingStateCode,
        postalCode: profile.sameAsRegistered ? profile.registeredPostalCode : profile.billingPostalCode,
        country: (profile.sameAsRegistered ? profile.registeredCountry : profile.billingCountry) || "India",
        formatted: billingFormatted,
        sameAsRegistered: Boolean(profile.sameAsRegistered),
      },
      primaryGst: primaryGst
        ? {
            gstin: primaryGst.gstin,
            legalName: primaryGst.legalName || profile.legalName,
            tradeName: primaryGst.tradeName || profile.tradeName,
            stateCode: primaryGst.stateCode,
            registrationType: primaryGst.registrationType,
            status: primaryGst.status,
            filingFrequency: primaryGst.filingFrequency || "MONTHLY",
            eInvoicingEnabled: Boolean(primaryGst.eInvoicingEnabled),
          }
        : null,
      hasAuthoritativeProfile: profile.id !== "transient-fallback",
    };
  }
}
