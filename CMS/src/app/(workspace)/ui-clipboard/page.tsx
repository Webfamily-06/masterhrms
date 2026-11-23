"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UIClipboardPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("https://workspace.masterhrms.com/invite?token=x93kLmP0291");
  const [textareaText, setTextareaText] = useState("Confidential Company API Access Key: live_sec_9934120abdf81");

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Clipboard copy failed", err);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Clipboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Single-click clipboard utilities for copying invitation tokens, API secrets, URLs, and employee details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Advanced UI Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Copy from Input Field */}
        <PreviewCard
          title="Copy from Text Input"
          description="Integrated copy button anchored directly inside an input field group."
          code={`<div className="flex rounded-md shadow-xs">
  <input value={url} readOnly className="border rounded-s-md p-2 flex-1" />
  <button onClick={handleCopy} className="btn-primary rounded-e-md">Copy</button>
</div>`}
        >
          <div className="p-2 space-y-2">
            <label className="text-xs font-semibold text-foreground">Workspace Invitation Link</label>
            <div className="flex rounded-md shadow-xs">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 p-2.5 text-xs font-mono bg-muted/30 border border-border rounded-s-md text-foreground focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => handleCopy("input-1", inputText)}
                className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 rounded-e-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <i className={`ph ${copiedId === "input-1" ? "ph-check text-emerald-300" : "ph-copy"}`} />
                <span>{copiedId === "input-1" ? "Copied!" : "Copy URL"}</span>
              </button>
            </div>
          </div>
        </PreviewCard>

        {/* 2. Copy from Textarea */}
        <PreviewCard
          title="Copy from Textarea"
          description="Copy full multiline configuration scripts or cryptographic certificates."
          code={`<div className="relative">
  <textarea value={key} readOnly className="w-full p-3 font-mono text-xs border rounded-lg" />
  <button onClick={handleCopy} className="absolute top-2 right-2">Copy</button>
</div>`}
        >
          <div className="p-2 space-y-2">
            <label className="text-xs font-semibold text-foreground">API Secret Key</label>
            <div className="relative">
              <textarea
                rows={3}
                value={textareaText}
                onChange={(e) => setTextareaText(e.target.value)}
                className="w-full p-3 pr-20 text-xs font-mono bg-muted/30 border border-border rounded-lg text-foreground focus:outline-hidden resize-none"
              />
              <button
                type="button"
                onClick={() => handleCopy("textarea-1", textareaText)}
                className="absolute top-2.5 right-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1"
              >
                <i className={`ph ${copiedId === "textarea-1" ? "ph-check text-emerald-400" : "ph-copy"}`} />
                <span>{copiedId === "textarea-1" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
