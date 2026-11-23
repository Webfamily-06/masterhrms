"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UIPaginationPage() {
  const [currentPage, setCurrentPage] = useState(2);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Pagination</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pagination controls for multi-page tables, data grids, employee registers, and document indexes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Base UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Basic Numbered Pagination */}
        <PreviewCard
          title="Basic Numbered Pagination"
          description="Classic numbered sequence with previous, active, and next controls."
          code={`<nav aria-label="Page navigation">
  <ul className="flex items-center gap-1 text-xs">
    <li><button className="px-3 py-1.5 border rounded-md">Previous</button></li>
    <li><button className="px-3 py-1.5 bg-primary text-white rounded-md">1</button></li>
    <li><button className="px-3 py-1.5 border rounded-md">2</button></li>
    <li><button className="px-3 py-1.5 border rounded-md">Next</button></li>
  </ul>
</nav>`}
        >
          <div className="p-2">
            <nav aria-label="Pagination Navigation">
              <ul className="flex items-center gap-1.5 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-border rounded-md font-medium text-foreground bg-card hover:bg-muted disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    Previous
                  </button>
                </li>
                {[1, 2, 3, 4, 5].map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`size-8 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                        currentPage === p
                          ? "bg-primary text-white"
                          : "border border-border text-foreground bg-card hover:bg-muted"
                      }`}
                    >
                      {p}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.min(5, currentPage + 1))}
                    disabled={currentPage === 5}
                    className="px-3 py-1.5 border border-border rounded-md font-medium text-foreground bg-card hover:bg-muted disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
            <p className="text-xs text-muted-foreground mt-3">
              Viewing page <strong className="text-foreground">{currentPage}</strong> of 5
            </p>
          </div>
        </PreviewCard>

        {/* 2. Rounded Pill Pagination with Icons */}
        <PreviewCard
          title="Rounded Pill Pagination with Icons"
          description="Streamlined pagination utilizing micro chevron symbols."
          code={`<ul className="flex items-center gap-1">
  <li><button className="rounded-full size-8"><i className="ph ph-caret-left" /></button></li>
  <li><button className="rounded-full size-8 bg-primary text-white">1</button></li>
  <li><button className="rounded-full size-8"><i className="ph ph-caret-right" /></button></li>
</ul>`}
        >
          <div className="p-2">
            <ul className="flex items-center gap-1.5 text-xs">
              <li>
                <button
                  type="button"
                  className="size-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted cursor-pointer"
                  aria-label="Previous"
                >
                  <i className="ph ph-caret-left text-xs" />
                </button>
              </li>
              <li>
                <button type="button" className="size-8 rounded-full bg-primary text-white font-semibold cursor-pointer">
                  1
                </button>
              </li>
              <li>
                <button type="button" className="size-8 rounded-full border border-border text-foreground hover:bg-muted font-semibold cursor-pointer">
                  2
                </button>
              </li>
              <li>
                <button type="button" className="size-8 rounded-full border border-border text-foreground hover:bg-muted font-semibold cursor-pointer">
                  3
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="size-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted cursor-pointer"
                  aria-label="Next"
                >
                  <i className="ph ph-caret-right text-xs" />
                </button>
              </li>
            </ul>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
