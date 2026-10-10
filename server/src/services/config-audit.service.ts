export interface ConfigCheckItem {
  key: string;
  category: "database" | "auth" | "networking" | "cookies" | "environment";
  status: "PASS" | "WARN" | "FAIL";
  valueSanitized: string;
  message: string;
  remediation?: string;
}

export interface ConfigAuditResult {
  timestamp: string;
  nodeEnv: string;
  isProductionReady: boolean;
  score: number; // 0 to 100
  checks: ConfigCheckItem[];
  summary: {
    passed: number;
    warnings: number;
    failures: number;
  };
}

const INSECURE_DEFAULT_SECRETS = [
  "master-hrms-jwt-super-secret-key-change-this-in-production",
  "masterhrms-super-secret-jwt-key-change-in-production",
  "secret",
  "jwt-secret",
  "changeme",
  "12345678",
];

export class ConfigAuditService {
  /**
   * Masks sensitive credentials like passwords in URLs or API secrets.
   */
  public static sanitizeValue(key: string, value: string | undefined): string {
    if (!value) return "[NOT CONFIGURED]";
    const lower = key.toLowerCase();

    if (lower.includes("url") || lower.includes("uri")) {
      try {
        const parsed = new URL(value);
        if (parsed.password) {
          parsed.password = "******";
        }
        return parsed.toString();
      } catch {
        return value.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
      }
    }

    if (lower.includes("secret") || lower.includes("key") || lower.includes("token") || lower.includes("password")) {
      if (value.length <= 6) return "******";
      return `${value.slice(0, 3)}***${value.slice(-3)}`;
    }

    return value;
  }

