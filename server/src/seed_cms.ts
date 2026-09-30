import { prisma } from "./prisma";

async function main() {
  await prisma.cmsPage.upsert({
    where: { slug: "system-platform-settings" },
    update: {
      content: { appName: "Master ERP & HRMS", primaryThemeColor: "#FF6B00" },
    },
    create: {
      slug: "system-platform-settings",
      title: "Platform Settings",
      content: { appName: "Master ERP & HRMS", primaryThemeColor: "#FF6B00" },
      published: true,
    },
  });

  await prisma.cmsPage.upsert({
    where: { slug: "footer" },
    update: {
      content: { copyright: "© 2026 Master HRMS Inc. All rights reserved." },
    },
    create: {
      slug: "footer",
      title: "Footer Links",
      content: { copyright: "© 2026 Master HRMS Inc. All rights reserved." },
      published: true,
    },
  });

  console.log("Successfully seeded system-platform-settings and footer in MySQL!");
}

main().finally(async () => {
  await prisma.$disconnect();
});
