"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";
import { CountrySelect } from "@/components/ui/country-select";
import { PhoneInput } from "@/components/ui/phone-input";
import { CountryFlag } from "@/components/ui/country-flag";

export default function FormElementsPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState("India");
  const [phoneNumber, setPhoneNumber] = useState("+91 98765 43210");

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Form Elements</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Standard and enhanced input controls, password revealers, switches, file uploads, and validation feedback.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Forms Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Standard Input Fields */}
        <PreviewCard
          title="Text Inputs & Password Revealer"
          description="Standard inputs featuring leading micro-icons and togglable password security."
          code={`<div className="space-y-3">
  <div>
    <label className="text-xs font-semibold">Employee Email</label>
    <div className="relative">
      <i className="ph ph-envelope absolute left-3 top-3 text-muted-foreground" />
      <input type="email" placeholder="name@company.com" className="pl-9 p-2.5 w-full border rounded-md" />
    </div>
  </div>
</div>`}
        >
          <div className="space-y-4 p-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <i className="ph ph-envelope absolute left-3 top-2.5 text-muted-foreground text-sm" />
                <input
                  type="email"
                  defaultValue="alex.morgan@masterhrms.com"
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-muted/20 border border-border rounded-md text-foreground focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                System Access Password
              </label>
              <div className="relative">
                <i className="ph ph-lock-key absolute left-3 top-2.5 text-muted-foreground text-sm" />
                <input
                  type={showPassword ? "text" : "password"}
                  defaultValue="EnterpriseSec!2026"
                  className="w-full pl-9 pr-10 py-2 text-xs bg-muted/20 border border-border rounded-md text-foreground focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  <i className={`ph ${showPassword ? "ph-eye-slash" : "ph-eye"} text-sm`} />
                </button>
              </div>
            </div>
          </div>
        </PreviewCard>

        {/* 2. Checkboxes, Radios & Switches */}
        <PreviewCard
          title="Checkboxes, Radios & Switches"
          description="Native accessible selection primitives with custom Tailwind styling."
          code={`<label className="flex items-center gap-2 text-xs">
  <input type="checkbox" className="rounded text-primary" defaultChecked />
  <span>Enable Automatic Payroll Generation</span>
</label>`}
        >
          <div className="space-y-4 p-1">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground block">Notification Preferences</span>
              <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-border text-primary size-4 accent-primary" />
                <span>Notify manager on attendance regularization request</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-border text-primary size-4 accent-primary" />
                <span>Send WhatsApp alert on salary disbursement</span>
              </label>
            </div>

            <div className="pt-2 border-t border-border/50">
              <span className="text-xs font-semibold text-foreground block mb-2">Shift Type</span>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="shift" defaultChecked className="size-4 accent-primary" />
                  <span>General (09:00 - 18:00)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="shift" className="size-4 accent-primary" />
                  <span>Night Shift</span>
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Two-Factor Authentication (2FA)</p>
                <p className="text-[11px] text-muted-foreground">Enforce hardware passkey or authenticator TOTP</p>
              </div>
              <button
                type="button"
                onClick={() => setSwitchChecked(!switchChecked)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  switchChecked ? "bg-primary" : "bg-muted"
                }`}
                role="switch"
                aria-checked={switchChecked}
              >
                <span
                  className={`size-4 rounded-full bg-white absolute top-1 transition-transform ${
                    switchChecked ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </PreviewCard>

        {/* 3. Input Groups with Addons */}
        <PreviewCard
          title="Input Groups with Prefix / Suffix"
          description="Joined input groups for currency, domains, and phone country codes."
          code={`<div className="flex rounded-md shadow-xs">
  <span className="p-2.5 bg-muted border border-r-0 rounded-s-md text-xs">₹</span>
  <input type="number" placeholder="Salary" className="p-2 border rounded-e-md w-full" />
</div>`}
        >
          <div className="space-y-4 p-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Base Annual CTC
              </label>
              <div className="flex rounded-md shadow-xs">
                <span className="inline-flex items-center px-3 text-xs font-bold text-muted-foreground bg-muted border border-r-0 border-border rounded-s-md">
                  ₹
                </span>
                <input
                  type="text"
                  defaultValue="1,200,000"
                  className="flex-1 p-2 text-xs bg-muted/20 border border-border rounded-e-md text-foreground focus:outline-hidden focus:border-primary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Tenant Subdomain URL
              </label>
              <div className="flex rounded-md shadow-xs">
                <input
                  type="text"
                  defaultValue="falcon-corp"
                  className="flex-1 p-2 text-xs bg-muted/20 border border-r-0 border-border rounded-s-md text-foreground focus:outline-hidden focus:border-primary text-right font-mono"
                />
                <span className="inline-flex items-center px-3 text-xs font-medium text-muted-foreground bg-muted border border-border rounded-e-md">
                  .masterhrms.com
                </span>
              </div>
            </div>
          </div>
        </PreviewCard>

        {/* 4. Validation States */}
        <PreviewCard
          title="Validation Feedback States"
          description="Clear visual feedback for valid and invalid form submissions."
          code={`<input className="border-emerald-600 focus:ring-emerald-600" />
<span className="text-emerald-600 text-xs">Username available!</span>`}
        >
          <div className="space-y-4 p-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Employee Code (Valid)
              </label>
              <div className="relative">
                <input
                  type="text"
                  defaultValue="EMP-9024"
                  className="w-full p-2 pr-9 text-xs bg-emerald-50/20 border border-emerald-500 rounded-md text-foreground focus:outline-hidden font-mono"
                />
                <i className="ph ph-check-circle absolute right-3 top-2.5 text-emerald-600 text-base" />
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Employee code is unique and verified in payroll ledger.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Tax Identification Number (Error)
              </label>
              <div className="relative">
                <input
                  type="text"
                  defaultValue="INVALID-PAN-FORMAT"
                  className="w-full p-2 pr-9 text-xs bg-rose-50/20 border border-rose-500 rounded-md text-foreground focus:outline-hidden font-mono"
                />
                <i className="ph ph-warning-circle absolute right-3 top-2.5 text-rose-600 text-base" />
              </div>
              <p className="text-[11px] text-rose-600 font-medium mt-1">
                Invalid PAN format. Must match 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).
              </p>
            </div>
          </div>
        </PreviewCard>

        {/* 5. Country Flag Select & Mobile Dial Code Inputs */}
        <PreviewCard
          title="Country Flags & Mobile Dial Code Selectors"
          description="Country pickers with 255 SVG flags mapped to ISO country shortcodes, plus mobile phone inputs with interactive country dial code selectors."
          code={`<CountrySelect value={country} onValueChange={setCountry} />
<PhoneInput value={phone} onChange={setPhone} defaultCountry="IN" />
<CountryFlag country="IN" size="md" />`}
        >
          <div className="space-y-4 p-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Select Country (with Flag Preview & Search)
              </label>
              <CountrySelect
                value={selectedCountry}
                onValueChange={setSelectedCountry}
                placeholder="Choose Country"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Selected: <span className="font-semibold text-foreground">{selectedCountry}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Mobile Number (with Country Code Flag Selector)
              </label>
              <PhoneInput
                value={phoneNumber}
                onChange={setPhoneNumber}
                defaultCountry="IN"
                placeholder="98765 43210"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Parsed formatted value: <span className="font-mono text-foreground font-semibold">{phoneNumber || "Empty"}</span>
              </p>
            </div>

            <div className="pt-2 border-t border-border/40">
              <label className="block text-xs font-semibold text-foreground mb-2">
                Sample Country Flags by ISO Shortcode
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { code: "IN", name: "India" },
                  { code: "US", name: "USA" },
                  { code: "GB", name: "UK" },
                  { code: "AE", name: "UAE" },
                  { code: "SG", name: "Singapore" },
                  { code: "DE", name: "Germany" },
                  { code: "FR", name: "France" },
                  { code: "JP", name: "Japan" },
                  { code: "CA", name: "Canada" },
                  { code: "AU", name: "Australia" },
                ].map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/70 bg-muted/20 text-xs text-foreground"
                  >
                    <CountryFlag country={item.code} size="sm" />
                    <span className="font-medium">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">({item.code})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
