import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

// Ensure environment variables are loaded before PrismaClient initializes
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL must be configured before starting the API.");
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: any;
}

export const prisma: PrismaClient & Record<string, any> =
  (global.__prisma ||
    new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    })) as any;

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
