import React from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft, LayoutGrid, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/lib/permissions";

interface AccessDeniedProps {
  requiredPermission?: string;
  moduleName?: string;
  message?: string;
}

export function AccessDenied({
  requiredPermission,
  moduleName,
  message,
}: AccessDeniedProps) {
  const { workspaceRole } = usePermissions();

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-xl shadow-rose-500/5">
          <ShieldAlert className="w-12 h-12 stroke-[1.75]" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-md">
          <LockKeyhole className="w-4 h-4" />
        </div>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold mb-3 border border-rose-500/20">
        <span>HTTP 403 · Security Policy</span>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl mb-3">
        Access Denied
      </h1>

      <p className="text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-2 leading-relaxed">
        {message || "You don't have permission to access this page."}
      </p>

      <p className="text-sm text-slate-500 dark:text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
        Please contact your Workspace Administrator if you need access.
      </p>

      {(moduleName || requiredPermission || workspaceRole) && (
        <div className="mb-8 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-xs text-left max-w-sm w-full space-y-1.5 shadow-sm">
          {workspaceRole && (
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="font-medium">Assigned Role:</span>
              <Badge variant="outline" className="text-xs font-medium bg-slate-200/50 dark:bg-slate-800">
                {workspaceRole.name}
              </Badge>
            </div>
          )}
          {moduleName && (
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="font-medium">Requested Module:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{moduleName}</span>
            </div>
          )}
          {requiredPermission && (
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
              <span className="font-medium">Required Code:</span>
              <code className="text-[11px] font-mono text-rose-500 bg-rose-500/5 px-1 py-0.5 rounded">
                {requiredPermission}
              </code>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="gap-2 border-slate-300 dark:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </Button>

        <Button
          asChild
          className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20"
        >
          <Link to="/dashboard">
            <LayoutGrid className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
