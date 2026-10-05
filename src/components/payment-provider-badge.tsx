import React from "react";

export type PaymentProviderType =
  | "razorpay"
  | "paypal"
  | "stripe"
  | "net_banking"
  | "offline"
  | "bank_transfer"
  | "credit_card"
  | "debit_card"
  | "manual"
  | "unknown";

export interface PaymentProviderMeta {
  key: PaymentProviderType;
  displayName: string;
  iconPath: string;
  badgeClass: string;
}

/**
 * Resolves standard provider metadata and local asset path from raw provider string
 */
export function getPaymentProviderMeta(rawProvider?: string | null): PaymentProviderMeta {
  const p = (rawProvider || "").toLowerCase().trim();

  if (p.includes("razorpay")) {
    return {
      key: "razorpay",
      displayName: "Razorpay",
      iconPath: "/Payment/razorpay.png",
      badgeClass: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    };
  }

  if (p.includes("paypal")) {
    return {
      key: "paypal",
      displayName: "PayPal",
      iconPath: "/Payment/paypal.svg",
      badgeClass: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
    };
  }

  if (p.includes("stripe")) {
    return {
      key: "stripe",
      displayName: "Stripe",
      iconPath: "/Payment/stripe.png",
      badgeClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    };
  }

  if (p.includes("offline")) {
    return {
      key: "offline",
      displayName: "Offline Payment",
      iconPath: "/Payment/Offline-Payment.png",
      badgeClass: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    };
  }

  if (p.includes("net") || p.includes("banking") || p === "net_banking") {
    return {
      key: "net_banking",
      displayName: "Net Banking",
      iconPath: "/Payment/Net-banking.png",
      badgeClass: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
    };
  }

  if (
    p.includes("bank") ||
    p.includes("transfer") ||
    p.includes("wire") ||
    p.includes("neft") ||
    p.includes("rtgs")
  ) {
    return {
      key: "bank_transfer",
      displayName: "Bank Transfer",
      iconPath: "/Payment/Offline-Payment.png",
      badgeClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    };
  }

  if (p.includes("credit") || p.includes("card") || p.includes("debit")) {
    return {
      key: p.includes("debit") ? "debit_card" : "credit_card",
      displayName: p.includes("debit") ? "Debit Card" : "Credit Card",
      iconPath: "/Payment/Net-banking.png",
      badgeClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    };
  }

  if (p.includes("manual")) {
    return {
      key: "manual",
      displayName: "Manual",
      iconPath: "/Payment/Offline-Payment.png",
      badgeClass: "text-muted-foreground bg-muted border-border",
    };
  }

  const cleanName = rawProvider && rawProvider.trim() ? rawProvider.trim() : "Online Payment";
  const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  return {
    key: "unknown",
    displayName: capitalized,
    iconPath: "/Payment/Offline-Payment.png",
    badgeClass: "text-muted-foreground bg-muted border-border",
  };
}

/**
 * Standard Payment Provider Icon Component using official local assets from /Payment
 * Renders with uniform sizing, vertical alignment, and light/dark theme friendliness
 */
export function PaymentProviderIcon({
  provider,
  className = "size-4",
}: {
  provider?: string | null;
  className?: string;
}) {
  const meta = getPaymentProviderMeta(provider);

  return (
    <img
      src={meta.iconPath}
      alt={meta.displayName}
      className={`inline-block object-contain shrink-0 align-middle ${className}`}
      loading="lazy"
    />
  );
}

/**
 * Unified Payment Provider Badge with brand icon & text
 */
export function PaymentProviderBadge({
  provider,
  showLabel = true,
  className = "",
  iconSize = "size-4",
}: {
  provider?: string | null;
  showLabel?: boolean;
  className?: string;
  iconSize?: string;
}) {
  const meta = getPaymentProviderMeta(provider);

  return (
    <span className={`inline-flex items-center gap-1.5 align-middle ${className}`}>
      <PaymentProviderIcon provider={provider} className={iconSize} />
      {showLabel && <span className="font-medium text-foreground whitespace-nowrap">{meta.displayName}</span>}
    </span>
  );
}
