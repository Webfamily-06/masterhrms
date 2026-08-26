import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: any;
}

export const prisma: PrismaClient & Record<string, any> = (global.__prisma || new PrismaClient()) as any;

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
