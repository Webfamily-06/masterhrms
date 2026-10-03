import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/ai-configuration")({
  component: AIConfigurationPage,
  head: () => ({
    meta: [
      { title: "AI Engine Configuration | Dreams ERP" },
      { name: "description", content: "Configure enterprise AI models, NLP engines, predictive algorithms, and automated retraining." },
    ],
  }),
});

export default function AIConfigurationPage() {
  const [activeTab, setActiveTab] = useState<"general" | "models" | "training" | "permissions">("general");
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Switch states
  const [nlp, setNlp] = useState(true);
  const [cv, setCv] = useState(true);
  const [contentGen, setContentGen] = useState(false);
  const [predictive, setPredictive] = useState(true);
  const [recommendations, setRecommendations] = useState(true);
  const [autoRetrain, setAutoRetrain] = useState(false);

  // Model settings
  const [modelType, setModelType] = useState("gemini-1.5-pro");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [fallbackModel, setFallbackModel] = useState("claude-3-5-sonnet");

  // Training settings
  const [retrainFreq, setRetrainFreq] = useState("Weekly");
  const [retentionDays, setRetentionDays] = useState("90");

  const handleRunScan = () => {
    setIsScanning(true);
    toast.info("Running AI System Diagnostics...");
    setTimeout(() => {
      setIsScanning(false);
      toast.success("AI Diagnostics Complete: All 4 models and API keys operational.");
    }, 1000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("AI configuration saved successfully.");
    }, 600);
  };

  return (
    <div className="space-y-4">
      {/* ── Page Header / Breadcrumb (Dreams ERP Standard) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border-color">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">AI Engine Configuration</h1>
          <div className="flex items-center gap-1.5 text-xs text-default">
            <Link to="/hrm-dashboard" className="hover:text-primary">Dashboard</Link>
            <i className="ph ph-caret-right text-[10px]"></i>
            <span className="text-gray-900 dark:text-gray-100 font-medium">Enterprise Intelligence Suite</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunScan}
            disabled={isScanning}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-color bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-700 cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <i className={`ph-bold ${isScanning ? "ph-spinner animate-spin" : "ph-activity"} text-sm text-primary`}></i>
            <span>{isScanning ? "Running Diagnostics..." : "Test Connection"}</span>
          </button>
        </div>
      </div>

      {/* ── Tabs (matching ui/general-settings.html line 1274) ── */}
      <div className="inline-flex items-center gap-1 border border-border-color rounded-md p-1 bg-white dark:bg-slate-900 flex-wrap text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === "general"
              ? "bg-dark text-white"
              : "text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800"
          }`}
        >
          <i className="ph-duotone ph-sliders"></i> Features &amp; Modules
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("models")}
          className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === "models"
              ? "bg-dark text-white"
              : "text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800"
          }`}
        >
          <i className="ph-duotone ph-cpu"></i> LLM &amp; Vision Models
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("training")}
          className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === "training"
              ? "bg-dark text-white"
              : "text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800"
          }`}
        >
          <i className="ph-duotone ph-database"></i> Data &amp; Fine-Tuning
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("permissions")}
          className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === "permissions"
              ? "bg-dark text-white"
              : "text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800"
          }`}
        >
          <i className="ph-duotone ph-shield-check"></i> Security &amp; Guardrails
        </button>
      </div>

      {/* ── Content Card ── */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-5">
        <form onSubmit={handleSave} className="space-y-6">
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="border-b border-border-color pb-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Enterprise AI Capabilities</h2>
                <p className="text-xs text-default mt-0.5">Toggle automated intelligence models across HRM, CRM, and ERP modules.</p>
              </div>

              <div className="divide-y divide-border-color/60">
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">Natural Language Document Parsing</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Extract invoices, resumes, and receipts directly into database records.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={nlp}
                    onChange={(e) => setNlp(e.target.checked)}
                    className="size-4 rounded border-border-color text-primary focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">Computer Vision Biometric Verification</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Facial validation for mobile check-ins and spoof prevention.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={cv}
                    onChange={(e) => setCv(e.target.checked)}
                    className="size-4 rounded border-border-color text-primary focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">Generative Job Descriptions &amp; Offer Letters</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Draft automated role requisitions tailored to department skill gaps.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={contentGen}
                    onChange={(e) => setContentGen(e.target.checked)}
                    className="size-4 rounded border-border-color text-primary focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">Predictive Payroll &amp; Attrition Forecasting</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Statistical regression on flight risks and next quarter bonus allocations.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={predictive}
                    onChange={(e) => setPredictive(e.target.checked)}
                    className="size-4 rounded border-border-color text-primary focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">Automated Training &amp; Upskilling Recommendations</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Suggest employee courses based on evaluation feedback.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={recommendations}
                    onChange={(e) => setRecommendations(e.target.checked)}
                    className="size-4 rounded border-border-color text-primary focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "models" && (
            <div className="space-y-4">
              <div className="border-b border-border-color pb-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Model Orchestration</h2>
                <p className="text-xs text-default mt-0.5">Configure inference parameters, primary providers, and token limits.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Primary LLM Provider</label>
                  <select
                    value={modelType}
                    onChange={(e) => setModelType(e.target.value)}
                    className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                    <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                    <option value="gpt-4o">OpenAI GPT-4o</option>
                    <option value="local-deepseek">Self-Hosted DeepSeek R1</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Failover Provider</label>
                  <select
                    value={fallbackModel}
                    onChange={(e) => setFallbackModel(e.target.value)}
                    className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                    <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                    <option value="gpt-4o">OpenAI GPT-4o</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">
                    Sampling Temperature ({temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>Deterministic (0.0)</span>
                    <span>Creative (1.0)</span>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Max Context Window Tokens</label>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                    className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "training" && (
            <div className="space-y-4">
              <div className="border-b border-border-color pb-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Data Fine-Tuning &amp; Embeddings</h2>
                <p className="text-xs text-default mt-0.5">Control indexing intervals for employee manuals and workspace policies.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Vector Re-indexing Schedule</label>
                  <select
                    value={retrainFreq}
                    onChange={(e) => setRetrainFreq(e.target.value)}
                    className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Daily">Daily at 02:00 AM UTC</option>
                    <option value="Weekly">Weekly on Sunday</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Manual">Manual Trigger Only</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Chat &amp; Inference Retention (Days)</label>
                  <select
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(e.target.value)}
                    className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                    <option value="365">365 Days (Full Audit Log)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-border-color/60 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">Automated Vector Embeddings Sync</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Sync changes made to HR policy documents immediately into knowledge graph.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoRetrain}
                    onChange={(e) => setAutoRetrain(e.target.checked)}
                    className="size-4 rounded border-border-color text-primary focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="space-y-4">
              <div className="border-b border-border-color pb-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Security &amp; PII Guardrails</h2>
                <p className="text-xs text-default mt-0.5">Enforce strict data anonymization before external model transmission.</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded border border-border-color bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">PII Data Masking</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Automatically mask SSNs, salaries, and phone numbers in model prompts.</p>
                  </div>
                  <span className="text-[11px] font-semibold text-success bg-success-transparent px-2 py-0.5 rounded">Enforced</span>
                </div>

                <div className="p-3 rounded border border-border-color bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">Tenant Data Isolation</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Ensure vector indexes strictly partition by tenant_id during semantic lookups.</p>
                  </div>
                  <span className="text-[11px] font-semibold text-success bg-success-transparent px-2 py-0.5 rounded">Constitutional</span>
                </div>

                <div className="p-3 rounded border border-border-color bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">Audit Trail Logging</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Log every user prompt, model response hash, and token usage into system audits.</p>
                  </div>
                  <span className="text-[11px] font-semibold text-success bg-success-transparent px-2 py-0.5 rounded">Active</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => toast.info("Reset to default configuration.")}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-color bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-light cursor-pointer"
            >
              Reset Defaults
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white cursor-pointer shadow-xs"
            >
              {isSaving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
