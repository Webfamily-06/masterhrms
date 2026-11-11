"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppBaseUrl = getAppBaseUrl;
exports.getCertificateVerificationRoute = getCertificateVerificationRoute;
exports.resolveCertificateVerificationUrl = resolveCertificateVerificationUrl;
const workspace_host_1 = require("./workspace-host");
/**
 * MASTERHRMS — Centralized Certificate Verification URL & Route Resolver
 *
 * Uses configured APP_URL or canonical platform root URL from workspace host.
 * Guarantees zero hardcoded domains, normalized trailing slashes, safe parameter encoding,
 * and strict security boundaries.
 */
function getAppBaseUrl() {
    const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL;
    if (envUrl && envUrl.trim().length > 0) {
        return envUrl.trim().replace(/\/+$/, "");
    }
    return (0, workspace_host_1.getRootUrl)().replace(/\/+$/, "");
}
function getCertificateVerificationRoute() {
    const customRoute = process.env.CERTIFICATE_VERIFICATION_ROUTE;
    if (customRoute && customRoute.trim().length > 0) {
        const clean = customRoute.trim().replace(/^\/+/, "").replace(/\/+$/, "");
        return `/${clean}`;
    }
    return "/verify-certificate";
}
function resolveCertificateVerificationUrl(codeOrNumber) {
    const base = getAppBaseUrl();
    const route = getCertificateVerificationRoute();
    const safeParam = encodeURIComponent(codeOrNumber ? codeOrNumber.trim() : "");
    return `${base}${route}?code=${safeParam}`;
}
