"use client";

import React, { useRef, useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function UIModalsPage() {
  const basicDialogRef = useRef<HTMLDialogElement>(null);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const largeDialogRef = useRef<HTMLDialogElement>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Modern Web Guidance: Open modal using native showModal() API
  const openModal = (ref: React.RefObject<HTMLDialogElement | null>) => {
    if (ref.current) {
      ref.current.showModal();
    }
  };

  const closeModal = (ref: React.RefObject<HTMLDialogElement | null>, actionName?: string) => {
    if (ref.current) {
      ref.current.close();
      if (actionName) {
        setLastAction(actionName);
        setTimeout(() => setLastAction(null), 3000);
      }
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Modals & Dialogs</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Native HTML5 &lt;dialog&gt; modals with automatic focus trapping, top-layer elevation, and backdrop light dismiss.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Modern Web Standard
          </span>
        </div>
      </div>

      {lastAction && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <i className="ph-duotone ph-check-circle text-base" />
          <span>Last modal event triggered: <strong>{lastAction}</strong></span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Basic Modal Dialog */}
        <PreviewCard
          title="Native Modal Dialog"
          description="Built using modern HTML5 <dialog> with native Esc key dismissal and inert backdrop."
          code={`<button onClick={() => dialogRef.current?.showModal()} className="btn-primary">
  Open Modal
</button>

<dialog ref={dialogRef} className="rounded-xl p-6 bg-card border backdrop:bg-black/50">
  <h3 className="font-bold text-base">Modal Title</h3>
  <p className="text-xs text-muted-foreground mt-2">Modal description text.</p>
  <button onClick={() => dialogRef.current?.close()}>Close</button>
</dialog>`}
        >
          <div className="p-2">
            <button
              type="button"
              onClick={() => openModal(basicDialogRef)}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2.5 rounded-md transition-colors cursor-pointer"
            >
              <i className="ph ph-browsers text-sm" />
              <span>Launch Standard Modal</span>
            </button>

            {/* Native Dialog Component */}
            <dialog
              ref={basicDialogRef}
              aria-labelledby="basic-modal-title"
              className="rounded-xl bg-card text-card-foreground border border-border/80 p-0 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs max-w-md w-full m-auto"
            >
              <div className="p-5 border-b border-border/60 flex items-center justify-between">
                <h3 id="basic-modal-title" className="font-bold text-base text-foreground">
                  Workspace Notification Settings
                </h3>
                <button
                  type="button"
                  onClick={() => closeModal(basicDialogRef)}
                  className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close modal"
                >
                  <i className="ph ph-x text-base" />
                </button>
              </div>
              <div className="p-5 space-y-3 text-xs text-muted-foreground leading-relaxed">
                <p>
                  Configure instant SMS, WhatsApp, and WebPush dispatch triggers for leave approvals and monthly salary distribution.
                </p>
                <div className="p-3 bg-muted/40 rounded-lg border border-border/60">
                  <span className="font-semibold text-foreground">Active Gateway:</span> Cloudflare Worker Push Dispatcher
                </div>
              </div>
              <div className="p-4 bg-muted/20 border-t border-border/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => closeModal(basicDialogRef, "Cancelled")}
                  className="px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-md cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => closeModal(basicDialogRef, "Saved Settings")}
                  className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </dialog>
          </div>
        </PreviewCard>

        {/* 2. Destructive Confirm Dialog */}
        <PreviewCard
          title="Confirmation Dialog"
          description="Focus-contained dialog for critical decisions with autofocus on safe Cancel."
          code={`<dialog ref={confirmRef} aria-labelledby="confirm-title">
  <h4 id="confirm-title">Delete Employee Record?</h4>
  <p>This action cannot be undone.</p>
  <button autoFocus onClick={() => confirmRef.current?.close()}>Cancel</button>
  <button onClick={handleDelete}>Confirm Delete</button>
</dialog>`}
        >
          <div className="p-2">
            <button
              type="button"
              onClick={() => openModal(confirmDialogRef)}
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2.5 rounded-md transition-colors cursor-pointer"
            >
              <i className="ph ph-trash text-sm" />
              <span>Confirm Destructive Action</span>
            </button>

            {/* Confirm Dialog */}
            <dialog
              ref={confirmDialogRef}
              aria-labelledby="confirm-modal-title"
              className="rounded-xl bg-card text-card-foreground border border-border/80 p-0 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs max-w-sm w-full m-auto"
            >
              <div className="p-5 text-center">
                <div className="size-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-3">
                  <i className="ph-duotone ph-warning-octagon text-2xl" />
                </div>
                <h3 id="confirm-modal-title" className="font-bold text-base text-foreground mb-1">
                  Revoke Employee Access?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to deactivate this account? All ongoing sessions and API tokens will be terminated immediately.
                </p>
              </div>
              <div className="p-4 bg-muted/20 border-t border-border/60 flex items-center justify-center gap-3">
                <button
                  type="button"
                  autoFocus
                  onClick={() => closeModal(confirmDialogRef, "Cancelled")}
                  className="px-4 py-2 text-xs font-semibold text-foreground bg-card border border-border hover:bg-muted rounded-md cursor-pointer"
                >
                  Keep Active
                </button>
                <button
                  type="button"
                  onClick={() => closeModal(confirmDialogRef, "Account Revoked")}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md cursor-pointer"
                >
                  Revoke Access
                </button>
              </div>
            </dialog>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
