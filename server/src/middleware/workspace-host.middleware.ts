import { Request, Response, NextFunction } from "express";
import {
  resolveHostContext,
  HostContext,
  getCachedWorkspace,
  setCachedWorkspace,
  getWorkspaceUrl,
  getCustomDomainUrl,
  getBaseDomain,
  getEffectiveRequestHost,
  getCachedCustomDomain,
  setCachedCustomDomain,
} from "../lib/workspace-host";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;

export interface WorkspaceHostRequest extends Request {
  hostContext?: HostContext;
  resolvedTenant?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    timezone: string;
    status: string;
  };
  workspaceNotFound?: boolean;
}

/**
 * Middleware: Resolves incoming Host header to either:
 *  - Public / Root site
 *  - Super Admin console (super.{BASE_DOMAIN})
 *  - Tenant Workspace ({slug}.{BASE_DOMAIN} or {slug}.localhost)
 *  - 30-day Redirect for renamed slugs
 *  - Workspace Not Found
 */
export async function workspaceHostMiddleware(
  req: WorkspaceHostRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    const rawHost = getEffectiveRequestHost(req.headers);

    const hostContext = resolveHostContext(rawHost);
    req.hostContext = hostContext;

    // ── Public or Super Admin Host ─────────────────────────────
    if (hostContext.type === "public" || hostContext.type === "super") {
      return next();
    }

    // ── Tenant Workspace Host ──────────────────────────────────
    if (hostContext.type === "tenant") {
      const slug = hostContext.slug.toLowerCase();

      // CRITICAL SUPER ADMIN ROUTE ISOLATION:
      // A tenant host + /Super must NEVER open Super Admin, expose super admin routes, or redirect.
      // Must immediately return HTTP 404 Not Found.
      const rawPath = (req.originalUrl || req.path || req.url || "").split("?")[0].toLowerCase();
      if (
        rawPath === "/super" ||
        rawPath.startsWith("/super/") ||
        rawPath === "/api/super" ||
        rawPath.startsWith("/api/super/")
      ) {
        return res.status(404).json({
          error: "Not Found",
          code: "NOT_FOUND",
        });
      }

      // CMS TENANT-HOST ISOLATION:
      // Tenant hosts must NEVER access platform CMS pages or APIs
      if (rawPath === "/api/cms" || rawPath.startsWith("/api/cms/")) {
        return res.status(404).json({
          error: "Not Found",
          code: "NOT_FOUND",
        });
      }
      if (rawPath === "/cms" || rawPath.startsWith("/cms/")) {
        const portMatch = rawHost.match(/:(\d+)$/);
        const port = portMatch ? parseInt(portMatch[1], 10) : undefined;
        const targetUrl = getWorkspaceUrl(slug, port) + "/auth";
        return res.redirect(301, targetUrl);
      }

      // 1. Check in-memory routing cache (60s TTL)
      const cached = getCachedWorkspace(slug);
      if (cached) {
        if (cached.isRedirect && cached.targetSlug) {
          const targetUrl = getWorkspaceUrl(cached.targetSlug) + req.originalUrl;
          if (req.originalUrl.startsWith("/api/")) {
            return res.status(301).json({
              error: "Workspace has moved to a new address.",
              code: "WORKSPACE_MOVED",
              newSlug: cached.targetSlug,
              newUrl: targetUrl,
            });
          }
          return res.redirect(301, targetUrl);
        }

        req.resolvedTenant = {
          id: cached.tenantId,
          name: cached.name,
          slug: cached.slug,
          timezone: "Asia/Kolkata",
          status: cached.status,
        };
        return next();
      }

      // 2. Query DB for active tenant with this slug
      const tenant = await prisma.tenant.findUnique({
        where: { slug },
        include: {
          subscription: {
            select: { status: true },
          },
        },
      });

      if (tenant) {
        const status = tenant.subscription?.status || "active";
        setCachedWorkspace(slug, {
          tenantId: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          status,
          isRedirect: false,
        });

        req.resolvedTenant = {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logoUrl: tenant.logoUrl,
          timezone: tenant.timezone || "Asia/Kolkata",
          status,
        };
        return next();
      }

      // 3. Check 30-day slug redirect table
      const redirect = await prisma.workspaceSlugRedirect.findFirst({
        where: {
          oldSlug: slug,
          redirectUntil: { gte: new Date() },
        },
      });

      if (redirect) {
        setCachedWorkspace(slug, {
          tenantId: redirect.tenantId,
          slug,
          name: "Redirecting",
          status: "redirect",
          isRedirect: true,
          targetSlug: redirect.newSlug,
        });

        const targetUrl = getWorkspaceUrl(redirect.newSlug) + req.originalUrl;
        if (req.originalUrl.startsWith("/api/")) {
          return res.status(301).json({
            error: "Workspace has moved to a new address.",
            code: "WORKSPACE_MOVED",
            newSlug: redirect.newSlug,
            newUrl: targetUrl,
          });
        }
        return res.redirect(301, targetUrl);
      }

      // 4. Slug neither active nor redirecting -> Workspace Not Found
      req.workspaceNotFound = true;

      // If calling tenant-scoped API, reject with 404 Workspace Not Found
      if (
        req.originalUrl.startsWith("/api/") &&
        !req.originalUrl.startsWith("/api/health") &&
        !req.originalUrl.startsWith("/api/public/workspace")
      ) {
        return res.status(404).json({
          error: "Workspace not found. Check the workspace address or contact your administrator.",
          code: "WORKSPACE_NOT_FOUND",
          host: rawHost,
          slug,
        });
      }

      return next();
    }

    // ── Flow 2: Custom Domain or Unknown Host Resolution ──────
    const hostname = rawHost.split(":")[0].toLowerCase().trim();

    // Check if hostContext was already resolved to custom_domain from memory cache
    if (hostContext.type === "custom_domain") {
      const rawPath = (req.originalUrl || req.path || req.url || "").split("?")[0].toLowerCase();
      if (
        rawPath === "/super" ||
        rawPath.startsWith("/super/") ||
        rawPath === "/api/super" ||
        rawPath.startsWith("/api/super/")
      ) {
        return res.status(404).json({
          error: "Not Found",
          code: "NOT_FOUND",
        });
      }

      // CMS CUSTOM-DOMAIN ISOLATION:
      if (rawPath === "/api/cms" || rawPath.startsWith("/api/cms/")) {
        return res.status(404).json({
          error: "Not Found",
          code: "NOT_FOUND",
        });
      }
      if (rawPath === "/cms" || rawPath.startsWith("/cms/")) {
        const portMatch = rawHost.match(/:(\d+)$/);
        const port = portMatch ? parseInt(portMatch[1], 10) : undefined;
        const targetUrl = getCustomDomainUrl(hostname, port) + "/auth";
        return res.redirect(301, targetUrl);
      }

      const cached = getCachedCustomDomain(hostname);
      if (cached) {
        req.resolvedTenant = {
          id: cached.tenantId,
          name: cached.tenantName,
          slug: cached.tenantSlug,
          timezone: "Asia/Kolkata",
          status: cached.status,
        };
        return next();
      }
    }

    if (hostContext.type === "unknown") {
      // 1. Check in-memory custom domain cache
      const cached = getCachedCustomDomain(hostname);
      if (cached) {
        if (cached.status === "approved" && cached.dnsStatus === "verified") {
          const rawPath = (req.originalUrl || req.path || req.url || "").split("?")[0].toLowerCase();
          if (
            rawPath === "/super" ||
            rawPath.startsWith("/super/") ||
            rawPath === "/api/super" ||
            rawPath.startsWith("/api/super/")
          ) {
            return res.status(404).json({
              error: "Not Found",
              code: "NOT_FOUND",
            });
          }

          // CMS CUSTOM-DOMAIN ISOLATION:
          if (rawPath === "/api/cms" || rawPath.startsWith("/api/cms/")) {
            return res.status(404).json({
              error: "Not Found",
              code: "NOT_FOUND",
            });
          }
          if (rawPath === "/cms" || rawPath.startsWith("/cms/")) {
            const portMatch = rawHost.match(/:(\d+)$/);
            const port = portMatch ? parseInt(portMatch[1], 10) : undefined;
            const targetUrl = getCustomDomainUrl(hostname, port) + "/auth";
            return res.redirect(301, targetUrl);
          }

          req.hostContext = {
            type: "custom_domain",
            domain: cached.domain,
            tenantId: cached.tenantId,
            baseDomain: hostContext.baseDomain,
          };
          req.resolvedTenant = {
            id: cached.tenantId,
            name: cached.tenantName,
            slug: cached.tenantSlug,
            timezone: "Asia/Kolkata",
            status: cached.status,
          };
          return next();
        }
      }

      // 2. Query DB for registered custom domain in TenantDomain table
      const dbDomain = await prisma.tenantDomain.findUnique({
        where: { domain: hostname },
        include: {
          tenant: {
            include: {
              subscription: {
                select: { status: true },
              },
            },
          },
        },
      });

      if (dbDomain) {
        if (dbDomain.status === "approved" && dbDomain.dnsStatus === "verified") {
          // Cache verified active domain
          setCachedCustomDomain(hostname, {
            id: dbDomain.id,
            domain: dbDomain.domain,
            tenantId: dbDomain.tenantId,
            tenantSlug: dbDomain.tenant.slug,
            tenantName: dbDomain.tenant.name,
            status: dbDomain.status,
            dnsStatus: dbDomain.dnsStatus,
            sslStatus: dbDomain.sslStatus,
            isPrimary: dbDomain.isPrimary,
          });

          // CRITICAL SUPER ADMIN ROUTE ISOLATION (Universal Rule 5):
          // Custom domain + /Super must NEVER open Super Admin, return 404
          const rawPath = (req.originalUrl || req.path || req.url || "").split("?")[0].toLowerCase();
          if (
            rawPath === "/super" ||
            rawPath.startsWith("/super/") ||
            rawPath === "/api/super" ||
            rawPath.startsWith("/api/super/")
          ) {
            return res.status(404).json({
              error: "Not Found",
              code: "NOT_FOUND",
            });
          }

          // CMS CUSTOM-DOMAIN ISOLATION:
          if (rawPath === "/api/cms" || rawPath.startsWith("/api/cms/")) {
            return res.status(404).json({
              error: "Not Found",
              code: "NOT_FOUND",
            });
          }
          if (rawPath === "/cms" || rawPath.startsWith("/cms/")) {
            const portMatch = rawHost.match(/:(\d+)$/);
            const port = portMatch ? parseInt(portMatch[1], 10) : undefined;
            const targetUrl = getCustomDomainUrl(hostname, port) + "/auth";
            return res.redirect(301, targetUrl);
          }

          req.hostContext = {
            type: "custom_domain",
            domain: dbDomain.domain,
            tenantId: dbDomain.tenantId,
            baseDomain: hostContext.baseDomain,
          };
          req.resolvedTenant = {
            id: dbDomain.tenant.id,
            name: dbDomain.tenant.name,
            slug: dbDomain.tenant.slug,
            logoUrl: dbDomain.tenant.logoUrl,
            timezone: dbDomain.tenant.timezone || "Asia/Kolkata",
            status: dbDomain.tenant.subscription?.status || "active",
          };
          return next();
        }

        // Domain registered but pending verification or approval
        if (req.originalUrl.startsWith("/api/")) {
          return res.status(404).json({
            error: "Custom domain pending verification or administrator approval.",
            code: "CUSTOM_DOMAIN_NOT_ACTIVE",
            status: dbDomain.status,
            dnsStatus: dbDomain.dnsStatus,
          });
        }
      }

      // ── Unknown / Unregistered Host ─────────────────────────────
      if (req.originalUrl.startsWith("/api/")) {
        return res.status(404).json({
          error: "Unknown host. The requested domain is not configured on this platform.",
          code: "UNKNOWN_HOST",
          host: rawHost,
        });
      }
    }

    return next();
  } catch (err: any) {
    console.error("[WorkspaceHostMiddleware Error]:", err);
    return next(err);
  }
}
