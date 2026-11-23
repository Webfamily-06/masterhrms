"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UIRangesliderPage() {
  const [basicVal, setBasicVal] = useState(45);
  const [salaryVal, setSalaryVal] = useState(75000);
  const [stepVal, setStepVal] = useState(20);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Range Slider</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Range sliders for numeric filtering, salary grade brackets, performance scores, and percentage thresholds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Advanced UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Basic Continuous Slider */}
        <PreviewCard
          title="Basic Percentage Range Slider"
          description="Continuous numerical range selection from 0% to 100%."
          code={`<input
  type="range"
  min="0"
  max="100"
  value={val}
  onChange={(e) => setVal(Number(e.target.value))}
  className="w-full accent-primary cursor-pointer"
/>`}
        >
          <div className="p-2 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground">Performance Target Progress</span>
              <span className="px-2 py-0.5 rounded font-bold bg-primary text-white text-xs">{basicVal}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={basicVal}
              onChange={(e) => setBasicVal(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
              <span>0% (Minimum)</span>
              <span>50%</span>
              <span>100% (Maximum)</span>
            </div>
          </div>
        </PreviewCard>

        {/* 2. Currency Bracket Slider */}
        <PreviewCard
          title="Salary Band Filter Slider"
          description="High-value numeric range step filter for compensation budgeting."
          code={`<input
  type="range"
  min="20000"
  max="250000"
  step="5000"
  value={salary}
  onChange={(e) => setSalary(Number(e.target.value))}
  className="w-full accent-emerald-600 cursor-pointer"
/>`}
        >
          <div className="p-2 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground">Monthly Salary Cap</span>
              <span className="px-2 py-0.5 rounded font-bold bg-emerald-600 text-white text-xs">
                ₹ {salaryVal.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="20000"
              max="250000"
              step="5000"
              value={salaryVal}
              onChange={(e) => setSalaryVal(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
              <span>₹ 20,000</span>
              <span>₹ 135,000</span>
              <span>₹ 250,000</span>
            </div>
          </div>
        </PreviewCard>

        {/* 3. Discrete Step Slider */}
        <PreviewCard
          title="Discrete Step Slider (Intervals of 10)"
          description="Fixed increments designed for leave entitlement quotas."
          code={`<input type="range" min="0" max="50" step="10" value={step} />`}
        >
          <div className="p-2 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground">Annual Paid Leaves (PL)</span>
              <span className="px-2 py-0.5 rounded font-bold bg-amber-500 text-white text-xs">{stepVal} Days</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="10"
              value={stepVal}
              onChange={(e) => setStepVal(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
              <span>0</span>
              <span>10</span>
              <span>20</span>
              <span>30</span>
              <span>40</span>
              <span>50</span>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
