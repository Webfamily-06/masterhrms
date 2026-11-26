import { prisma } from "../prisma";

export interface QuotaCheckResult {
  allowed: boolean;
  currentUsage: number;
  maxLimit: number | null;
  remaining: number | null;
  message?: string;
}