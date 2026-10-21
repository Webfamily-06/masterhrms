import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

function getCmsTargetUrl(): string {
  if (typeof window === "undefined") return "http://localhost:3000";
  const { protocol, hostname, search, hash } = window.location;
  // If running on Vite port 5173, redirect to Next.js CMS on port 3000 preserving hostname and parameters
  return `${protocol}//${hostname}:3000${search}${hash}`;
}

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      window.location.replace(getCmsTargetUrl());
    }
  },
  component: RedirectToCmsLanding,
  head: () => ({
    meta: [
      { title: "Redirecting to Webfamily CMS..." },
      { "http-equiv": "refresh", content: "0;url=http://localhost:3000" },
    ],
  }),
});

function RedirectToCmsLanding() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace(getCmsTargetUrl());
    }
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#070b14] text-white">
      <div className="text-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto" />
        <p className="text-base font-medium text-slate-300">Redirecting to Webfamily CMS...</p>
        <p className="text-xs text-slate-500">
          If you are not redirected automatically,{" "}
          <a href="http://localhost:3000" className="text-blue-400 hover:underline">
            click here to open http://localhost:3000
          </a>
          .
        </p>
      </div>
    </div>
  );
}
