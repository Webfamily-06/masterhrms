import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenerateWithAiModal } from "./generate-with-ai-modal";
import { isFieldEligibleForAi } from "@/lib/ai/ai-field-registry";

export interface AiAssistButtonProps {
  moduleSlug: string;
  fieldKey: string;
  fieldLabel?: string;
  currentValue?: string;
  onApply: (text: string, mode: "replace" | "append") => void;
  formValues?: Record<string, any>;
  className?: string;
  variant?: "button" | "badge" | "icon";
  size?: "sm" | "xs" | "default";
  disabled?: boolean;
}

export const AiAssistButton: React.FC<AiAssistButtonProps> = ({
  moduleSlug,
  fieldKey,
  fieldLabel,
  currentValue = "",
  onApply,
  formValues,
  className = "",
  variant = "button",
  size = "sm",
  disabled = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  // Security & field eligibility check
  const eligibility = isFieldEligibleForAi(moduleSlug, fieldKey, { fieldLabel });
  if (!eligibility.eligible) {
    // Excluded field (e.g. password, tax, payroll, statutory, or unverified field)
    return null;
  }

  const handleApply = (text: string, mode: "replace" | "append" = "replace") => {
    let finalValue = text;
    if (mode === "append" && currentValue && currentValue.trim().length > 0) {
      finalValue = `${currentValue.trim()}\n\n${text}`;
    }
    onApply(finalValue, mode);
    setModalOpen(false);
  };

  const buttonId = `ai-assist-btn-${moduleSlug}-${fieldKey}`;

  return (
    <>
      <Button
        id={buttonId}
        type="button"
        variant="ghost"
        size={size === "xs" ? "sm" : size}
        disabled={disabled}
        onClick={() => setModalOpen(true)}
        className={`text-primary hover:text-primary hover:bg-primary/10 gap-1.5 transition-colors font-medium text-xs h-7 px-2 ${className}`}
        aria-label={`Generate with AI for ${fieldLabel || fieldKey}`}
        data-ai-helper-for={`${moduleSlug}-${fieldKey}`}
        data-testid={`ai-assist-button-${moduleSlug}-${fieldKey}`}
      >
        <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
        {variant !== "icon" && <span>Generate with AI</span>}
      </Button>

      <GenerateWithAiModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        moduleSlug={moduleSlug}
        fieldKey={fieldKey}
        fieldLabel={fieldLabel || eligibility.fieldDef?.defaultLabel}
        formValues={formValues}
        currentValue={currentValue}
        onSelectResult={handleApply}
      />
    </>
  );
};
