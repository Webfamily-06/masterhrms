import { PrismaClient } from "@prisma/client";
import { generateToken } from "../server/src/lib/jwt";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { profile: { tenantId: { not: null } } },
    include: { profile: true, roles: true },
  });
  if (!user || !user.profile?.tenantId) throw new Error("No user");

  const tenantId = user.profile.tenantId;

  // Create fresh device session
  const session = await prisma.deviceSession.create({
    data: {
      userId: user.id,
      tenantId,
      deviceType: "desktop",
      ipAddress: "127.0.0.1",
      userAgent: "Playwright E2E Test Suite",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked: false,
    },
  });

  const token = generateToken({
    userId: user.id,
    email: user.email,
    tenantId,
    roles: user.roles.map((r) => r.role),
    sessionId: session.id,
  });

  console.log("Session ID:", session.id);
  console.log("Testing GET http://localhost:4000/api/v1/auth/me...");
  const res = await fetch("http://localhost:4000/api/v1/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Response:", data);
}

main().finally(() => prisma.$disconnect());

