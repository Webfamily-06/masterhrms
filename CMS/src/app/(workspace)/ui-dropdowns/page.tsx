"use client";

import React, { useState, useRef, useEffect } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UIDropdownsPage() {
  const [openBasic, setOpenBasic] = useState(false);
  const [openIcon, setOpenIcon] = useState(false);
  const [openSplit, setOpenSplit] = useState(false);

  const basicRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (basicRef.current && !basicRef.current.contains(event.target as Node)) {
        setOpenBasic(false);
      }
      if (iconRef.current && !iconRef.current.contains(event.target as Node)) {
        setOpenIcon(false);
      }
      if (splitRef.current && !splitRef.current.contains(event.target as Node)) {
        setOpenSplit(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Dropdowns</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Contextual action overlays, split buttons, icons menus, and direction-aware menu popovers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Basic Action Dropdown */}
        <PreviewCard
          title="Basic Action Menu"
          description="Contextual action menu with smooth light-dismiss behavior."
          code={`<div className="relative inline-block">
  <button onClick={() => setOpen(!open)} className="btn btn-primary">
    Options <i className="ph ph-caret-down" />
  </button>
  {open && (
    <ul className="absolute left-0 mt-1 w-48 bg-card border rounded-md shadow-lg p-1">
      <li><a className="px-3 py-2 text-xs hover:bg-muted block">Edit Profile</a></li>
      <li><a className="px-3 py-2 text-xs hover:bg-muted block">Change Password</a></li>
    </ul>
  )}
</div>`}
        >
          <div className="p-2 min-h-[160px]">
            <div className="relative inline-block text-left" ref={basicRef}>
              <button
                type="button"
                onClick={() => setOpenBasic(!openBasic)}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors cursor-pointer"
                aria-expanded={openBasic}
              >
                <span>Actions Menu</span>
                <i className={`ph ph-caret-down text-xs transition-transform ${openBasic ? "rotate-180" : ""}`} />
              </button>

              {openBasic && (
                <div className="absolute left-0 mt-1.5 w-48 rounded-md bg-card border border-border/80 shadow-lg py-1 z-20 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <a href="#" className="block px-3.5 py-2 text-foreground hover:bg-muted transition-colors font-medium">
                    View Full Profile
                  </a>
                  <a href="#" className="block px-3.5 py-2 text-foreground hover:bg-muted transition-colors font-medium">
                    Download Payslip (PDF)
                  </a>
                  <a href="#" className="block px-3.5 py-2 text-foreground hover:bg-muted transition-colors font-medium">
                    Assign Assets
                  </a>
                  <div className="my-1 border-t border-border/60" />
                  <a href="#" className="block px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-medium">
                    Deactivate Account
                  </a>
                </div>
              )}
            </div>
          </div>
        </PreviewCard>

        {/* 2. Dropdown with Icons */}
        <PreviewCard
          title="Icon-Rich Dropdown"
          description="Action lists with leading Phosphor/Tabler icons for swift recognition."
          code={`<ul className="w-56 bg-card border rounded-lg p-1">
  <li className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted">
    <i className="ph ph-file-pdf" /> Export PDF
  </li>
</ul>`}
        >
          <div className="p-2 min-h-[160px]">
            <div className="relative inline-block text-left" ref={iconRef}>
              <button
                type="button"
                onClick={() => setOpenIcon(!openIcon)}
                className="inline-flex items-center gap-2 bg-card border border-border hover:bg-muted text-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors cursor-pointer"
                aria-expanded={openIcon}
              >
                <i className="ph ph-dots-three-vertical text-base" />
                <span>Export & Share</span>
              </button>

              {openIcon && (
                <div className="absolute left-0 mt-1.5 w-52 rounded-md bg-card border border-border/80 shadow-lg py-1 z-20 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Export Formats
                  </div>
                  <a href="#" className="flex items-center gap-2.5 px-3 py-2 text-foreground hover:bg-muted font-medium">
                    <i className="ph-duotone ph-file-pdf text-rose-500 text-sm" />
                    <span>Export to PDF</span>
                  </a>
                  <a href="#" className="flex items-center gap-2.5 px-3 py-2 text-foreground hover:bg-muted font-medium">
                    <i className="ph-duotone ph-file-xls text-emerald-600 text-sm" />
                    <span>Export to Excel (XLSX)</span>
                  </a>
                  <a href="#" className="flex items-center gap-2.5 px-3 py-2 text-foreground hover:bg-muted font-medium">
                    <i className="ph-duotone ph-file-csv text-sky-600 text-sm" />
                    <span>Export to CSV</span>
                  </a>
                  <div className="my-1 border-t border-border/60" />
                  <a href="#" className="flex items-center gap-2.5 px-3 py-2 text-foreground hover:bg-muted font-medium">
                    <i className="ph-duotone ph-printer text-muted-foreground text-sm" />
                    <span>Print Direct</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </PreviewCard>

        {/* 3. Split Button Dropdown */}
        <PreviewCard
          title="Split Action Button"
          description="Dual-function button with immediate primary action and auxiliary dropdown options."
          code={`<div className="inline-flex rounded-md shadow-xs">
  <button className="btn-primary rounded-s-md">Save Changes</button>
  <button className="btn-primary rounded-e-md border-l"><i className="ph ph-caret-down" /></button>
</div>`}
        >
          <div className="p-2 min-h-[160px]">
            <div className="relative inline-flex rounded-md shadow-xs" ref={splitRef}>
              <button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-s-md cursor-pointer"
              >
                Approve Timesheet
              </button>
              <button
                type="button"
                onClick={() => setOpenSplit(!openSplit)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-2 rounded-e-md border-l border-emerald-500/50 cursor-pointer"
                aria-label="More approval options"
              >
                <i className="ph ph-caret-down text-xs" />
              </button>

              {openSplit && (
                <div className="absolute left-0 top-full mt-1.5 w-48 rounded-md bg-card border border-border/80 shadow-lg py-1 z-20 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <a href="#" className="block px-3 py-2 text-foreground hover:bg-muted font-medium">
                    Approve with Comment
                  </a>
                  <a href="#" className="block px-3 py-2 text-foreground hover:bg-muted font-medium">
                    Request Regularization
                  </a>
                  <div className="my-1 border-t border-border/60" />
                  <a href="#" className="block px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium">
                    Reject Timesheet
                  </a>
                </div>
              )}
            </div>
          </div>
        </PreviewCard>

        {/* 4. Dropup Position */}
        <PreviewCard
          title="Dropup Menu Placement"
          description="Menu oriented to open upwards, ideal for fixed bottom toolbars and tables."
          code={`<div className="relative inline-block">
  <button className="btn btn-secondary">Dropup</button>
  <div className="absolute bottom-full mb-1 w-48 bg-card border rounded-md">
    <!-- Links -->
  </div>
</div>`}
        >
          <div className="p-2 flex items-end min-h-[160px]">
            <div className="relative inline-block">
              <div className="absolute bottom-full mb-1.5 left-0 w-44 rounded-md bg-card border border-border/80 shadow-lg py-1 z-20 text-xs">
                <a href="#" className="block px-3 py-1.5 text-foreground hover:bg-muted font-medium">
                  Bottom Rail Action 1
                </a>
                <a href="#" className="block px-3 py-1.5 text-foreground hover:bg-muted font-medium">
                  Bottom Rail Action 2
                </a>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-md"
              >
                <span>Dropup Trigger</span>
                <i className="ph ph-caret-up text-xs" />
              </button>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
