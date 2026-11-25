"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_PREFIX = "hrms_form_draft_v1::";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const EXCLUDED_ROUTES = [
  "/login",
  "/register",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/2fa",
  "/auth/",
];

const SENSITIVE_PATTERN =
  /password|passwd|pwd|otp|totp|2fa|two.?factor|token|secret|cvv|cvc|card.?number|search|filter|query/i;

type DraftFieldValue = {
  type: "value" | "checked";
  value?: string;
  checked?: boolean;
};

interface StoredPageDraft {
  updatedAt: number;
  fields: Record<string, DraftFieldValue>;
}

type FormFieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isExcludedRoute(pathname: string): boolean {
  const lower = (pathname || "/").toLowerCase();
  return EXCLUDED_ROUTES.some((prefix) => lower === prefix || lower.startsWith(prefix));
}

function isFormField(el: EventTarget | null): el is FormFieldElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  );
}

function shouldSkipField(el: FormFieldElement): boolean {
  if (el.disabled || ("readOnly" in el && el.readOnly)) return true;
  if (el.closest("[data-no-autosave='true'], [data-draft-managed='true']")) return true;
  if (el.getAttribute("data-no-autosave") === "true") return true;

  if (el instanceof HTMLInputElement) {
    const t = (el.type || "text").toLowerCase();
    if (["password", "hidden", "file", "submit", "button", "reset", "image", "search"].includes(t)) {
      return true;
    }
  }

  const autoComplete = (el.getAttribute("autocomplete") || "").toLowerCase();
  if (autoComplete.includes("one-time-code") || autoComplete.includes("password") || autoComplete.startsWith("cc-")) {
    return true;
  }

  const meta = [
    el.name,
    el.id,
    el.getAttribute("aria-label"),
    el.getAttribute("placeholder"),
    el.getAttribute("data-testid"),
  ]
    .filter(Boolean)
    .join(" ");

  if (SENSITIVE_PATTERN.test(meta)) return true;

  return false;
}

function getFormKey(el: FormFieldElement): string {
  const form = el.closest("form");
  if (!form) {
    const dialog = el.closest("[role='dialog'], dialog");
    if (dialog) {
      const title = dialog.querySelector("h1, h2, h3, [data-slot='dialog-title']")?.textContent?.trim();
      if (title) return `dialog:${title.slice(0, 40)}`;
      return "dialog";
    }
    return "page";
  }
  const explicit = form.getAttribute("data-draft-key") || form.id || form.getAttribute("name");
  if (explicit) return `form:${explicit}`;
  const forms = Array.from(document.querySelectorAll("form"));
  const idx = forms.indexOf(form);
  return `form:${idx >= 0 ? idx : 0}`;
}

function getFieldKey(el: FormFieldElement): string | null {
  const formKey = getFormKey(el);
  const direct =
    el.getAttribute("data-draft-field") ||
    el.name ||
    el.id ||
    el.getAttribute("aria-label") ||
    el.getAttribute("placeholder");

  if (direct && direct.trim().length > 0) {
    const radioSuffix =
      el instanceof HTMLInputElement && el.type === "radio" ? `::${el.value}` : "";
    return `${formKey}::${direct.trim().slice(0, 80)}${radioSuffix}`;
  }

  // Fallback: nearest label text
  const labelText = el.closest("label")?.textContent?.trim();
  if (labelText) {
    return `${formKey}::label:${labelText.slice(0, 60)}`;
  }

  return null;
}

