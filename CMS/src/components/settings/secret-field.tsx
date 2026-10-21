import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, RotateCcw, KeyRound, Check, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SecretFieldProps {
  id: string;
  label: string;
  help?: string;
  hasSavedSecret: boolean;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function SecretField({
  id,
  label,
  help,
  hasSavedSecret,
  value,
  onChange,
  onClear,
  placeholder = "Enter new secret or key...",
  disabled = false,
  required = false,
  className,
}: SecretFieldProps) {
  // If a secret is already saved on server, default to masked state until user clicks "Replace"
  const [isReplacing, setIsReplacing] = useState<boolean>(!hasSavedSecret);
  const [showPlaintext, setShowPlaintext] = useState<boolean>(false);

  const handleStartReplace = () => {
    setIsReplacing(true);
    onChange("");
  };

  const handleCancelReplace = () => {
    setIsReplacing(false);
    setShowPlaintext(false);
    onChange(""); // Reverts to keeping existing secret on server
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <KeyRound className="size-3 text-muted-foreground" />
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        {hasSavedSecret && (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <Lock className="size-2.5" /> Saved & Encrypted
          </span>
        )}
      </div>

      {hasSavedSecret && !isReplacing ? (
        // ─── 1. MASKED SAVED STATE ────────────────────────────────────
        <div className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-muted/40 backdrop-blur-xs">
          <div className="flex-1 flex items-center gap-2 font-mono text-xs text-muted-foreground px-2 py-1 select-none">
            <Lock className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>••••••••••••••••••••••••••••••••</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={handleStartReplace}
            className="h-7 text-xs px-2.5 font-medium gap-1.5 border-border hover:bg-background"
          >
            <RotateCcw className="size-3 text-muted-foreground" />
            Replace
          </Button>

          {onClear && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={onClear}
              className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Remove stored secret"
            >
              <Trash2 className="size-3" />
            </Button>
          )}
        </div>
      ) : (
        // ─── 2. REPLACING / NEW SECRET INPUT STATE ────────────────────
        <div className="space-y-2">
          <div className="relative flex items-center">
            <Input
              id={id}
              type={showPlaintext ? "text" : "password"}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="new-password"
              className="pr-20 text-xs font-mono h-9 bg-background border-border"
            />
            <div className="absolute right-1 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                tabIndex={-1}
                onClick={() => setShowPlaintext(!showPlaintext)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title={showPlaintext ? "Hide secret" : "Show secret"}
              >
                {showPlaintext ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>

              {hasSavedSecret && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelReplace}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3 mr-1" /> Cancel
                </Button>
              )}
            </div>
          </div>

          {hasSavedSecret && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>Entering a new value will replace the previously encrypted secret on save.</span>
            </p>
          )}
        </div>
      )}

      {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
    </div>
  );
}
