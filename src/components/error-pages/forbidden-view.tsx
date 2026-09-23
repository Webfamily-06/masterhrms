import React from "react";
import { ShieldAlert, ArrowLeft, Home, KeyRound, LifeBuoy, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ForbiddenViewProps {
  customTitle?: string;
  customMessage?: string;
  requiredRole?: string;
  requiredPermission?: string;
}

export function ForbiddenView({
  customTitle = "403 — Access Forbidden",
  customMessage = "You do not have the required administrative role or permissions to access this enterprise module.",
  requiredRole,
  requiredPermission,
}: ForbiddenViewProps) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between selection:bg-rose-500/20 relative overflow-hidden font-sans">
      {/* Background Animated Gradient Orb */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-rose-500/15 via-red-500/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDuration: "5s" }}
      />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Application Navbar */}
      <header className="w-full max-w-5xl mx-auto px-6 py-5 flex items-center justify-between border-b border-border/40 relative z-10">
        <a href="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo.webp"
            alt="Master ERP"
            className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
           loading="lazy"/>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-foreground">
              Master ERP
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              Security Boundary
            </span>
          </div>
        </a>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="px-3 py-1 font-mono text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1.5"
          >
            <span className="size-2 rounded-full bg-rose-500 animate-ping" />
            403 FORBIDDEN
          </Badge>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="w-full max-w-xl mx-auto px-6 py-10 flex flex-col items-center text-center relative z-10 my-auto">
        {/* Animated Icon Container */}
        <div className="relative mb-6">
          <div className="size-24 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-xl shadow-rose-500/10">
            <ShieldAlert className="size-12 stroke-[1.75]" />
          </div>
          <div className="absolute -bottom-2 -right-2 size-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-md">
            <Lock className="size-4" />
          </div>
        </div>

        {/* Header Text */}
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mb-3">
          {customTitle}
        </h1>
        <p className="text-base text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
          {customMessage}
        </p>

        {/* Security Details Card if permissions provided */}
        {(requiredRole || requiredPermission) && (
          <div className="mb-6 p-3.5 rounded-xl bg-muted/60 border border-border/80 text-xs text-left max-w-sm w-full space-y-2 shadow-xs">
            {requiredRole && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Required Role:</span>
                <Badge variant="secondary" className="font-mono text-[11px] capitalize">
                  {requiredRole}
                </Badge>
              </div>
            )}
            {requiredPermission && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Permission Slug:</span>
                <code className="bg-background px-2 py-0.5 rounded border font-mono text-[11px] text-rose-600 dark:text-rose-400">
                  {requiredPermission}
                </code>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
          <Button
            size="lg"
            className="w-full sm:w-auto gap-2 font-semibold shadow-md bg-primary hover:bg-primary/90 text-white"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
          >
            <Home className="size-4" /> Return to Dashboard
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto gap-2 font-medium"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = "/dashboard";
              }
            }}
          >
            <ArrowLeft className="size-4" /> Previous Page
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-full sm:w-auto gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              window.location.href = "/auth";
            }}
          >
            <KeyRound className="size-4" /> Switch Account
          </Button>
        </div>

        {/* Support helper */}
        <div className="mt-8 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <LifeBuoy className="size-3.5 text-muted-foreground" />
          <span>Think this is a mistake? Contact your tenant administrator or HR department.</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-border/40 text-xs text-muted-foreground relative z-10 gap-2">
        <span>&copy; {new Date().getFullYear()} Master ERP. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <a href="/support-dashboard" className="hover:underline hover:text-foreground transition-colors">
            Help Desk
          </a>
          <a href="/legal/security" className="hover:underline hover:text-foreground transition-colors">
            Security Policy
          </a>
        </div>
      </footer>
    </div>
  );
}