function setReactCompatibleValue(el: FormFieldElement, val: string) {
  if (el.value === val) return;
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;

  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  if (descriptor?.set) {
    descriptor.set.call(el, val);
  } else {
    el.value = val;
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function setReactCompatibleChecked(el: HTMLInputElement, checked: boolean) {
  if (el.checked === checked) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
  if (descriptor?.set) {
    descriptor.set.call(el, checked);
  } else {
    el.checked = checked;
  }
  el.dispatchEvent(new Event("click", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function readDraft(storageKey: string): StoredPageDraft | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed: StoredPageDraft = JSON.parse(raw);
    if (!parsed?.updatedAt || Date.now() - parsed.updatedAt > DRAFT_TTL_MS) {
      window.localStorage.removeItem(storageKey);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(storageKey: string, fields: Record<string, DraftFieldValue>) {
  try {
    const keys = Object.keys(fields);
    if (keys.length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    const payload: StoredPageDraft = {
      updatedAt: Date.now(),
      fields,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

/**
 * Global Form Draft Auto-Save Provider.
 * Automatically persists user-entered values across all forms, modals, and inputs
 * in localStorage so refreshing the page never loses work, and clears drafts on submit.
 */
export function FormDraftAutosaveProvider() {
  const pathname = usePathname() || "/";
  const [restoredCount, setRestoredCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);

  const isRestoringRef = useRef(false);
  const restoredElementsRef = useRef<WeakSet<Element>>(new WeakSet());
  const saveTimerRef = useRef<number | null>(null);
  const pendingFieldsRef = useRef<Record<string, DraftFieldValue>>({});

  useEffect(() => {
    if (typeof window === "undefined" || isExcludedRoute(pathname)) {
      setShowBanner(false);
      setRestoredCount(0);
      return;
    }

    const storageKey = `${STORAGE_PREFIX}${pathname}`;
    restoredElementsRef.current = new WeakSet();
    setShowBanner(false);
    setRestoredCount(0);

    // Load existing draft for this route into memory
    const existing = readDraft(storageKey);
    pendingFieldsRef.current = existing?.fields ? { ...existing.fields } : {};

    const restoreFieldsInDom = () => {
      const draft = readDraft(storageKey);
      if (!draft || !draft.fields || Object.keys(draft.fields).length === 0) return;

      const elements = document.querySelectorAll<FormFieldElement>(
        "input, textarea, select"
      );
      let newlyRestored = 0;

      isRestoringRef.current = true;
      try {
        elements.forEach((el) => {
          if (restoredElementsRef.current.has(el)) return;
          if (shouldSkipField(el)) return;

          const key = getFieldKey(el);
          if (!key) return;
          const saved = draft.fields[key];
          if (!saved) return;

          if (saved.type === "checked" && el instanceof HTMLInputElement) {
            if (typeof saved.checked === "boolean" && el.checked !== saved.checked) {
              setReactCompatibleChecked(el, saved.checked);
              newlyRestored += 1;
            }
            restoredElementsRef.current.add(el);
          } else if (saved.type === "value" && typeof saved.value === "string") {
            // Only overwrite empty or different values when restoring freshly mounted field
            if (saved.value.length > 0 && el.value !== saved.value) {
              setReactCompatibleValue(el, saved.value);
              newlyRestored += 1;
            }
            restoredElementsRef.current.add(el);
          }
        });
      } finally {
        window.setTimeout(() => {
          isRestoringRef.current = false;
        }, 50);
      }

      if (newlyRestored > 0) {
        setRestoredCount((prev) => prev + newlyRestored);
        setShowBanner(true);
      }
    };

    const scheduleSave = () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        writeDraft(storageKey, pendingFieldsRef.current);
      }, 250);
    };

    const handleFieldUpdate = (e: Event) => {
      if (isRestoringRef.current) return;
      if (!isFormField(e.target)) return;
      const el = e.target;
      if (shouldSkipField(el)) return;

      const key = getFieldKey(el);
      if (!key) return;

      // Mark as interacted so MutationObserver never reverts user edits
      restoredElementsRef.current.add(el);

      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        pendingFieldsRef.current[key] = { type: "checked", checked: el.checked };
      } else {
        const val = el.value ?? "";
        if (val.trim() === "") {
          delete pendingFieldsRef.current[key];
        } else {
          pendingFieldsRef.current[key] = { type: "value", value: val };
        }
      }
      scheduleSave();
    };

    const handleFormSubmit = (e: Event) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.closest("[data-draft-managed='true']")) return;

      const formPrefix = `${getFormKeyFromForm(form)}::`;
      const next = { ...pendingFieldsRef.current };
      let changed = false;
      for (const k of Object.keys(next)) {
        if (k.startsWith(formPrefix)) {
          delete next[k];
          changed = true;
        }
      }
      if (changed) {
        pendingFieldsRef.current = next;
        writeDraft(storageKey, next);
        setShowBanner(false);
        setRestoredCount(0);
      }
    };

    function getFormKeyFromForm(form: HTMLFormElement): string {
      const explicit = form.getAttribute("data-draft-key") || form.id || form.getAttribute("name");
      if (explicit) return `form:${explicit}`;
      const forms = Array.from(document.querySelectorAll("form"));
      const idx = forms.indexOf(form);
      return `form:${idx >= 0 ? idx : 0}`;
    }

    document.addEventListener("input", handleFieldUpdate, true);
    document.addEventListener("change", handleFieldUpdate, true);
    document.addEventListener("submit", handleFormSubmit, true);

    const hasPendingDraft = Object.keys(pendingFieldsRef.current).length > 0;
    let initTimer1: number | null = null;
    let initTimer2: number | null = null;
    let mutationTimer: number | null = null;
    let observer: MutationObserver | null = null;

    // Only run DOM scans & MutationObserver when there is actually an unsaved draft to restore
    if (hasPendingDraft) {
      initTimer1 = window.setTimeout(restoreFieldsInDom, 150);
      initTimer2 = window.setTimeout(restoreFieldsInDom, 600);

      observer = new MutationObserver(() => {
        if (Object.keys(pendingFieldsRef.current).length === 0) {
          observer?.disconnect();
          return;
        }
        if (mutationTimer) window.clearTimeout(mutationTimer);
        mutationTimer = window.setTimeout(restoreFieldsInDom, 180);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      document.removeEventListener("input", handleFieldUpdate, true);
      document.removeEventListener("change", handleFieldUpdate, true);
      document.removeEventListener("submit", handleFormSubmit, true);
      if (initTimer1) window.clearTimeout(initTimer1);
      if (initTimer2) window.clearTimeout(initTimer2);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (mutationTimer) window.clearTimeout(mutationTimer);
      observer?.disconnect();
    };
  }, [pathname]);

  const handleClearPageDraft = () => {
    const storageKey = `${STORAGE_PREFIX}${pathname}`;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    pendingFieldsRef.current = {};
    setShowBanner(false);
    setRestoredCount(0);
    window.location.reload();
  };

  if (!showBanner || restoredCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-primary/30 bg-card/95 backdrop-blur-sm px-3.5 py-2.5 shadow-lg text-xs text-foreground"
    >
      <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <i className="ph ph-floppy-disk text-sm" />
      </div>
      <div className="leading-tight">
        <p className="font-semibold text-foreground">Draft Restored</p>
        <p className="text-[11px] text-muted-foreground">
          {restoredCount} unsaved {restoredCount === 1 ? "field" : "fields"} recovered after refresh
        </p>
      </div>
      <button
        type="button"
        onClick={handleClearPageDraft}
        className="ml-1 inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-500/20 transition-colors cursor-pointer"
      >
        <i className="ph ph-trash" />
        Clear
      </button>
      <button
        type="button"
        onClick={() => setShowBanner(false)}
        aria-label="Dismiss draft notice"
        className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <i className="ph ph-x text-sm" />
      </button>
    </div>
  );
}
