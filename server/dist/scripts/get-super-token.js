"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_js_1 = require("../lib/jwt.js");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const user = await prisma.user.findFirst({
        where: { roles: { some: { role: "super_admin" } } },
        include: { roles: true }
    });
    if (!user)
        throw new Error("No super admin found");
    // Create a device session for 30 days
    const session = await prisma.deviceSession.create({
        data: {
            userId: user.id,
            tenantId: null,
            deviceName: "Playwright Headless Chrome",
            ipAddress: "127.0.0.1",
            userAgent: "Playwright",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            revoked: false,
        }
    });
    const token = (0, jwt_js_1.generateToken)({
        userId: user.id,
        email: user.email,
        roles: user.roles.map(r => r.role),
        sessionId: session.id,
    });
    console.log("VALID_SUPER_TOKEN:" + token);
}
main().finally(() => prisma.$disconnect());
