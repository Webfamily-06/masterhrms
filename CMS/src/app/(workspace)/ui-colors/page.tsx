"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

interface ColorSwatch {
  name: string;
  variable: string;
  hex: string;
  classBg: string;
  textDark?: boolean;
}

export default function UIColorsPage() {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const colors: ColorSwatch[] = [
    { name: "Primary", variable: "--primary", hex: "#0d6efd", classBg: "bg-primary text-white" },
    { name: "Dark / Slate", variable: "--dark", hex: "#0f172a", classBg: "bg-slate-900 text-white" },
    { name: "Success", variable: "--success", hex: "#16a34a", classBg: "bg-emerald-600 text-white" },
    { name: "Warning", variable: "--warning", hex: "#f59e0b", classBg: "bg-amber-500 text-white" },
    { name: "Danger / Error", variable: "--danger", hex: "#e11d48", classBg: "bg-rose-600 text-white" },
    { name: "Info", variable: "--info", hex: "#0284c7", classBg: "bg-sky-600 text-white" },
    { name: "Secondary", variable: "--secondary", hex: "#64748b", classBg: "bg-slate-500 text-white" },
    { name: "Light / Surface", variable: "--muted", hex: "#f1f5f9", classBg: "bg-slate-100 text-slate-800 border border-slate-200", textDark: true },
  ];

  const handleCopy = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 1800);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Colors</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            DreamsERP theme color palette, contrast rations, semantic status codes, and CSS token mappings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Core Palette Swatches */}
        <PreviewCard
          title="Theme Semantic Swatches"
          description="Click any swatch card to copy its hexadecimal color token directly."
          code={`<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
  <div className="p-4 rounded-lg bg-primary text-white">Primary (#0d6efd)</div>
  <div className="p-4 rounded-lg bg-emerald-600 text-white">Success (#16a34a)</div>
</div>`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-1">
            {colors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => handleCopy(c.hex)}
                className={`p-3.5 rounded-lg text-left transition-all hover:scale-[1.02] shadow-xs cursor-pointer ${c.classBg}`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold">{c.name}</span>
                  {copiedColor === c.hex ? (
                    <span className="text-[10px] bg-black/40 text-white px-1.5 py-0.5 rounded">Copied!</span>
                  ) : (
                    <i className="ph ph-copy text-xs opacity-70" />
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-[11px] font-mono opacity-90">{c.hex}</p>
                  <p className="text-[10px] font-mono opacity-70">{c.variable}</p>
                </div>
              </button>
            ))}
          </div>
        </PreviewCard>

        {/* 2. Soft & Transparent Palette */}
        <PreviewCard
          title="Soft Transparent Tones (10% Alpha)"
          description="Subtle background fills paired with high-contrast text for badges and alerts."
          code={`<div className="p-3 rounded-md bg-primary/10 text-primary font-medium">Primary Soft</div>
<div className="p-3 rounded-md bg-emerald-500/10 text-emerald-600 font-medium">Success Soft</div>`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
            <div className="p-3 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
              Primary Soft
              <p className="text-[10px] font-normal opacity-80 mt-1">bg-primary/10</p>
            </div>
            <div className="p-3 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              Success Soft
              <p className="text-[10px] font-normal opacity-80 mt-1">bg-emerald-500/10</p>
            </div>
            <div className="p-3 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold">
              Warning Soft
              <p className="text-[10px] font-normal opacity-80 mt-1">bg-amber-500/10</p>
            </div>
            <div className="p-3 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold">
              Danger Soft
              <p className="text-[10px] font-normal opacity-80 mt-1">bg-rose-500/10</p>
            </div>
            <div className="p-3 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-semibold">
              Info Soft
              <p className="text-[10px] font-normal opacity-80 mt-1">bg-sky-500/10</p>
            </div>
            <div className="p-3 rounded-md bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 text-xs font-semibold">
              Slate Soft
              <p className="text-[10px] font-normal opacity-80 mt-1">bg-slate-500/10</p>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
