import { isFieldEligibleForAi } from "@/lib/ai/ai-field-registry";

export interface ScopedAiMountOptions {
  moduleSlug: string;
  fieldKey: string;
  fieldLabel?: string;
  onTriggerModal: (currentVal: string) => void;
}

/**
 * Scoped form helper for dynamically mounting an AI generation helper trigger
 * to a specific container element without indiscriminate global DOM observation.
 */
export class ScopedFormAiHelper {
  private static mountedControllers = new Map<string, () => void>();

  /**
   * Mounts an AI assist button adjacent to an input or textarea within a container.
   * Strictly enforces:
   * 1. Sensitive field exclusion (passwords, payroll, statutory, tokens).
   * 2. Duplicate control prevention (checks existing data attribute).
   * 3. Clean teardown function returned for cleanup upon form unmount.
   */
  public static mountToField(
    containerEl: HTMLElement,
    options: ScopedAiMountOptions
  ): { mounted: boolean; reason?: string; cleanup: () => void } {
    if (!containerEl) {
      return { mounted: false, reason: "Container element is required", cleanup: () => {} };
    }

    const { moduleSlug, fieldKey, fieldLabel } = options;
    const controllerKey = `${moduleSlug}:${fieldKey}`;

    // 1. Locate target input or textarea
    const inputEl = containerEl.querySelector("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null;
    const inputType = inputEl?.getAttribute("type") || (inputEl?.tagName === "TEXTAREA" ? "textarea" : "text");

    // 2. Security & Eligibility Check
    const eligibility = isFieldEligibleForAi(moduleSlug, fieldKey, {
      inputType,
      fieldLabel,
    });

    if (!eligibility.eligible) {
      return {
        mounted: false,
        reason: eligibility.reason || "Field is not eligible for AI generation",
        cleanup: () => {},
      };
    }

    // 3. Duplicate Control Guard
    const existingControl = containerEl.querySelector(`[data-ai-helper-for="${moduleSlug}-${fieldKey}"]`);
    if (existingControl) {
      return {
        mounted: false,
        reason: "AI control already mounted for this field",
        cleanup: () => {},
      };
    }

    // 4. Create Accessible Trigger Button
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-ai-helper-for", `${moduleSlug}-${fieldKey}`);
    btn.setAttribute("data-testid", `ai-assist-scoped-${moduleSlug}-${fieldKey}`);
    btn.setAttribute("aria-label", `Generate with AI for ${fieldLabel || fieldKey}`);
    btn.className = "inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium py-1 px-1.5 rounded transition-all";
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-pulse text-primary"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> <span>Generate with AI</span>`;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const currentVal = inputEl?.value || "";
      options.onTriggerModal(currentVal);
    };

    btn.addEventListener("click", handleClick);

    // Insert button adjacent to input or container label
    const labelEl = containerEl.querySelector("label");
    if (labelEl) {
      labelEl.appendChild(btn);
    } else {
      containerEl.insertBefore(btn, containerEl.firstChild);
    }

    // 5. Cleanup function
    const cleanup = () => {
      btn.removeEventListener("click", handleClick);
      btn.remove();
      this.mountedControllers.delete(controllerKey);
    };

    this.mountedControllers.set(controllerKey, cleanup);

    return { mounted: true, cleanup };
  }

  /**
   * Cleans up all currently registered scoped controllers
   */
  public static cleanupAll(): void {
    this.mountedControllers.forEach((cleanup) => cleanup());
    this.mountedControllers.clear();
  }
}
