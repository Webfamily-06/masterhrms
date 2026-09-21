import { createFileRoute, Link } from "@tanstack/react-router";
import { usePermissions } from "@/lib/permissions";
import {
  Users, ShoppingCart, Package, Compass, Landmark, Kanban,
  HelpCircle, FileSpreadsheet, BarChart3, ShieldCheck, ArrowRight,
  Sparkles, Lock, CheckCircle2, AlertCircle, Loader2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_app/workspace")({
  component: WorkspacePage,
});

const ICON_MAP: Record<string, any> = {
  Users,
  ShoppingCart,
  Package,
  Compass,
  Landmark,
  Kanban,
  HelpCircle,
  FileSpreadsheet,
  BarChart3,
};

const GRADIENT_MAP: Record<string, { bg: string; border: string; text: string; shadow: string }> = {
  hrm: { bg: "from-blue-500/15 to-indigo-500/5", border: "border-blue-500/30", text: "text-blue-600 dark:text-blue-400", shadow: "shadow-blue-500/10" },
  pos: { bg: "from-emerald-500/15 to-teal-500/5", border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400", shadow: "shadow-emerald-500/10" },
  inventory: { bg: "from-amber-500/15 to-orange-500/5", border: "border-amber-500/30", text: "text-amber-600 dark:text-amber-400", shadow: "shadow-amber-500/10" },
  crm: { bg: "from-purple-500/15 to-violet-500/5", border: "border-purple-500/30", text: "text-purple-600 dark:text-purple-400", shadow: "shadow-purple-500/10" },
  finance: { bg: "from-rose-500/15 to-pink-500/5", border: "border-rose-500/30", text: "text-rose-600 dark:text-rose-400", shadow: "shadow-rose-500/10" },
  project: { bg: "from-cyan-500/15 to-sky-500/5", border: "border-cyan-500/30", text: "text-cyan-600 dark:text-cyan-400", shadow: "shadow-cyan-500/10" },
  support: { bg: "from-orange-500/15 to-amber-500/5", border: "border-orange-500/30", text: "text-orange-600 dark:text-orange-400", shadow: "shadow-orange-500/10" },
  procurement: { bg: "from-lime-500/15 to-emerald-500/5", border: "border-lime-500/30", text: "text-lime-600 dark:text-lime-400", shadow: "shadow-lime-500/10" },
  analytics: { bg: "from-indigo-500/15 to-purple-500/5", border: "border-indigo-500/30", text: "text-indigo-600 dark:text-indigo-400", shadow: "shadow-indigo-500/10" },
};

function WorkspacePage() {
  const {
    profile,
    workspaceRole,
    allowedModules,
    loading,
    isWorkspaceAdmin,
    isSuperAdmin,
  } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          Loading workspace permissions & authorized modules...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in-50 duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border border-slate-700/50 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enterprise Workspace</span>
              </span>
              {workspaceRole && (
                <Badge variant="outline" className="text-xs bg-white/10 text-slate-200 border-white/20">
                  Role: {workspaceRole.name}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {profile?.full_name || "Team Member"}
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-2xl">
              Your role-governed ERP workspace. All module dashboards and action capabilities are dynamically synchronized with your assigned permissions.
            </p>
          </div>

          {(isWorkspaceAdmin || isSuperAdmin) && (
            <div className="flex items-center gap-3 shrink-0">
              <Button
                asChild
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25"
              >
                <Link to="/settings" search={{ tab: "workspace" } as any}>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  <span>Manage Roles & Permissions</span>
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modules Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Authorized ERP Dashboards
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Showing {allowedModules.length} permitted module{allowedModules.length === 1 ? "" : "s"} assigned to your role
            </p>
          </div>

          <Badge variant="secondary" className="px-3 py-1 font-mono text-xs">
            {allowedModules.length} Active Module{allowedModules.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {allowedModules.length === 0 ? (
          <Card className="border-dashed p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No Modules Permitted
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Your current role does not have permission to access any ERP module dashboards. Please request role permissions from your Workspace Administrator.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {allowedModules.map((mod) => {
              const Icon = ICON_MAP[mod.iconName] || Users;
              const style = GRADIENT_MAP[mod.key] || GRADIENT_MAP.hrm;

              return (
                <Link
                  key={mod.key}
                  to={mod.route as any}
                  className="group block focus:outline-none"
                >
                  <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:hover:border-slate-700 cursor-pointer overflow-hidden border border-slate-200 dark:border-slate-800/80 bg-card">
                    <div className={`h-1.5 w-full bg-gradient-to-r ${style.bg}`} />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${style.bg} border ${style.border} flex items-center justify-center ${style.text} shadow-sm group-hover:scale-105 transition-transform`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                          <ArrowRight className="w-4 h-4 -translate-x-1 group-hover:translate-x-0 transition-transform" />
                        </span>
                      </div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-3 group-hover:text-orange-500 transition-colors">
                        {mod.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {mod.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Authorized</span>
                        </span>
                        <code className="text-[10px] font-mono opacity-60">
                          {mod.route}
                        </code>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
