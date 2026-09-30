import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/ai-settings")({
  component: AISettingsPage,
  head: () => ({
    meta: [
      { title: "AI API Keys & Settings | Dreams ERP" },
      { name: "description", content: "Manage enterprise AI vendor API credentials, quotas, and model endpoints." },
    ],
  }),
});

export default function AISettingsPage() {
  const [geminiApiKey, setGeminiApiKey] = useState("AIzaSyB3_example_key_master_hrms_984");
  const [anthropicApiKey, setAnthropicApiKey] = useState("sk-ant-api03-live_secret_key_88492");
  const [openAiApiKey, setOpenAiApiKey] = useState("sk-proj-live_enterprise_token_947192");
  const [monthlyTokenCap, setMonthlyTokenCap] = useState("50000000");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("AI API credentials and quota caps updated successfully.");
    }, 600);
  };

  return (
    <div className="space-y-4">
      {/* ── Page Header / Breadcrumb (Dreams ERP Standard) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border-color">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">AI API Credentials</h1>
          <div className="flex items-center gap-1.5 text-xs text-default">
            <Link to="/settings" className="hover:text-primary">Settings</Link>
            <i className="ph ph-caret-right text-[10px]"></i>
            <span className="text-gray-900 dark:text-gray-100 font-medium">AI Integrations</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/ai-configuration"
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-color bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-700 cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <i className="ph-duotone ph-sliders text-sm"></i>
            <span>Engine Configuration</span>
          </Link>
        </div>
      </div>

      {/* ── Settings Subnav ── */}
      <div className="inline-flex items-center gap-2 border border-border-color rounded-md p-1 bg-white dark:bg-slate-900 flex-wrap text-xs font-semibold">
        <Link
          to="/settings"
          className="px-3 py-1.5 text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 rounded-md inline-flex items-center gap-1.5"
        >
          <i className="ph-duotone ph-user"></i> General
        </Link>
        <Link
          to="/settings"
          className="px-3 py-1.5 text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 rounded-md inline-flex items-center gap-1.5"
        >
          <i className="ph-duotone ph-shield-check"></i> Security
        </Link>
        <div className="px-3 py-1.5 bg-dark text-white rounded-md inline-flex items-center gap-1.5">
          <i className="ph-duotone ph-cpu"></i> AI Keys
        </div>
      </div>

      {/* ── Credentials Form Card ── */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-5 max-w-3xl">
        <div className="border-b border-border-color pb-3 mb-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">AI Provider Secrets</h2>
          <p className="text-xs text-default mt-0.5">
            API keys are securely encrypted at rest using AES-256 before saving to the database.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-[11px] text-muted-foreground mt-1 block">Used for document extraction, vision biometrics, and analytics summaries.</span>
          </div>

          <div>
            <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">
              Anthropic Claude API Key
            </label>
            <input
              type="password"
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-[11px] text-muted-foreground mt-1 block">Used for policy drafting and complex multi-step reasoning.</span>
          </div>

          <div>
            <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={openAiApiKey}
              onChange={(e) => setOpenAiApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-[11px] text-muted-foreground mt-1 block">Used for secondary fallback and text embeddings.</span>
          </div>

          <div className="pt-2 border-t border-border-color">
            <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">
              Monthly Token Expenditure Hard Cap
            </label>
            <input
              type="number"
              value={monthlyTokenCap}
              onChange={(e) => setMonthlyTokenCap(e.target.value)}
              className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-[11px] text-muted-foreground mt-1 block">Prevents billing overages across all tenant AI actions.</span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border-color">
            <button
              type="button"
              onClick={() => toast.info("Testing vendor endpoints...")}
              className="px-3 py-1.5 rounded-md border border-border-color bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-light cursor-pointer"
            >
              Verify Keys
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white font-semibold cursor-pointer shadow-xs"
            >
              {isSaving ? "Saving..." : "Save API Credentials"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