  /**
   * Audits runtime or supplied environment configuration for production readiness.
   */
  public static auditEnvironment(customEnv?: Record<string, string | undefined>): ConfigAuditResult {
    const env = customEnv || process.env;
    const isProd = (env.NODE_ENV || "development").toLowerCase() === "production";
    const checks: ConfigCheckItem[] = [];

    // 1. NODE_ENV Check
    const nodeEnv = env.NODE_ENV || "development";
    checks.push({
      key: "NODE_ENV",
      category: "environment",
      status: "PASS",
      valueSanitized: nodeEnv,
      message: `Running under environment mode: ${nodeEnv}`,
    });

    // 2. DATABASE_URL Check
    const dbUrl = env.DATABASE_URL;
    if (!dbUrl) {
      checks.push({
        key: "DATABASE_URL",
        category: "database",
        status: "FAIL",
        valueSanitized: "[NOT CONFIGURED]",
        message: "Missing DATABASE_URL. Database connection cannot be initialized.",
        remediation: "Set a valid PostgreSQL connection string.",
      });
    } else {
      const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
      const isSslEnabled = dbUrl.includes("sslmode=require") || dbUrl.includes("ssl=true") || dbUrl.includes("pooler");

      if (!isPostgres) {
        checks.push({
          key: "DATABASE_URL",
          category: "database",
          status: "WARN",
          valueSanitized: this.sanitizeValue("DATABASE_URL", dbUrl),
          message: "Database URL is not using PostgreSQL protocol scheme.",
          remediation: "Ensure standard postgresql:// connection string is provided.",
        });
      } else if (isProd && !isSslEnabled && !dbUrl.includes("localhost") && !dbUrl.includes("127.0.0.1")) {
        checks.push({
          key: "DATABASE_URL",
          category: "database",
          status: "WARN",
          valueSanitized: this.sanitizeValue("DATABASE_URL", dbUrl),
          message: "Production database connection string does not explicitly enforce SSL mode.",
          remediation: "Append ?sslmode=require to DATABASE_URL for in-transit encryption.",
        });
      } else {
        checks.push({
          key: "DATABASE_URL",
          category: "database",
          status: "PASS",
          valueSanitized: this.sanitizeValue("DATABASE_URL", dbUrl),
          message: "Valid PostgreSQL database connection string configured.",
        });
      }
    }

    // 3. JWT_SECRET Check
    const jwtSecret = env.JWT_SECRET;
    if (!jwtSecret) {
      checks.push({
        key: "JWT_SECRET",
        category: "auth",
        status: isProd ? "FAIL" : "WARN",
        valueSanitized: "[NOT CONFIGURED]",
        message: "JWT_SECRET is missing; application falls back to built-in development key.",
        remediation: "Generate an entropy-rich secret (>= 32 random characters).",
      });
    } else if (INSECURE_DEFAULT_SECRETS.includes(jwtSecret)) {
      checks.push({
        key: "JWT_SECRET",
        category: "auth",
        status: isProd ? "FAIL" : "WARN",
        valueSanitized: this.sanitizeValue("JWT_SECRET", jwtSecret),
        message: "Insecure default/placeholder JWT_SECRET detected.",
        remediation: "Replace with a high-entropy cryptographically generated key.",
      });
    } else if (jwtSecret.length < 32) {
      checks.push({
        key: "JWT_SECRET",
        category: "auth",
        status: "WARN",
        valueSanitized: this.sanitizeValue("JWT_SECRET", jwtSecret),
        message: `JWT_SECRET length is ${jwtSecret.length} characters (recommended >= 32).`,
        remediation: "Increase secret length to at least 32 characters for HMAC SHA-256 resilience.",
      });
    } else {
      checks.push({
        key: "JWT_SECRET",
        category: "auth",
        status: "PASS",
        valueSanitized: this.sanitizeValue("JWT_SECRET", jwtSecret),
        message: "Strong, custom JWT secret configured.",
      });
    }

    // 4. BASE_DOMAIN Check
    const baseDomain = env.BASE_DOMAIN;
    if (!baseDomain) {
      checks.push({
        key: "BASE_DOMAIN",
        category: "networking",
        status: isProd ? "FAIL" : "WARN",
        valueSanitized: "[NOT CONFIGURED]",
        message: "BASE_DOMAIN is not set. Subdomain multi-tenancy may default to localhost.",
        remediation: "Set BASE_DOMAIN (e.g. app.masterhrms.com or masterhrms.local).",
      });
    } else {
      checks.push({
        key: "BASE_DOMAIN",
        category: "networking",
        status: "PASS",
        valueSanitized: baseDomain,
        message: `Tenant routing base domain configured: ${baseDomain}`,
      });
    }

    // 5. CORS_ORIGIN Check
    const corsOrigin = env.CORS_ORIGIN;
    if (corsOrigin === "*") {
      checks.push({
        key: "CORS_ORIGIN",
        category: "networking",
        status: isProd ? "FAIL" : "WARN",
        valueSanitized: "*",
        message: "Wildcard CORS origin (*) is unsafe for authenticated multi-tenant APIs with credentials.",
        remediation: "Specify explicit comma-separated allowed origins.",
      });
    } else {
      checks.push({
        key: "CORS_ORIGIN",
        category: "networking",
        status: "PASS",
        valueSanitized: corsOrigin || "Default localhost origins allowed",
        message: "CORS origins configured or using safe defaults.",
      });
    }

    // 6. Cookie Security Check
    const cookieSecure = env.COOKIE_SECURE === "true" || (isProd && env.COOKIE_SECURE !== "false");
    const sameSite = (env.COOKIE_SAMESITE || "lax").toLowerCase();
    if (isProd && !cookieSecure) {
      checks.push({
        key: "COOKIE_SECURE",
        category: "cookies",
        status: "WARN",
        valueSanitized: String(cookieSecure),
        message: "Cookie Secure flag is disabled in production.",
        remediation: "Set COOKIE_SECURE=true to ensure cookies are only transmitted over HTTPS.",
      });
    } else {
      checks.push({
        key: "COOKIE_SECURE",
        category: "cookies",
        status: "PASS",
        valueSanitized: String(cookieSecure),
        message: "Cookie Secure flag adheres to environment policy.",
      });
    }

    if (!["lax", "strict", "none"].includes(sameSite)) {
      checks.push({
        key: "COOKIE_SAMESITE",
        category: "cookies",
        status: "WARN",
        valueSanitized: sameSite,
        message: "Unrecognized SameSite cookie policy.",
        remediation: "Set COOKIE_SAMESITE to 'lax' or 'strict'.",
      });
    } else {
      checks.push({
        key: "COOKIE_SAMESITE",
        category: "cookies",
        status: "PASS",
        valueSanitized: sameSite,
        message: `SameSite cookie attribute is configured to '${sameSite}'.`,
      });
    }

    // Calculate Summary and Score
    const passed = checks.filter((c) => c.status === "PASS").length;
    const warnings = checks.filter((c) => c.status === "WARN").length;
    const failures = checks.filter((c) => c.status === "FAIL").length;

    const total = checks.length;
    const score = Math.round(((passed * 1.0 + warnings * 0.5) / total) * 100);
    const isProductionReady = failures === 0 && (isProd ? warnings <= 1 : true);

    return {
      timestamp: new Date().toISOString(),
      nodeEnv,
      isProductionReady,
      score,
      checks,
      summary: {
        passed,
        warnings,
        failures,
      },
    };
  }

  /**
   * Fails closed during startup if any critical production invariant is violated.
   */
  public static assertProductionReadyOrWarn(env?: Record<string, string | undefined>): ConfigAuditResult {
    const audit = this.auditEnvironment(env);
    const isProd = (env?.NODE_ENV || process.env.NODE_ENV || "development").toLowerCase() === "production";

    if (isProd && !audit.isProductionReady) {
      const failList = audit.checks
        .filter((c) => c.status === "FAIL")
        .map((c) => ` - [${c.key}]: ${c.message}`)
        .join("\n");
      throw new Error(`[CRITICAL] Production Startup Configuration Audit Failed:\n${failList}`);
    }

    return audit;
  }
}
