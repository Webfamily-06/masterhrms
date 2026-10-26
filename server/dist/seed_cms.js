"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./prisma");
const settings_service_1 = require("./services/settings/settings.service");
async function main() {
    // 1. Ensure authoritative Setting table defaults exist without overwriting
    await settings_service_1.SettingsService.ensureDefaultSettings();
    // 2. Ensure legacy CMS page exists without overwriting custom administrator configuration
    await prisma_1.prisma.cmsPage.upsert({
        where: { slug: "system-platform-settings" },
        update: {}, // Rule 2: NEVER overwrite existing settings with defaults
        create: {
            slug: "system-platform-settings",
            title: "Platform Settings",
            content: {
                appName: "Master ERP & HRMS",
                primaryThemeColor: "#FF6B00",
                logoLightUrl: "/logo.webp",
                logoDarkUrl: "/white-logo.webp",
                faviconUrl: "/favicon.webp",
            },
            published: true,
        },
    });
    await prisma_1.prisma.cmsPage.upsert({
        where: { slug: "footer" },
        update: {}, // Rule 2: NEVER overwrite existing footer with defaults
        create: {
            slug: "footer",
            title: "Footer Links",
            content: { copyright: "© 2026 Master HRMS Inc. All rights reserved." },
            published: true,
        },
    });
    // 3. Ensure authoritative legal documents exist
    const { ensureAuthoritativeLegalDocs } = await Promise.resolve().then(() => __importStar(require("./services/legal-docs.service")));
    await ensureAuthoritativeLegalDocs();
    console.log("Successfully seeded system-platform-settings, footer, and legal documents in MySQL!");
}
main().finally(async () => {
    await prisma_1.prisma.$disconnect();
});
