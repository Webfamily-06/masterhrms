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
  employeeId?: string | null;
  userRole?: string | null;
  roleId?: string | null;
  workspaceRole?: string | null;
}

function normalizeLegacyAppRole(input?: string | null): "hr_admin" | "manager" | "employee" {
  const raw = String(input || "").toLowerCase().trim();
  if (["hr_admin", "hr_manager", "hr admin", "hr manager", "hr administrator", "admin", "tenant_admin", "workspace_admin", "workspace admin"].includes(raw)) {
    return "hr_admin";
  }
  if (["manager", "team lead", "department head"].includes(raw)) {
    return "manager";
  }
  return "employee";
}

function targetWorkspaceRoleNames(input?: string | null): string[] {
  const raw = String(input || "").toLowerCase().trim();
  if (["admin", "tenant_admin", "workspace_admin", "workspace admin", "owner"].includes(raw)) {
    return ["Workspace Admin", "Tenant Admin"];
  }
  if (["hr_admin", "hr_manager", "hr admin", "hr manager", "hr administrator"].includes(raw)) {
    return ["HR Manager", "HR Admin", "HR Administrator"];
  }
  if (["manager", "team lead", "department head"].includes(raw)) {
    return ["Manager", "Employee"];
  }
  return ["Employee"];
}

/**
 * Automatically provisions or links a User login account, Profile, UserRole, and WorkspaceRole assignment
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
  const requestedRole = options.workspaceRole || options.userRole || null;
  const legacyRole = normalizeLegacyAppRole(requestedRole);

  let user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true, roles: true },
  });

  if (user) {
    if (user.profile?.tenantId !== options.tenantId || user.roles.some((r: any) => r.role === "super_admin")) {
      throw new WorkspacePolicyError("This email belongs to another account and cannot be linked or reset from this workspace.", 409);
    }

    const existingLinkedEmployee = await prisma.employee.findFirst({
      where: {
        userId: user.id,
        ...(options.employeeId ? { id: { not: options.employeeId } } : {}),
      },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    });
    if (existingLinkedEmployee) {
      throw new WorkspacePolicyError(
        `This user account (${email}) is already assigned to employee ${existingLinkedEmployee.firstName} ${existingLinkedEmployee.lastName} (${existingLinkedEmployee.employeeCode}). Each employee must have an independent login account.`,
        409
      );
    }
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
            role: legacyRole,
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

    const hasDesiredRole = user.roles.some((r: any) => r.role === legacyRole && r.tenantId === options.tenantId);
    if (!hasDesiredRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          role: legacyRole,
          tenantId: options.tenantId,
        },
      });
    }
  }

  // Sync WorkspaceRole assignment inside the same transaction (DEFECT-018 / DEFECT-019)
  try {
    let resolvedWorkspaceRole: any = null;
    if (options.roleId) {
      resolvedWorkspaceRole = await prisma.workspaceRole.findFirst({
        where: { id: options.roleId, tenantId: options.tenantId, isActive: true },
      });
    }
    if (!resolvedWorkspaceRole) {
      const candidateNames = targetWorkspaceRoleNames(requestedRole);
      for (const name of candidateNames) {
        resolvedWorkspaceRole = await prisma.workspaceRole.findFirst({
          where: { tenantId: options.tenantId, name: { equals: name, mode: "insensitive" }, isActive: true },
        });
        if (resolvedWorkspaceRole) break;
      }
    }
    if (resolvedWorkspaceRole) {
      await prisma.userRoleAssignment.upsert({
        where: { userId_tenantId: { userId: user.id, tenantId: options.tenantId } },
        create: { userId: user.id, tenantId: options.tenantId, roleId: resolvedWorkspaceRole.id },
        update: { roleId: resolvedWorkspaceRole.id },
      });
    }
  } catch (roleSyncErr: any) {
    console.warn("[provisionEmployeeUser] WorkspaceRole sync warning:", roleSyncErr?.message || roleSyncErr);
  }

  return user.id;
}
