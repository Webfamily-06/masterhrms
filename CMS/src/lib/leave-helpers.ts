import { useState, useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";

export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function formatLeaveDays(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "0";
  if (Number.isInteger(num)) return String(num);
  return Number(num.toFixed(2)).toString();
}

export function extractLeaveErrorMessage(err: unknown, fallback = "Leave operation failed"): string {
  if (err instanceof ApiError) {
    return err.message || fallback;
  }
  if (err && typeof err === "object") {
    const anyErr = err as any;
    if (typeof anyErr.message === "string" && anyErr.message.trim()) return anyErr.message;
    if (typeof anyErr.error === "string" && anyErr.error.trim()) return anyErr.error;
    if (typeof anyErr.response?.data?.error === "string") return anyErr.response.data.error;
  }
  return fallback;
}

export async function uploadLeaveSupportingDocument(file: File): Promise<string> {
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Supporting attachment exceeds the 10 MB maximum file size.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "leave-attachments");

  const res: any = await api.upload("/api/v1/media/upload", formData);
  const uploadedUrl = res?.url || res?.data?.url || res?.fileUrl || res?.data?.fileUrl;

  if (!uploadedUrl || typeof uploadedUrl !== "string" || uploadedUrl.startsWith("blob:")) {
    throw new Error("Attachment upload did not return a persisted file URL.");
  }
  return uploadedUrl;
}

function invalidateKeys(queryClient: QueryClient, prefixes: string[]) {
  return Promise.all(
    prefixes.map((prefix) => queryClient.invalidateQueries({ queryKey: [prefix] }))
  );
}

export function invalidateLeaveTypes(queryClient: QueryClient) {
  return invalidateKeys(queryClient, [
    "hr-leave-types",
    "hr-leave-policies",
    "hr-leave-balances",
    "hr-leave-matrix",
    "me-leave-catalog",
    "me-leave-types",
    "me-leave-policy",
    "me-leave-balance",
    "me-leave-overview",
    "hr-leave-overview",
  ]);
}

export function invalidateLeavePolicies(queryClient: QueryClient) {
  return invalidateKeys(queryClient, [
    "hr-leave-policies",
    "me-leave-policy",
    "me-leave-catalog",
    "hr-leave-balances",
  ]);
}

export function invalidateLeaveBalances(queryClient: QueryClient) {
  return invalidateKeys(queryClient, [
    "hr-leave-balances",
    "hr-leave-ledger",
    "me-leave-balance",
    "me-leave-catalog",
    "me-leave-overview",
    "hr-leave-overview",
    "me-dashboard",
  ]);
}

export function invalidateLeaveApplications(queryClient: QueryClient) {
  return invalidateKeys(queryClient, [
    "hr-leave-matrix",
    "hr-leave-applications",
    "hr-leave-application-detail",
    "hr-leave-balances",
    "hr-leave-ledger",
    "me-leave-applications",
    "me-leave-application-detail",
    "me-leave-balance",
    "me-leave-catalog",
    "me-leave-team-calendar",
    "me-team-approvals",
    "me-leaves",
    "me-leave-overview",
    "hr-leave-overview",
    "me-dashboard",
  ]);
}
