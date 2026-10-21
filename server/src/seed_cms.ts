import { prisma } from "./prisma";
import { SettingsService } from "./services/settings/settings.service";

async function main() {
  // 1. Ensure authoritative Setting table defaults exist without overwriting
  await SettingsService.ensureDefaultSettings();

  // 2. Ensure legacy CMS page exists without overwriting custom administrator configuration
  await prisma.cmsPage.upsert({
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

  await prisma.cmsPage.upsert({
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
  const { ensureAuthoritativeLegalDocs } = await import("./services/legal-docs.service");
  await ensureAuthoritativeLegalDocs();

  console.log("Successfully seeded system-platform-settings, footer, and legal documents in MySQL!");
}

main().finally(async () => {
  await prisma.$disconnect();
});
