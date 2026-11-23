"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function FormEditorsPage() {
  const [editorContent, setEditorContent] = useState(
    "<h1>Employee Performance & Appraisal Policy</h1><p>This document governs the annual evaluation criteria for all software engineers and operations personnel across Master HRMS.</p><ul><li>Self-appraisal submission deadline: Nov 30</li><li>Peer reviews and 360 feedback: Dec 15</li><li>Manager review and compensation normalization: Dec 31</li></ul>"
  );
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Form Rich Text Editors</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            WYSIWYG document authoring tools for drafting policies, employment contracts, offer letters, and job descriptions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Forms Component
          </span>
        </div>
      </div>

      <PreviewCard
        title="WYSIWYG Rich Text Document Editor"
        description="Author rich HTML content with markdown shortcuts, list formats, and live preview rendering."
        code={`<div className="border rounded-lg overflow-hidden">
  <div className="flex gap-1 p-2 bg-muted border-b">
    <button className="p-1"><i className="ph ph-text-bolder" /></button>
    <button className="p-1"><i className="ph ph-text-italic" /></button>
  </div>
  <textarea className="p-4 w-full font-mono text-xs" />
</div>`}
      >
        <div className="border border-border/80 rounded-lg overflow-hidden bg-card shadow-xs">
          {/* Editor Toolbar */}
          <div className="p-2 bg-muted/40 border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted text-foreground transition-colors cursor-pointer"
                title="Bold (⌘B)"
              >
                <i className="ph ph-text-bolder text-sm" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted text-foreground transition-colors cursor-pointer"
                title="Italic (⌘I)"
              >
                <i className="ph ph-text-italic text-sm" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted text-foreground transition-colors cursor-pointer"
                title="Underline (⌘U)"
              >
                <i className="ph ph-text-underline text-sm" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted text-foreground transition-colors cursor-pointer"
                title="Strikethrough"
              >
                <i className="ph ph-text-strikethrough text-sm" />
              </button>
              <span className="w-px h-5 bg-border mx-1" />
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted text-foreground transition-colors cursor-pointer"
                title="Bulleted List"
              >
                <i className="ph ph-list-bullets text-sm" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted text-foreground transition-colors cursor-pointer"
                title="Numbered List"
              >
                <i className="ph ph-list-numbers text-sm" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted text-foreground transition-colors cursor-pointer"
                title="Code Block"
              >
                <i className="ph ph-code-block text-sm" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`px-2.5 py-1 rounded cursor-pointer font-semibold ${
                  activeTab === "edit" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground"
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-2.5 py-1 rounded cursor-pointer font-semibold ${
                  activeTab === "preview" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground"
                }`}
              >
                Preview HTML
              </button>
            </div>
          </div>

          {/* Editor Body */}
          {activeTab === "edit" ? (
            <textarea
              rows={8}
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              className="w-full p-4 text-xs font-mono bg-card text-foreground focus:outline-hidden leading-relaxed resize-none"
            />
          ) : (
            <div
              className="p-4 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed min-h-[160px] bg-muted/10"
              dangerouslySetInnerHTML={{ __html: editorContent }}
            />
          )}

          {/* Footer Stats */}
          <div className="px-4 py-2 bg-muted/30 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>Characters: {editorContent.length} | Words: {editorContent.split(/\s+/).filter(Boolean).length}</span>
            <span className="text-emerald-600 font-medium">Auto-saved to cloud draft</span>
          </div>
        </div>
      </PreviewCard>
    </div>
  );
}
