import { useState, useEffect } from "react";
import { setToken } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeftCircle, ShieldAlert } from "lucide-react";

export function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    const checkImpersonation = () => {
      const active = localStorage.getItem("hrms_impersonation_active") === "true";
      const name = localStorage.getItem("hrms_impersonated_tenant_name") || "Tenant Workspace";
      setIsImpersonating(active);
      setTenantName(name);
    };

    checkImpersonation();
    window.addEventListener("storage", checkImpersonation);
    return () => window.removeEventListener("storage", checkImpersonation);
  }, []);

  const handleExitImpersonation = () => {
    try {
      const backupToken = localStorage.getItem("hrms_super_admin_backup_token");
      if (backupToken) {
        setToken(backupToken);
      }
      localStorage.removeItem("hrms_impersonation_active");
      localStorage.removeItem("hrms_impersonated_tenant_name");
      localStorage.removeItem("hrms_super_admin_backup_token");

      setIsImpersonating(false);
      toast.success("Exited impersonation. Returning to Super Admin Console...");
      window.location.href = "/super/tenants";
    } catch (err: any) {
      console.error("Failed to exit impersonation:", err);
      window.location.href = "/super/tenants";
    }
  };

  if (!isImpersonating) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-[9999] flex w-full items-center justify-between bg-amber-500 px-4 py-2 text-white shadow-md transition-all duration-200"
    >
      <div className="flex items-center gap-2.5 text-xs font-semibold sm:text-sm">
        <ShieldAlert className="size-4 shrink-0 animate-pulse text-amber-100" />
        <span>
          You are currently impersonating <span className="underline font-bold">{tenantName}</span>. Any actions performed here directly affect this tenant&apos;s live database records.
        </span>
      </div>
      <button
        type="button"
        onClick={handleExitImpersonation}
        className="ml-4 inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white/20 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-white/30 focus:outline-hidden focus:ring-2 focus:ring-white/50 cursor-pointer shadow-xs"
      >
        <ArrowLeftCircle className="size-3.5" />
        Exit Impersonation
      </button>
    </div>
  );
}
