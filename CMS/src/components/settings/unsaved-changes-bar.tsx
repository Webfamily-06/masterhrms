import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Save, Undo2, Loader2 } from "lucide-react";

interface UnsavedChangesBarProps {
  isDirty: boolean;
  isSaving: boolean;
  sectionTitle?: string;
  onSave: () => void;
  onDiscard: () => void;
}

export function UnsavedChangesBar({
  isDirty,
  isSaving,
  sectionTitle = "Branding & Identity",
  onSave,
  onDiscard,
}: UnsavedChangesBarProps) {
  if (!isDirty) return null;

  return (
    <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 text-slate-100 dark:bg-slate-900/95 border border-primary/40 shadow-2xl rounded-2xl px-5 py-3 flex items-center justify-between gap-6 backdrop-blur-xl max-w-xl w-full">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
            <AlertCircle className="size-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Unsaved Changes Detected</p>
            <p className="text-[11px] text-slate-400">
              Modifications in {sectionTitle} will take effect upon saving.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSaving}
            onClick={onDiscard}
            className="text-xs h-8 text-slate-300 hover:text-white hover:bg-white/10 gap-1.5"
          >
            <Undo2 className="size-3.5" /> Discard
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={onSave}
            className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shadow-md shadow-primary/20"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
