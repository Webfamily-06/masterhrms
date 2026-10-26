"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.provisionEmployeeUser = provisionEmployeeUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const workspace_policy_service_1 = require("../services/workspace-policy.service");
/**
 * Automatically provisions or links a User login account, Profile, and UserRole
 * whenever an employee is created via UI, Biometric sync, or Recruitment.
 */
async function provisionEmployeeUser(prisma, options) {
    const email = options.email.toLowerCase().trim();
    const rawPassword = options.password?.trim() || "Password@123";
    const passwordHash = await bcryptjs_1.default.hash(rawPassword, 10);
    const fullName = `${options.firstName || ""} ${options.lastName || ""}`.trim() || email.split("@")[0];
    let user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true, roles: true },
    });
    if (user && (user.profile?.tenantId !== options.tenantId || user.roles.some((r) => r.role === "super_admin"))) {
        throw new workspace_policy_service_1.WorkspacePolicyError("This email belongs to another account and cannot be linked or reset from this workspace.", 409);
    }
    if (!user)
        await (0, workspace_policy_service_1.lockWorkspaceCapacity)(prisma, options.tenantId, "users");
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
    }
    else {
        // If user exists, update password if custom password was provided, and ensure profile/roles exist
        const updateData = {};
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
        }
        else {
            await prisma.profile.update({
                where: { userId: user.id },
                data: {
                    fullName: fullName || user.profile.fullName,
                    tenantId: user.profile.tenantId || options.tenantId,
                    avatarUrl: options.avatarUrl || user.profile.avatarUrl,
                },
            });
        }
        const hasEmployeeRole = user.roles.some((r) => r.role === "employee" || r.role === "super_admin" || r.role === "admin");
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
