import React, { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { useCurrentProfile } from "@/lib/session";
import { resolveDefaultRoute, extractRolesFromToken } from "@/lib/auth-navigation";
import { isTenantWorkspaceHost } from "@/lib/platform-domain";

export interface NotFoundViewProps {
  customTitle?: string;
  customMessage?: React.ReactNode;
}

export function NotFoundView({
  customTitle = "Oops, something went wrong",
  customMessage,
}: NotFoundViewProps) {
  const { data: profile } = useCurrentProfile();

  const targetHref = useMemo(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("hrms_auth_token") : null;
    const { roles } = extractRolesFromToken(token);
    const activeRoles = profile?.roles?.length ? profile.roles : roles;
    const isAuth = !!token && activeRoles.length > 0;
    const isTenant = typeof window !== "undefined" && isTenantWorkspaceHost();

    if (isAuth) {
      return resolveDefaultRoute(activeRoles);
    }
    if (isTenant) {
      return "/auth";
    }
    return "/";
  }, [profile]);

  return (
    <MarketingLayout>
      <div className="w-full flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 lg:py-20 text-center my-auto">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-6 shadow-2xs">
            <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
            <span>404 NOT FOUND</span>
          </div>

          {/* Sized & Responsive 404 Illustration */}
          <div className="w-full max-w-xs sm:max-w-md lg:max-w-lg mb-6 sm:mb-8 flex justify-center">
            <img
              src="/assets/img/bg/error-404.svg"
              alt="404 Page Not Found"
              className="w-full h-auto max-h-[200px] sm:max-h-[260px] md:max-h-[300px] lg:max-h-[340px] object-contain drop-shadow-sm select-none pointer-events-none"
              loading="eager"
            />
          </div>

          {/* Heading with clear hierarchy */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-3 sm:mb-4">
            {customTitle}
          </h1>

          {/* Supporting text */}
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-md sm:max-w-lg mx-auto mb-8 sm:mb-10 leading-relaxed">
            {customMessage || (
              <>
                Error 404 &bull; Page not found. Sorry, the page you are looking for doesn’t exist or has been moved.
              </>
            )}
          </p>

          {/* Action button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
            <Button
              size="lg"
              asChild
              className="w-full sm:w-auto font-semibold px-6 shadow-sm gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to={targetHref}>
                <ArrowLeft className="size-4" />
                <span>Back to Dashboard</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
