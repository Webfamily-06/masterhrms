"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("../lib/jwt");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const user = await prisma.user.findFirst({
        where: { profile: { tenantId: { not: null } } },
        include: { profile: true, roles: true }
    });
    if (!user || !user.profile?.tenantId) {
        throw new Error("No user with tenant found");
    }
    const token = (0, jwt_1.generateToken)({
        userId: user.id,
        email: user.email,
        tenantId: user.profile.tenantId,
        roles: user.roles.map(r => r.role)
    });
    console.log("GENERATED_TOKEN:" + token);
    console.log("EMAIL:" + user.email);
    console.log("TENANT_ID:" + user.profile.tenantId);
}
main().finally(() => prisma.$disconnect());
