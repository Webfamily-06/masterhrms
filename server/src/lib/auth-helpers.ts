import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { lockWorkspaceCapacity, WorkspacePolicyError } from "../services/workspace-policy.service";

interface ProvisionOptions {
  tenantId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  password?: string | null;
}

/**
 * Automatically provisions or links a User login account, Profile, and UserRole
 * whenever an employee is created via UI, Biometric sync, or Recruitment.
 */
export async function provisionEmployeeUser(
  prisma: PrismaClient | any,
  options: ProvisionOptions
): Promise<string> {
  const email = options.email.toLowerCase().trim();
  const rawPassword = options.password?.trim() || "Password@123";
  const passwordHash = await bcrypt.hash(rawPassword, 10);
  const fullName = `${options.firstName || ""} ${options.lastName || ""}`.trim() || email.split("@")[0];

  let user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true, roles: true },
  });

  if (user && (user.profile?.tenantId !== options.tenantId || user.roles.some((r: any) => r.role === "super_admin"))) {
    throw new WorkspacePolicyError("This email belongs to another account and cannot be linked or reset from this workspace.", 409);
  }
  if (!user) await lockWorkspaceCapacity(prisma, options.tenantId, "users");

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            fullName,
            email,
            phone: options.phone || null,
            avatarUrl: options.avatarUrl || null,
            tenantId: options.tenantId,
          },
        },
        roles: {
          create: {
            role: "employee",
            tenantId: options.tenantId,
          },
        },
      },
      include: { profile: true, roles: true },
    });
  } else {
    // If user exists, update password if custom password was provided, and ensure profile/roles exist
    const updateData: any = {};
    if (options.password) {
      updateData.passwordHash = passwordHash;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    if (!user.profile) {
      await prisma.profile.create({
        data: {
          userId: user.id,
          fullName,
          email,
          phone: options.phone || null,
          avatarUrl: options.avatarUrl || null,
          tenantId: options.tenantId,
        },
      });
    } else {
      await prisma.profile.update({
        where: { userId: user.id },
        data: {
          fullName: fullName || user.profile.fullName,
          tenantId: user.profile.tenantId || options.tenantId,
          avatarUrl: options.avatarUrl || user.profile.avatarUrl,
        },
      });
    }

    const hasEmployeeRole = user.roles.some((r: any) => r.role === "employee" || r.role === "super_admin" || r.role === "admin");
    if (!hasEmployeeRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          role: "employee",
          tenantId: options.tenantId,
        },
      });
    }
  }

  return user.id;
}
