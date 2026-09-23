import { NotFoundView } from "@/components/error-pages/not-found-view";
import { ServerErrorView } from "@/components/error-pages/server-error-view";
import type { ReactNode } from "react";
import "@/styles.css";
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { Toaster } from "@/components/ui/sonner";
import { OfflineBanner, SessionExpiredModal } from "@/components/system-states";

function NotFoundComponent() {
  return <NotFoundView />;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return <ServerErrorView error={error} reset={reset} />;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Master HRMS — Modern HRMS for growing teams" },
      {
        name: "description",
        content:
          "Master HRMS is an all-in-one HRMS platform for employee management, attendance, leave, and payroll — built for modern companies.",
      },
      { property: "og:title", content: "Master HRMS — Modern HRMS for growing teams" },
      {
        property: "og:description",
        content: "Employees, attendance, leave, and payroll in one clean workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", type: "image/webp", href: "/favicon.webp" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Public+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Inter:wght@400;500;600;700;800&display=swap" },
      { rel: "stylesheet", href: "/ui-assets/libs/@phosphor-icons/web/duotone/style.css" },
      { rel: "stylesheet", href: "/ui-assets/libs/@phosphor-icons/web/regular/style.css" },
      { rel: "stylesheet", href: "/ui-assets/libs/@phosphor-icons/web/fill/style.css" },
      { rel: "stylesheet", href: "/ui-assets/libs/lucide-static/font/lucide.css" },
      { rel: "stylesheet", href: "/ui-assets/libs/@fortawesome/fontawesome-free/css/fontawesome.min.css" },
      { rel: "stylesheet", href: "/ui-assets/libs/@fortawesome/fontawesome-free/css/all.min.css" },
      { rel: "stylesheet", href: "/ui-assets/css/style.css" }
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Synchronous 0ms Head Script to prevent color glitch & dark theme FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem("theme");
                  if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
                    document.documentElement.classList.add("dark"); document.documentElement.setAttribute("data-theme", "dark");
                  } else {
                    document.documentElement.classList.remove("dark"); document.documentElement.removeAttribute("data-theme");
                  }
                  var c = localStorage.getItem("master_hrms_primary_color");
                  if (c) document.documentElement.style.setProperty("--primary", c);
                  var f = localStorage.getItem("master_hrms_font_family");
                  if (f) document.body.style.fontFamily = "'" + f + "', 'Public Sans', Inter, sans-serif";
                  var icon = localStorage.getItem("master_hrms_favicon") || "/favicon.webp";
                  var link = document.querySelector("link[rel*='icon']");
                  if (link) {
                    link.href = icon;
                  }
                } catch(e){}
              })();
            `,
          }}
        />
      </head>
      <body style={{ fontFamily: "'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function PlatformFaviconSync() {
  const { data } = useQuery({
    queryKey: ["realtime-platform-settings-favicon"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    if (!data) return;

    // 1. Dynamic Favicon Sync & Cache
    if (data.faviconUrl) {
      try {
        localStorage.setItem("master_hrms_favicon", data.faviconUrl);
      } catch (e) {}
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = data.faviconUrl;
    }

    // 2. Dynamic Primary Theme Color Accent Sync & Cache
    if (data.primaryThemeColor) {
      document.documentElement.style.setProperty("--primary", data.primaryThemeColor);
      try {
        localStorage.setItem("master_hrms_primary_color", data.primaryThemeColor);
      } catch (e) {}
    }

    // 3. Dynamic Font Family Sync & Cache
    if (data.fontFamily) {
      document.body.style.fontFamily = `'${data.fontFamily}', Inter, sans-serif`;
      try {
        localStorage.setItem("master_hrms_font_family", data.fontFamily);
      } catch (e) {}
    }

    // 4. Dynamic Logo & App Name Cache
    if (data.logoLightUrl) {
      try {
        localStorage.setItem("master_hrms_logo_light", data.logoLightUrl);
      } catch (e) {}
    }
    if (data.logoDarkUrl) {
      try {
        localStorage.setItem("master_hrms_logo_dark", data.logoDarkUrl);
      } catch (e) {}
    }
    if (data.appName) {
      try {
        localStorage.setItem("master_hrms_app_name", data.appName);
      } catch (e) {}
    }
  }, [data]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <PlatformFaviconSync />
      <OfflineBanner />
      <SessionExpiredModal />
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
