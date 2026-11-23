"use client";

import React from "react";
import { PreviewCard } from "@/components/ui/preview-card";
import Image from "next/image";

export default function UIAvatarPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Avatar</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Avatar component variants representing user profiles, shapes, status indicators, and stacked groups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Sizing Variants */}
        <PreviewCard
          title="Avatar Sizes"
          description="Six calibrated sizing tiers from xs (24px) to xxl (64px)."
          code={`<div className="flex items-center gap-4">
  <img src="/assets/img/avatar/avatar-02.jpg" className="size-6 rounded-full" alt="xs" />
  <img src="/assets/img/avatar/avatar-02.jpg" className="size-8 rounded-full" alt="sm" />
  <img src="/assets/img/avatar/avatar-02.jpg" className="size-10 rounded-full" alt="md" />
  <img src="/assets/img/avatar/avatar-02.jpg" className="size-12 rounded-full" alt="lg" />
  <img src="/assets/img/avatar/avatar-02.jpg" className="size-14 rounded-full" alt="xl" />
  <img src="/assets/img/avatar/avatar-02.jpg" className="size-16 rounded-full" alt="xxl" />
</div>`}
        >
          <div className="flex flex-wrap items-end gap-4 p-2">
            <div className="text-center">
              <img src="/assets/img/avatar/avatar-02.jpg" className="size-6 rounded-full object-cover border border-border inline-block" alt="xs" />
              <p className="text-[10px] text-muted-foreground mt-1">xs (24px)</p>
            </div>
            <div className="text-center">
              <img src="/assets/img/avatar/avatar-04.jpg" className="size-8 rounded-full object-cover border border-border inline-block" alt="sm" />
              <p className="text-[10px] text-muted-foreground mt-1">sm (32px)</p>
            </div>
            <div className="text-center">
              <img src="/assets/img/avatar/avatar-06.jpg" className="size-10 rounded-full object-cover border border-border inline-block" alt="md" />
              <p className="text-[10px] text-muted-foreground mt-1">md (40px)</p>
            </div>
            <div className="text-center">
              <img src="/assets/img/avatar/avatar-08.jpg" className="size-12 rounded-full object-cover border border-border inline-block" alt="lg" />
              <p className="text-[10px] text-muted-foreground mt-1">lg (48px)</p>
            </div>
            <div className="text-center">
              <img src="/assets/img/avatar/avatar-10.jpg" className="size-14 rounded-full object-cover border border-border inline-block" alt="xl" />
              <p className="text-[10px] text-muted-foreground mt-1">xl (56px)</p>
            </div>
            <div className="text-center">
              <img src="/assets/img/avatar/avatar-12.jpg" className="size-16 rounded-full object-cover border border-border inline-block" alt="xxl" />
              <p className="text-[10px] text-muted-foreground mt-1">xxl (64px)</p>
            </div>
          </div>
        </PreviewCard>

        {/* 2. Shape Variants */}
        <PreviewCard
          title="Avatar Shapes"
          description="Support for circular, soft rounded-corner, and square avatar aesthetics."
          code={`<div className="flex items-center gap-4">
  <img src="/assets/img/avatar/avatar-05.jpg" className="size-12 rounded-full" alt="Circle" />
  <img src="/assets/img/avatar/avatar-05.jpg" className="size-12 rounded-xl" alt="Rounded" />
  <img src="/assets/img/avatar/avatar-05.jpg" className="size-12 rounded-none" alt="Square" />
</div>`}
        >
          <div className="flex flex-wrap items-center gap-6 p-2">
            <div className="text-center">
              <img src="/assets/img/avatar/avatar-05.jpg" className="size-12 rounded-full object-cover border border-border inline-block shadow-xs" alt="Circle" />
              <p className="text-[11px] font-medium text-foreground mt-1.5">Circle</p>
            </div>
            <div className="text-center">
              <img src="/assets/img/avatar/avatar-07.jpg" className="size-12 rounded-xl object-cover border border-border inline-block shadow-xs" alt="Rounded" />
              <p className="text-[11px] font-medium text-foreground mt-1.5">Rounded</p>
            </div>
            <div className="text-center">
              <img src="/assets/img/avatar/avatar-09.jpg" className="size-12 rounded-none object-cover border border-border inline-block shadow-xs" alt="Square" />
              <p className="text-[11px] font-medium text-foreground mt-1.5">Square</p>
            </div>
          </div>
        </PreviewCard>

        {/* 3. Status Indicators */}
        <PreviewCard
          title="Status & Presence Indicators"
          description="Realtime presence badges denoting online, offline, away, or busy states."
          code={`<div className="relative inline-block">
  <img src="/assets/img/avatar/avatar-01.jpg" className="size-11 rounded-full" alt="Online" />
  <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-white" />
</div>`}
        >
          <div className="flex flex-wrap items-center gap-6 p-2">
            <div className="relative inline-block">
              <img src="/assets/img/avatar/avatar-01.jpg" className="size-11 rounded-full object-cover border border-border" alt="Online" />
              <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-background" title="Online" />
            </div>
            <div className="relative inline-block">
              <img src="/assets/img/avatar/avatar-03.jpg" className="size-11 rounded-full object-cover border border-border" alt="Away" />
              <span className="absolute bottom-0 right-0 size-3 rounded-full bg-amber-500 ring-2 ring-background" title="Away" />
            </div>
            <div className="relative inline-block">
              <img src="/assets/img/avatar/avatar-05.jpg" className="size-11 rounded-full object-cover border border-border" alt="Busy" />
              <span className="absolute bottom-0 right-0 size-3 rounded-full bg-rose-500 ring-2 ring-background" title="Do Not Disturb" />
            </div>
            <div className="relative inline-block">
              <img src="/assets/img/avatar/avatar-07.jpg" className="size-11 rounded-full object-cover border border-border" alt="Offline" />
              <span className="absolute bottom-0 right-0 size-3 rounded-full bg-slate-400 ring-2 ring-background" title="Offline" />
            </div>
          </div>
        </PreviewCard>

        {/* 4. Avatar Groups & Stacked Overlays */}
        <PreviewCard
          title="Stacked Avatar Groups"
          description="Overlapping avatar clusters representing collaborative teams or task assignees."
          code={`<div className="flex -space-x-2">
  <img src="/assets/img/avatar/avatar-01.jpg" className="size-9 rounded-full ring-2 ring-background" />
  <img src="/assets/img/avatar/avatar-02.jpg" className="size-9 rounded-full ring-2 ring-background" />
  <img src="/assets/img/avatar/avatar-03.jpg" className="size-9 rounded-full ring-2 ring-background" />
  <span className="size-9 rounded-full bg-primary text-white text-xs font-semibold ring-2 ring-background flex items-center justify-center">+4</span>
</div>`}
        >
          <div className="space-y-4 p-2">
            <div className="flex -space-x-2 overflow-hidden items-center">
              <img src="/assets/img/avatar/avatar-01.jpg" className="inline-block size-9 rounded-full ring-2 ring-background object-cover" alt="Member 1" />
              <img src="/assets/img/avatar/avatar-02.jpg" className="inline-block size-9 rounded-full ring-2 ring-background object-cover" alt="Member 2" />
              <img src="/assets/img/avatar/avatar-03.jpg" className="inline-block size-9 rounded-full ring-2 ring-background object-cover" alt="Member 3" />
              <img src="/assets/img/avatar/avatar-04.jpg" className="inline-block size-9 rounded-full ring-2 ring-background object-cover" alt="Member 4" />
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-white text-xs font-bold ring-2 ring-background">
                +6
              </span>
            </div>

            {/* Initials Fallbacks */}
            <div className="flex -space-x-2 overflow-hidden items-center">
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-sky-500 text-white text-xs font-bold ring-2 ring-background">
                JD
              </span>
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-purple-500 text-white text-xs font-bold ring-2 ring-background">
                RK
              </span>
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold ring-2 ring-background">
                SL
              </span>
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold ring-2 ring-background">
                AK
              </span>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
