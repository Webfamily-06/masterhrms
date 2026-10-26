"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../../.env") });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
const prisma_1 = require("../prisma");
async function main() {
    const tenants = await prisma_1.rawPrisma.tenant.findMany({
        select: { id: true, name: true, slug: true, createdAt: true },
        take: 20,
        orderBy: { createdAt: "asc" },
    });
    console.log(JSON.stringify(tenants, null, 2));
    await prisma_1.rawPrisma.$disconnect();
}
main().catch(console.error);
