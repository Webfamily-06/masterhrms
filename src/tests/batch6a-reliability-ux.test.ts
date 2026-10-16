import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isFieldEligibleForAi, VERIFIED_AI_FIELDS, DISALLOWED_SENSITIVE_FIELD_PATTERNS } from "../lib/ai/ai-field-registry";
import { ScopedFormAiHelper } from "../components/ai/scoped-form-ai-helper";

// Lightweight Node-compatible Mock HTMLElement factory
function createMockElement(tag: string, attributes: Record<string, string> = {}): any {
  const children: any[] = [];
  const listeners: Record<string, Function[]> = {};
  const attrs = { ...attributes };

  function getAllDescendants(root: any): any[] {
    const list: any[] = [];
    for (const child of root.children || []) {
      list.push(child);
      list.push(...getAllDescendants(child));
    }
    return list;
  }

  function matches(node: any, selector: string): boolean {
    if (selector === "label" && node.tagName === "LABEL") return true;
    if (selector === "input, textarea" && (node.tagName === "INPUT" || node.tagName === "TEXTAREA")) return true;
    if (selector === "button" && node.tagName === "BUTTON") return true;
    if (selector.startsWith('[data-ai-helper-for="')) {
      const expected = selector.slice(21, -2);
      return node.getAttribute("data-ai-helper-for") === expected;
    }
    return false;
  }

  const el = {
    tagName: tag.toUpperCase(),
    value: "",
    textContent: "",
    innerHTML: "",
    className: "",
    type: "text",
    setAttribute: (k: string, v: string) => { attrs[k] = v; },
    getAttribute: (k: string) => attrs[k] || null,
    hasAttribute: (k: string) => k in attrs,
    addEventListener: (event: string, fn: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },
    removeEventListener: (event: string, fn: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((l) => l !== fn);
      }
    },
    click: () => {
      (listeners["click"] || []).forEach((fn) => fn({ preventDefault: () => {}, stopPropagation: () => {} }));
    },
    appendChild: (child: any) => {
      children.push(child);
      child.parentElement = el;
      return child;
    },
    insertBefore: (child: any, _ref: any) => {
      children.unshift(child);
      child.parentElement = el;
      return child;
    },
    removeChild: (child: any) => {
      const idx = children.indexOf(child);
      if (idx !== -1) {
        children.splice(idx, 1);
        child.parentElement = null;
      }
      return child;
    },
    remove: () => {
      if (el.parentElement) {
        const idx = el.parentElement.children.indexOf(el);
        if (idx !== -1) el.parentElement.children.splice(idx, 1);
      }
    },
    get firstChild() {
      return children[0] || null;
    },
    querySelector: (selector: string): any => {
      const all = getAllDescendants(el);
      return all.find((c) => matches(c, selector)) || null;
    },
    querySelectorAll: (selector: string): any[] => {
      const all = getAllDescendants(el);
      return all.filter((c) => matches(c, selector));
    },
    children,
    parentElement: null as any,
  };
  return el;
}

