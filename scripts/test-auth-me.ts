import { PrismaClient } from "@prisma/client";
import { generateToken } from "../server/src/lib/jwt";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { profile: { tenantId: { not: null } } },
    include: { profile: true, roles: true },
  });

  const tenantId = user!.profile!.tenantId!;

  let session = await prisma.deviceSession.findFirst({
    where: { userId: user!.id, revoked: false, expiresAt: { gt: new Date() } },
  });
  if (!session) {
    session = await prisma.deviceSession.create({
      data: {
        userId: user!.id,
        tenantId,
        deviceType: "desktop",
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
  }

  const token = generateToken({
    userId: user!.id,
    email: user!.email,
    tenantId,
    roles: user!.roles.map((r) => r.role),
    sessionId: session.id,
  });

  console.log("Testing fetch http://localhost:4000/api/auth/me...");
  const res = await fetch("http://localhost:4000/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Response:", data);
}

main().catch(console.error).finally(() => prisma.$disconnect());

