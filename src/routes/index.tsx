import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

function getCmsTargetUrl(): string {
  if (typeof window === "undefined") return "/";
  const { protocol, hostname, port, search, hash } = window.location;
  // If running on Vite port 5173 in local development, redirect to Next.js CMS on port 3000
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost")) {
    return `${protocol}//${hostname}:3000${search}${hash}`;
  }
  // In staging or production, never append :3000 and never redirect to localhost!
  const configuredAppUrl = (import.meta as any).env?.VITE_APP_URL || (import.meta as any).env?.VITE_PUBLIC_URL;
  if (configuredAppUrl && !configuredAppUrl.includes("localhost")) {
    return `${configuredAppUrl.replace(/\/+$/, "")}/${search}${hash}`;
  }
  // Same-origin root (without :3000 port leak)
  return `${protocol}//${hostname}${port && port !== "80" && port !== "443" && port !== "5173" ? `:${port}` : ""}/${search}${hash}`;
}

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const target = getCmsTargetUrl();
      if (target && target !== window.location.href) {
        window.location.replace(target);
      }
    }
  },
  component: RedirectToCmsLanding,
  head: () => ({
    meta: [
      { title: "Redirecting to Webfamily CMS..." },
      // Note: Do NOT use a hardcoded meta http-equiv="refresh" with localhost:3000.
      // In production, hardcoded localhost meta tags break external user browsing.
    ],
  }),
});

function RedirectToCmsLanding() {
  const [targetUrl, setTargetUrl] = useState("/");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const target = getCmsTargetUrl();
      setTargetUrl(target);
      if (target && target !== window.location.href) {
        window.location.replace(target);
      }
    }
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#070b14] text-white">
      <div className="text-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto" />
        <p className="text-base font-medium text-slate-300">Redirecting to Webfamily CMS...</p>
        <p className="text-xs text-slate-500">
          If you are not redirected automatically,{" "}
          <a href={targetUrl} className="text-blue-400 hover:underline">
            click here to proceed
          </a>
          .
        </p>
      </div>
    </div>
  );
}
