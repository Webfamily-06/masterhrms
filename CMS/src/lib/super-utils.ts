/**
 * Shared utility helpers for Master HRMS Super Admin console pages.
 * Eliminates repeated inline unwrap, CSV export, date/currency format, and clipboard helpers.
 */

export function unwrapApiList<T = any>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.items)) return res.items;
  return [];
}

export function unwrapApiData<T = any>(res: any, fallback: T): T {
  if (res === null || res === undefined) return fallback;
  return (res?.data ?? res ?? fallback) as T;
}

export function formatSuperDate(
  input: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(
    "en-IN",
    options || { day: "2-digit", month: "short", year: "numeric" }
  );
}

export function formatSuperDateTime(input: string | number | Date | null | undefined): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSuperCurrency(
  amount: number | string | null | undefined,
  currency = "INR"
): string {
  const n = Number(amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `₹${safe.toLocaleString("en-IN")}`;
  }
}

export function exportRowsToCsv<T extends Record<string, any>>(
  rows: T[],
  columns: Array<{ key: keyof T | ((row: T) => any); header: string }>,
  filename: string
): void {
  if (!rows.length || typeof window === "undefined") return;
  const escapeCell = (val: unknown): string => {
    const str = val === null || val === undefined ? "" : String(val);
    if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const headerLine = columns.map((c) => escapeCell(c.header)).join(",");
  const dataLines = rows.map((row) =>
    columns
      .map((c) => escapeCell(typeof c.key === "function" ? c.key(row) : row[c.key]))
      .join(",")
  );
  const csv = [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
