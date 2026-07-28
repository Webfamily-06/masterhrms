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
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again or go back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
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
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
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
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                  var c = localStorage.getItem("master_hrms_primary_color");
                  if (c) document.documentElement.style.setProperty("--primary", c);
                  var f = localStorage.getItem("master_hrms_font_family");
                  if (f) document.body.style.fontFamily = "'" + f + "', Inter, sans-serif";
                  var icon = localStorage.getItem("master_hrms_favicon");
                  if (icon) {
                    var link = document.querySelector("link[rel*='icon']");
                    if (link) link.href = icon;
                  }
                } catch(e){}
              })();
            `,
          }}
        />
      </head>
      <body style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
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
      const { data } = await supabase
        .from("cms_pages")
        .select("content")
        .eq("slug", "system-platform-settings")
        .maybeSingle();
      return (data?.content as any) || null;
    },
  });

  useEffect(() => {
    if (!data) return;

    // 1. Dynamic Favicon Sync & Cache
    if (data.faviconUrl) {
      try { localStorage.setItem("master_hrms_favicon", data.faviconUrl); } catch (e) {}
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
      try { localStorage.setItem("master_hrms_primary_color", data.primaryThemeColor); } catch (e) {}
    }

    // 3. Dynamic Font Family Sync & Cache
    if (data.fontFamily) {
      document.body.style.fontFamily = `'${data.fontFamily}', Inter, sans-serif`;
      try { localStorage.setItem("master_hrms_font_family", data.fontFamily); } catch (e) {}
    }

    // 4. Dynamic Logo & App Name Cache
    if (data.logoLightUrl) {
      try { localStorage.setItem("master_hrms_logo_light", data.logoLightUrl); } catch (e) {}
    }
    if (data.logoDarkUrl) {
      try { localStorage.setItem("master_hrms_logo_dark", data.logoDarkUrl); } catch (e) {}
    }
    if (data.appName) {
      try { localStorage.setItem("master_hrms_app_name", data.appName); } catch (e) {}
    }
  }, [data]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <PlatformFaviconSync />
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
