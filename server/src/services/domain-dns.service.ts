import dns from "dns";
import { getBaseDomain } from "../lib/workspace-host";

const dnsPromises = dns.promises;

export interface RequiredDnsRecord {
  type: "CNAME" | "TXT" | "A";
  name: string;
  value: string;
  ttl: number;
  purpose: "routing" | "ownership" | "apex_routing";
  description: string;
}

export interface DnsVerificationResult {
  verified: boolean;
  status: "verified" | "failed" | "pending";
  checkedAt: Date;
  details: {
    cnameVerified: boolean;
    txtVerified: boolean;
    aRecordVerified: boolean;
    cnameExpected?: string;
    cnameActual?: string[];
    txtExpected?: string;
    txtActual?: string[];
    aExpected?: string;
    aActual?: string[];
  };
  errorMessage?: string;
}

/**
 * Returns the platform CNAME target from environment configuration.
 * Defaults dynamically to cname.{BASE_DOMAIN}.
 * Never hardcoded.
 */
export function getPlatformCnameTarget(): string {
  const configured = process.env.CUSTOM_DOMAIN_TARGET;
  if (configured && configured.trim().length > 0) {
    return configured.trim().toLowerCase();
  }
  return `cname.${getBaseDomain()}`;
}

/**
 * Returns the platform Server IP from environment configuration.
 */
export function getPlatformServerIp(): string {
  return process.env.SERVER_IP || process.env.PLATFORM_IP || "127.0.0.1";
}

/**
 * Generates the required DNS records for a given custom domain and verification token.
 */
export function getRequiredDnsRecords(domain: string, verificationToken: string): RequiredDnsRecord[] {
  const cnameTarget = getPlatformCnameTarget();
  const serverIp = getPlatformServerIp();
  const isApex = domain.split(".").length === 2;

  const records: RequiredDnsRecord[] = [
    {
      type: "CNAME",
      name: domain,
      value: cnameTarget,
      ttl: 3600,
      purpose: "routing",
      description: `Points traffic from ${domain} to the Master HRMS platform gateway.`,
    },
    {
      type: "TXT",
      name: `_masterhrms-challenge.${domain}`,
      value: verificationToken,
      ttl: 3600,
      purpose: "ownership",
      description: "Cryptographic ownership proof to verify domain control before activation.",
    },
  ];

  if (isApex) {
    records.push({
      type: "A",
      name: "@",
      value: serverIp,
      ttl: 3600,
      purpose: "apex_routing",
      description: `Apex domain A record pointing directly to platform IP (${serverIp}).`,
    });
  }

  return records;
}

/**
 * Performs server-side DNS verification using live DNS queries.
 */
export async function verifyDomainDns(
  domain: string,
  verificationToken: string,
  options?: { mockSuccess?: boolean; mockFailReason?: string }
): Promise<DnsVerificationResult> {
  const checkedAt = new Date();
  const cnameTarget = getPlatformCnameTarget().toLowerCase();

  // Test mode simulation hook
  if (process.env.MOCK_DNS_VERIFY === "true" || options?.mockSuccess !== undefined) {
    if (options?.mockFailReason) {
      return {
        verified: false,
        status: "failed",
        checkedAt,
        details: {
          cnameVerified: false,
          txtVerified: false,
          aRecordVerified: false,
          cnameExpected: cnameTarget,
          cnameActual: [],
        },
        errorMessage: options.mockFailReason,
      };
    }
    if (options?.mockSuccess || process.env.MOCK_DNS_VERIFY === "true") {
      return {
        verified: true,
        status: "verified",
        checkedAt,
        details: {
          cnameVerified: true,
          txtVerified: true,
          aRecordVerified: false,
          cnameExpected: cnameTarget,
          cnameActual: [cnameTarget],
          txtExpected: verificationToken,
          txtActual: [verificationToken],
        },
      };
    }
  }

  const details: DnsVerificationResult["details"] = {
    cnameVerified: false,
    txtVerified: false,
    aRecordVerified: false,
    cnameExpected: cnameTarget,
    txtExpected: verificationToken,
  };

  const errors: string[] = [];

  // 1. Check CNAME record
  try {
    const cnames = await dnsPromises.resolveCname(domain);
    details.cnameActual = cnames.map((c) => c.toLowerCase().replace(/\.$/, ""));
    const match = details.cnameActual.some(
      (c) => c === cnameTarget || c.endsWith(`.${cnameTarget}`) || c.includes(cnameTarget)
    );
    if (match) {
      details.cnameVerified = true;
    } else {
      errors.push(`CNAME record points to "${details.cnameActual.join(", ")}" instead of "${cnameTarget}".`);
    }
  } catch (err: any) {
    errors.push(`CNAME resolution failed (${err.code || err.message}).`);
  }

  // 2. Check TXT Challenge Record (_masterhrms-challenge.domain)
  try {
    const challengeHost = `_masterhrms-challenge.${domain}`;
    const txtRecords = await dnsPromises.resolveTxt(challengeHost);
    const flattenedTxt = txtRecords.map((chunk) => chunk.join(""));
    details.txtActual = flattenedTxt;
    if (flattenedTxt.includes(verificationToken)) {
      details.txtVerified = true;
    } else {
      errors.push(`TXT record on "${challengeHost}" does not match the verification token.`);
    }
  } catch (err: any) {
    errors.push(`TXT challenge resolution failed (${err.code || err.message}).`);
  }

  // Either CNAME or TXT challenge verification is sufficient for ownership/routing proof
  const verified = details.cnameVerified || details.txtVerified;
  const status = verified ? "verified" : "failed";

  return {
    verified,
    status,
    checkedAt,
    details,
    errorMessage: verified ? undefined : errors.join(" "),
  };
}
