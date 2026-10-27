"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaProxy = exports.createDynamicPrismaProxy = exports.prisma = exports.rawPrisma = void 0;
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const prisma_proxy_facade_1 = require("./facade/prisma-proxy.facade");
Object.defineProperty(exports, "prismaProxy", { enumerable: true, get: function () { return prisma_proxy_facade_1.prismaProxy; } });
Object.defineProperty(exports, "createDynamicPrismaProxy", { enumerable: true, get: function () { return prisma_proxy_facade_1.createDynamicPrismaProxy; } });
// Ensure environment variables are loaded before PrismaClient initializes
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
dotenv_1.default.config();
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.warn("⚠️ [WARN] DATABASE_URL is not configured. Database operations will be unavailable until DATABASE_URL is provided.");
}
// Un-proxied base PrismaClient (retained for explicit system/admin access or rollback)
exports.rawPrisma = global.__rawPrisma ||
    new client_1.PrismaClient(dbUrl
        ? {
            datasources: {
                db: {
                    url: dbUrl,
                },
            },
        }
        : undefined);
// Dynamic Prisma Proxy Facade exported as the default application-wide 'prisma' client instance
exports.prisma = (global.__prismaProxy || prisma_proxy_facade_1.prismaProxy);
// Retain Prisma singleton across lambda / hot-reloads
global.__rawPrisma = exports.rawPrisma;
global.__prismaProxy = exports.prisma;
