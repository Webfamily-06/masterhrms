import React from "react";
import { Home, RefreshCw, ArrowLeft, Compass, AlertCircle } from "lucide-react";

export interface NotFoundViewProps {
  customTitle?: string;
  customMessage?: string;
}

export function NotFoundView({
  customTitle = "Oops! Page Not Found",
  customMessage = "The page you are looking for has been moved, deleted, or never existed in the Master ERP system.",
}: NotFoundViewProps) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 relative overflow-hidden font-sans">
      {/* Background Animated Gradient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-primary/15 via-purple-500/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '5s' }} />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

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
          />
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-foreground">
              Master ERP
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              Enterprise Suite
            </span>
          </div>
        </a>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            404 NOT FOUND
          </span>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="w-full max-w-xl mx-auto px-6 py-10 flex flex-col items-center text-center relative z-10 my-auto">
        {/* Animated Illustration Stack */}
        <div className="relative w-full max-w-xs mx-auto flex items-center justify-center mb-6">
          {/* Glowing Pulse Rings */}
          <div className="absolute inset-0 m-auto w-64 h-64 rounded-full border border-primary/20 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-0 m-auto w-48 h-48 rounded-full border border-primary/30 animate-pulse pointer-events-none" />

          {/* Main 404 Illustration */}
          <img
            src="/images/pages/404.png"
            alt="404 Page Not Found"
            className="w-64 sm:w-72 h-auto object-contain select-none drop-shadow-2xl animate-in zoom-in-95 duration-500 relative z-10"
            onError={(e) => {
              // Fallback SVG in case image file is missing
              (e.target as HTMLElement).style.display = "none";
            }}
          />

          {/* Floating Decorative 3D Object */}
          <img
            src="/images/pages/misc-404-object.png"
            alt="Floating Element"
            className="absolute -top-4 right-2 w-14 sm:w-16 h-auto object-contain select-none pointer-events-none z-20 animate-bounce"
            style={{ animationDuration: '3s' }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>

        {/* Text Details */}
        <div className="space-y-2 mb-8 max-w-md">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {customTitle}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {customMessage}
          </p>
        </div>

        {/* 2 Primary Buttons: Home and Reload */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-sm">
          <a
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </a>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-semibold text-sm border border-border bg-card/80 hover:bg-card hover:border-primary/50 text-foreground shadow-xs transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
        </div>

        {/* Subtle Go Back Link */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to previous page
          </button>
        </div>
      </main>

      {/* Decorative Tree Pot bottom corner */}
      <img
        src="/images/pages/tree-pot.png"
        alt="Decorative Tree Pot"
        className="absolute bottom-0 left-6 w-20 h-auto object-contain opacity-35 hidden md:block select-none pointer-events-none"
        onError={(e) => {
          (e.target as HTMLElement).style.display = "none";
        }}
      />

      {/* Clean Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-4 border-t border-border/40 text-center text-xs text-muted-foreground relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© 2026 Master ERP Enterprise Systems. All rights reserved.</span>
        <div className="flex items-center gap-4 text-xs">
          <a href="/pos" className="hover:text-foreground transition-colors">POS Terminal</a>
          <a href="/integrations" className="hover:text-foreground transition-colors">WooCommerce</a>
          <a href="/shopify" className="hover:text-foreground transition-colors">Shopify</a>
          <a href="/maintenance" className="hover:text-foreground transition-colors">System Status</a>
        </div>
      </footer>
    </div>
  );
}
