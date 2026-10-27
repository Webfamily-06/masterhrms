"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
const prisma_1 = require("../prisma");
async function test() {
    const p = prisma_1.rawPrisma;
    console.log("workspaceSlugRedirect:", typeof p.workspaceSlugRedirect);
    console.log("workspaceSlugHistory:", typeof p.workspaceSlugHistory);
    await prisma_1.rawPrisma.$disconnect();
}
test().catch(console.error);
