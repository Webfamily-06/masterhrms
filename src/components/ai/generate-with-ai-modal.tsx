import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  RotateCw, 
  Check, 
  Copy, 
  AlertTriangle, 
  AlertCircle,
  Sliders, 
  Settings2,
  ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { getAuthHeaders } from "@/lib/api";

interface GenerateWithAiModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  moduleSlug: string;
  fieldKey: string;
  fieldLabel?: string;
  formValues?: Record<string, any>;
  initialContext?: string;
  currentValue?: string;
  onSelectResult: (text: string, mode?: "replace" | "append") => void;
}

interface LanguageOption {
  code: string;
  name: string;
}

interface ResultCard {
  text: string;
  chars: number;
}

export function GenerateWithAiModal({
  isOpen,
  open,
  onClose,
  onOpenChange,
  moduleSlug,
  fieldKey,
  fieldLabel,
  formValues,
  initialContext = "",
  currentValue = "",
  onSelectResult,
}: GenerateWithAiModalProps) {
  const modalOpen = open !== undefined ? open : (isOpen ?? false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  };

  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [creativity, setCreativity] = useState<"low" | "medium" | "high">("medium");
  const [count, setCount] = useState(3);
  const [maxLength, setMaxLength] = useState(250);
  const [context, setContext] = useState(initialContext);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultCard[]>([]);
  const [configError, setConfigError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  useEffect(() => {
    if (modalOpen) {
      if (initialContext) setContext(initialContext);
      setQuotaError(null);
      fetchLanguages();
      checkConfig();
    }
  }, [modalOpen, initialContext]);

  const fetchLanguages = async () => {
    try {
      const res = await fetch("/api/v1/addons/ai-assistant/languages", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setLanguages(data.data || data);
      }
    } catch {}
  };

  const checkConfig = async () => {
    try {
      const res = await fetch("/api/v1/addons/ai-assistant/settings", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const conf = data.data || data;
        if (!conf.isActive || (!conf.apiKeyEncrypted && !conf.hasKey)) {
          setConfigError("AI Assistant provider has not been enabled or configured with a valid API key.");
        } else {
          setConfigError(null);
        }
      }
    } catch {
      setConfigError(null);
    }
  };

  const handleGenerate = async () => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setQuotaError(null);

      const res = await fetch("/api/v1/addons/ai-assistant/generate", {
        method: "POST",
        headers: getAuthHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          moduleSlug,
          fieldKey,
          language: selectedLanguage,
          creativity,
          count,
          maxLength,
          context: context.trim(),
          formValues,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (
          res.status === 429 ||
          data.error?.toLowerCase().includes("quota") ||
          data.error?.toLowerCase().includes("limit")
        ) {
          setQuotaError(data.error || "Monthly token quota exceeded. Please upgrade your plan or check AI Assistant settings.");
          return;
        }
        throw new Error(data.error || "Failed to generate AI options");
      }

      setResults(data.results || []);
      toast.success(`Generated ${data.results?.length || 0} options successfully`);
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast.info("Generation cancelled");
        return;
      }
      toast.error(err.message || "Generation failed");
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handlePick = (text: string, mode: "replace" | "append" = "replace") => {
    onSelectResult(text, mode);
    toast.success(mode === "append" ? "Appended to form field" : "Applied to form field");
    handleClose();
  };

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span>Generate with AI: {fieldLabel || fieldKey}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Generate customized, context-aware content directly for module <strong>{moduleSlug}</strong>.
          </DialogDescription>
        </DialogHeader>

        {configError ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-3">
            <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>Provider Configuration Needed</span>
            </div>
            <p className="text-xs text-muted-foreground">{configError}</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/addons/ai-assistant/settings" onClick={onClose}>
                <Settings2 className="w-4 h-4 mr-2" />
                Configure AI Assistant Settings
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {quotaError && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2" role="alert">
                <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>Token Quota Limit Exceeded</span>
                </div>
                <p className="text-xs text-muted-foreground">{quotaError}</p>
                <div className="pt-1">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/addons/ai-assistant/settings" onClick={onClose}>
                      <Settings2 className="w-4 h-4 mr-2" />
                      Review Token Quotas in Settings
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Parameters Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((l) => (
                      <SelectItem key={l.code} value={l.name} className="text-xs">
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Number of Results ({count})</Label>
                <div className="flex items-center space-x-2 pt-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      size="sm"
                      variant={count === n ? "default" : "outline"}
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setCount(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Creativity Radio */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Creativity & Tone</Label>
              <RadioGroup
                value={creativity}
                onValueChange={(val: any) => setCreativity(val)}
                className="flex items-center space-x-4 pt-1"
              >
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="low" id="creat-low" />
                  <Label htmlFor="creat-low" className="text-xs font-normal cursor-pointer">Low (Factual / Precise)</Label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="medium" id="creat-med" />
                  <Label htmlFor="creat-med" className="text-xs font-normal cursor-pointer">Medium (Balanced)</Label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="high" id="creat-high" />
                  <Label htmlFor="creat-high" className="text-xs font-normal cursor-pointer">High (Expressive)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Max Length Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <Label className="font-semibold">Max Length Limit</Label>
                <span className="font-mono text-muted-foreground">{maxLength} characters</span>
              </div>
              <Slider
                value={[maxLength]}
                min={50}
                max={500}
                step={10}
                onValueChange={(v) => setMaxLength(v[0])}
              />
            </div>

            {/* Extra Context */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Additional Context / Specific Requirements</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Focus on remote work policies, include a warm welcome, emphasize Q4 milestones..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Generate Action Button */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="gap-2"
              >
                {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {results.length > 0 ? "Regenerate Options" : "Generate Options"}
              </Button>
            </div>

            {/* Result Cards */}
            {results.length > 0 && (
              <div className="space-y-3 pt-2 border-t" aria-live="polite">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Select an Option to Populate Field ({results.length})
                </Label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {results.map((res, idx) => (
                    <Card
                      key={idx}
                      className="hover:border-primary hover:bg-muted/30 transition-all p-3 border group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-xs leading-relaxed flex-1 select-all">{res.text}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                          {res.chars} chars
                        </Badge>
                      </div>

                      {currentValue && currentValue.trim().length > 0 ? (
                        <div className="mt-3 pt-2.5 border-t flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            Current: <span className="font-mono">{currentValue.slice(0, 25)}...</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2.5"
                              onClick={() => handlePick(res.text, "append")}
                            >
                              Append to Current
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-xs px-2.5 gap-1"
                              onClick={() => handlePick(res.text, "replace")}
                            >
                              <Check className="w-3.5 h-3.5" /> Replace Current
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs px-2.5 gap-1"
                            onClick={() => handlePick(res.text, "replace")}
                          >
                            <Check className="w-3.5 h-3.5" /> Apply to Field
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