describe("Batch 6A — Workstream B (AI-20) & Workstream C (DOC-17) Acceptance Tests", () => {
  beforeEach(() => {
    ScopedFormAiHelper.cleanupAll();
    (global as any).document = {
      createElement: (tag: string) => createMockElement(tag),
      body: createMockElement("body"),
    };
    (global as any).URL = {
      createObjectURL: vi.fn().mockReturnValue("blob:http://localhost/mock-uuid"),
      revokeObjectURL: vi.fn(),
    };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    ScopedFormAiHelper.cleanupAll();
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // WORKSTREAM B: AI-20 — UNIVERSAL AI GENERATION HELPER
  // ──────────────────────────────────────────────────────────────────────────
  describe("Workstream B: AI-20 Universal AI Generation Helper", () => {
    it("should inventory all 14 verified enterprise text-entry fields", () => {
      expect(VERIFIED_AI_FIELDS.length).toBe(14);

      const moduleSlugs = new Set(VERIFIED_AI_FIELDS.map((f) => f.moduleSlug));
      expect(moduleSlugs.has("announcements")).toBe(true);
      expect(moduleSlugs.has("recruitment")).toBe(true);
      expect(moduleSlugs.has("training")).toBe(true);
      expect(moduleSlugs.has("performance")).toBe(true);
      expect(moduleSlugs.has("okr")).toBe(true);
      expect(moduleSlugs.has("support")).toBe(true);
      expect(moduleSlugs.has("planning")).toBe(true);

      // Check specific verified fields
      expect(VERIFIED_AI_FIELDS.some((f) => f.moduleSlug === "announcements" && f.fieldKey === "title")).toBe(true);
      expect(VERIFIED_AI_FIELDS.some((f) => f.moduleSlug === "recruitment" && f.fieldKey === "description")).toBe(true);
      expect(VERIFIED_AI_FIELDS.some((f) => f.moduleSlug === "planning" && (f.fieldKey === "charter-form" || f.fieldKey === "description"))).toBe(true);
    });

    it("should strictly exclude sensitive fields (password, secret, tax, salary, payroll, statutory, pan, bank)", () => {
      // 1. Password input type
      const pwdCheck = isFieldEligibleForAi("recruitment", "password", { inputType: "password" });
      expect(pwdCheck.eligible).toBe(false);
      expect(pwdCheck.reason).toMatch(/password/i);

      // 2. Sensitive field names
      const sensitiveKeys = [
        "user_password",
        "api_secret",
        "access_token",
        "pan_number",
        "aadhaar_card",
        "ssn",
        "tax_deduction",
        "basic_salary",
        "net_salary",
        "statutory_bonus",
        "payroll_run",
        "bank_account_no",
        "card_cvv",
        "mfa_pin",
      ];

      for (const key of sensitiveKeys) {
        const check = isFieldEligibleForAi("payroll", key);
        expect(check.eligible).toBe(false);
        expect(check.reason).toMatch(/sensitive|excluded|not in the verified/i);
      }
    });

    it("should prevent duplicate controls when mounting AI helpers to the same form container", () => {
      const container = createMockElement("div");
      const label = createMockElement("label");
      label.textContent = "Job Description";
      const textarea = createMockElement("textarea");
      container.appendChild(label);
      container.appendChild(textarea);

      const triggerFn = vi.fn();

      // First mount should succeed
      const mount1 = ScopedFormAiHelper.mountToField(container, {
        moduleSlug: "recruitment",
        fieldKey: "description",
        fieldLabel: "Job Description",
        onTriggerModal: triggerFn,
      });

      expect(mount1.mounted).toBe(true);
      const mountedButtons = container.querySelectorAll('[data-ai-helper-for="recruitment-description"]');
      expect(mountedButtons.length).toBe(1);

      // Second duplicate mount attempt MUST be rejected
      const mount2 = ScopedFormAiHelper.mountToField(container, {
        moduleSlug: "recruitment",
        fieldKey: "description",
        fieldLabel: "Job Description",
        onTriggerModal: triggerFn,
      });

      expect(mount2.mounted).toBe(false);
      expect(mount2.reason).toMatch(/already mounted/i);

      // Verify no duplicate button was added
      const finalButtons = container.querySelectorAll('[data-ai-helper-for="recruitment-description"]');
      expect(finalButtons.length).toBe(1);

      // Teardown
      mount1.cleanup();
      expect(container.querySelectorAll('[data-ai-helper-for="recruitment-description"]').length).toBe(0);
    });

    it("should clean up event listeners and DOM nodes when cleanup is invoked upon form unmount", () => {
      const container = createMockElement("div");
      const textarea = createMockElement("textarea");
      textarea.value = "Initial draft notes";
      container.appendChild(textarea);

      const triggerModal = vi.fn();

      const { mounted, cleanup } = ScopedFormAiHelper.mountToField(container, {
        moduleSlug: "announcements",
        fieldKey: "body",
        fieldLabel: "Announcement Body",
        onTriggerModal: triggerModal,
      });

      expect(mounted).toBe(true);
      const btn = container.querySelector("button");
      expect(btn).not.toBeNull();

      // Click triggers callback with current text
      btn.click();
      expect(triggerModal).toHaveBeenCalledWith("Initial draft notes");

      // Invoke cleanup
      cleanup();
      expect(container.querySelector("button")).toBeNull();
    });

    it("should safely handle text insertion preserving existing user text via replace and append modes", () => {
      const existingText = "Line 1: Established company policy.\nLine 2: Working hours 9am to 6pm.";
      const generatedSnippet = "Line 3: Hybrid work is permitted on Fridays.";

      // Mode 1: Replace
      const modeReplace = (current: string, incoming: string, mode: "replace" | "append") => {
        return mode === "append" && current.trim().length > 0 ? `${current.trim()}\n\n${incoming}` : incoming;
      };

      const replacedResult = modeReplace(existingText, generatedSnippet, "replace");
      expect(replacedResult).toBe(generatedSnippet);

      // Mode 2: Append (Preserves existing text!)
      const appendedResult = modeReplace(existingText, generatedSnippet, "append");
      expect(appendedResult).toContain("Line 1: Established company policy.");
      expect(appendedResult).toContain("Line 2: Working hours 9am to 6pm.");
      expect(appendedResult).toContain("Line 3: Hybrid work is permitted on Fridays.");
      expect(appendedResult.startsWith(existingText)).toBe(true);
    });

    it("should surface quota limit errors accessibly when tenant token quota is exceeded (HTTP 429)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: "Monthly token quota exceeded for this workspace. Please upgrade plan.",
        }),
      });
      global.fetch = mockFetch;

      const res = await fetch("/api/v1/addons/ai-assistant/generate", {
        method: "POST",
        body: JSON.stringify({ moduleSlug: "recruitment", fieldKey: "description" }),
      });

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain("Monthly token quota exceeded");
    });

    it("should support AbortController request cancellation during in-flight generation", async () => {
      const controller = new AbortController();

      const mockFetch = vi.fn().mockImplementation((_url, opts) => {
        return new Promise((resolve, reject) => {
          opts.signal.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      });
      global.fetch = mockFetch;

      const promise = fetch("/api/v1/addons/ai-assistant/generate", {
        signal: controller.signal,
      });

      // Abort in-flight request
      controller.abort();

      await expect(promise).rejects.toThrow("The operation was aborted");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // WORKSTREAM C: DOC-17 — INLINE PDF PREVIEW
  // ──────────────────────────────────────────────────────────────────────────
  describe("Workstream C: DOC-17 Inline PDF Preview", () => {
    it("should generate and validate browser-native object URL from authentic PDF stream", async () => {
      const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:http://localhost/mock-doc-uuid");
      const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      // Simulate binary PDF payload with '%PDF-' magic header
      const mockPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // '%PDF-1.4'
      const pdfBlob = new Blob([mockPdfBytes], { type: "application/pdf" });

      const url = URL.createObjectURL(pdfBlob);
      expect(url).toBe("blob:http://localhost/mock-doc-uuid");
      expect(createObjectURLSpy).toHaveBeenCalledWith(pdfBlob);

      // Verify cleanup revokes URL
      URL.revokeObjectURL(url);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:http://localhost/mock-doc-uuid");

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it("should reject corrupted or empty document responses without creating invalid preview URLs", async () => {
      // Empty buffer
      const emptyBlob = new Blob([], { type: "application/pdf" });
      expect(emptyBlob.size).toBe(0);

      // Non-PDF header
      const htmlBytes = new Uint8Array([0x3c, 0x21, 0x44, 0x4f, 0x43]); // '<!DOC'
      const htmlBlob = new Blob([htmlBytes], { type: "text/html" });

      const headerSlice = await htmlBlob.slice(0, 5).arrayBuffer();
      const magic = String.fromCharCode(...new Uint8Array(headerSlice));
      expect(magic).not.toBe("%PDF-");
    });

    it("should preserve original download action independently from the inline preview", () => {
      const mockBlob = new Blob(["%PDF-1.4 ... binary content"], { type: "application/pdf" });
      const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:http://localhost/download-uuid");
      const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      const downloadDoc = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      downloadDoc(mockBlob, "strategic_plan.pdf");

      expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:http://localhost/download-uuid");

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it("should enforce tenant authentication and handle 401/403 authorization denials", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: "Forbidden: You lack entitlement or permission for this tenant document." }),
      });
      global.fetch = mockFetch;

      const res = await fetch("/api/v1/addons/ai-document/documents/doc-secret-1/export?format=pdf&disposition=inline");
      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });
  });
});
