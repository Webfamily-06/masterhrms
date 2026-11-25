"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { IncomingCallProvider } from "@/context/incoming-call-context";
import { FullScreenIncomingCall } from "@/components/calling/full-screen-incoming-call";
import { FloatingMiniCallWidget } from "@/components/calling/floating-mini-call-widget";
import { FormDraftAutosaveProvider } from "@/src/components/providers/FormDraftAutosaveProvider";
import { WorkspaceSettingsProvider } from "@/src/context/workspace-settings-context";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceSettingsProvider>
        <IncomingCallProvider>
          {children}
          <FullScreenIncomingCall />
          <FloatingMiniCallWidget />
          <FormDraftAutosaveProvider />
          <Toaster richColors position="top-right" />
        </IncomingCallProvider>
      </WorkspaceSettingsProvider>
    </QueryClientProvider>
  );
}
