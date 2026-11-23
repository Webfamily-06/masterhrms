"use client";

import React from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UIImagesPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Images</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Responsive image treatments, aspect ratio containers, thumbnails, rounded corners, and figure captions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Responsive & Rounded Images */}
        <PreviewCard
          title="Responsive Images & Shapes"
          description="Adaptive width images with circular, rounded, and thumbnail borders."
          code={`<div className="flex items-center gap-4">
  <img src="/assets/img/avatar/avatar-04.jpg" className="w-24 h-24 rounded-full object-cover" alt="Circle" />
  <img src="/assets/img/avatar/avatar-06.jpg" className="w-24 h-24 rounded-2xl object-cover" alt="Rounded" />
  <img src="/assets/img/avatar/avatar-08.jpg" className="w-24 h-24 rounded-md p-1 border object-cover" alt="Thumbnail" />
</div>`}
        >
          <div className="flex flex-wrap items-center gap-6 p-2">
            <div className="text-center">
              <img
                src="/assets/img/avatar/avatar-04.jpg"
                className="w-24 h-24 rounded-full object-cover border-2 border-border shadow-xs inline-block"
                alt="Circle"
              />
              <p className="text-xs font-medium text-foreground mt-2">Circle Shape</p>
            </div>
            <div className="text-center">
              <img
                src="/assets/img/avatar/avatar-06.jpg"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-border shadow-xs inline-block"
                alt="Rounded"
              />
              <p className="text-xs font-medium text-foreground mt-2">Smooth 2xl Radius</p>
            </div>
            <div className="text-center">
              <img
                src="/assets/img/avatar/avatar-08.jpg"
                className="w-24 h-24 rounded-lg p-1 bg-card border border-border shadow-xs object-cover inline-block"
                alt="Thumbnail"
              />
              <p className="text-xs font-medium text-foreground mt-2">Padded Thumbnail</p>
            </div>
          </div>
        </PreviewCard>

        {/* 2. Aspect Ratio Containers & Captions */}
        <PreviewCard
          title="Aspect Ratio & Figures with Captions"
          description="Contained figures preventing cumulative layout shift (CLS)."
          code={`<figure className="rounded-lg overflow-hidden border bg-card">
  <div className="aspect-video w-full bg-slate-900 flex items-center justify-center text-white">
    <!-- Image or graphic -->
  </div>
  <figcaption className="p-3 text-xs text-muted-foreground text-center">
    Master HRMS Executive Conference Room
  </figcaption>
</figure>`}
        >
          <div className="p-1">
            <figure className="rounded-lg overflow-hidden border border-border/80 bg-card shadow-xs">
              <div className="aspect-video w-full bg-slate-900 flex flex-col items-center justify-center text-white p-4 relative">
                <i className="ph-duotone ph-buildings text-4xl text-primary mb-2" />
                <span className="text-sm font-semibold tracking-wide">Enterprise Headquarters Campus</span>
                <span className="text-[11px] text-slate-400">Aspect 16:9 Fluid Container</span>
              </div>
              <figcaption className="p-3 text-xs text-muted-foreground text-center bg-muted/20 border-t border-border/50">
                Figure 1.1: Master HRMS Bengaluru Operations Command Center
              </figcaption>
            </figure>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
