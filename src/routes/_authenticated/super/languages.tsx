import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Globe,
  Save,
  RefreshCw,
  Loader2,
  Plus,
  Search,
  Trash2,
  Power,
  Languages,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/languages")({
  component: LanguageEditorPage,
  head: () => ({ meta: [{ title: "Multilingual Phrase Editor — Super Admin" }] }),
});

export type LanguagePackMeta = {
  code: string;
  name: string;
  flag: string;
  countryCode: string;
  isDefault?: boolean;
  enabled?: boolean;
};

export type PhraseDictionary = Record<string, string>;

function LanguageEditorPage() {
  const qc = useQueryClient();
  const [selectedLangCode, setSelectedLangCode] = useState("en");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 30;

  // Local editing dictionary state
  const [localPhrases, setLocalPhrases] = useState<PhraseDictionary>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add new phrase dialog
  const [isAddPhraseOpen, setIsAddPhraseOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  // Add new language dialog
  const [isAddLangOpen, setIsAddLangOpen] = useState(false);
  const [newLangCode, setNewLangCode] = useState("");
  const [newLangName, setNewLangName] = useState("");
  const [newLangCountry, setNewLangCountry] = useState("US");

  // 1. Fetch available language packs from real backend
  const { data: languages = [], isLoading: isLanguagesLoading } = useQuery<LanguagePackMeta[]>({
    queryKey: ["super-languages-list"],
    queryFn: async () => {
      const res = await api.get("/super/languages");
      return Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
    },
  });

  // 2. Fetch phrases for the selected language
  const {
    data: phrasesData,
    isLoading: isPhrasesLoading,
    refetch: refetchPhrases,
  } = useQuery<{ code: string; phrases: PhraseDictionary }>({
    queryKey: ["super-language-phrases", selectedLangCode],
    queryFn: async () => {
      const res = await api.get(`/super/languages/${selectedLangCode}`);
      return (res as any)?.data || res;
    },
  });

  // Sync local phrases when loaded from server
  useEffect(() => {
    if (phrasesData?.phrases) {
      setLocalPhrases(phrasesData.phrases);
      setHasUnsavedChanges(false);
      setCurrentPage(1);
    }
  }, [phrasesData, selectedLangCode]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const currentLang = languages.find((l) => l.code === selectedLangCode) || languages[0];

  // 3. Save Phrases Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put(`/super/languages/${selectedLangCode}`, { phrases: localPhrases });
      return res.data;
    },
    onSuccess: () => {
      toast.success(`Translations for '${currentLang?.name || selectedLangCode}' saved successfully!`);
      setHasUnsavedChanges(false);
      qc.invalidateQueries({ queryKey: ["super-language-phrases", selectedLangCode] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to save translations");
    },
  });

  // 4. Create Language Mutation
  const createLangMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/super/languages", {
        code: newLangCode.trim().toLowerCase(),
        name: newLangName.trim(),
        countryCode: newLangCountry.trim().toUpperCase(),
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Language pack created successfully!");
      setIsAddLangOpen(false);
      setSelectedLangCode(newLangCode.trim().toLowerCase());
      setNewLangCode("");
      setNewLangName("");
      qc.invalidateQueries({ queryKey: ["super-languages-list"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to create language pack");
    },
  });

  // 5. Delete Language Mutation
  const deleteLangMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await api.delete(`/super/languages/${code}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Language pack deleted");
      setSelectedLangCode("en");
      qc.invalidateQueries({ queryKey: ["super-languages-list"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to delete language");
    },
  });

  // 6. Toggle Language Status
  const toggleLangMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await api.patch(`/super/languages/${code}/toggle`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Language status updated");
      qc.invalidateQueries({ queryKey: ["super-languages-list"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to toggle status");
    },
  });

  function handlePhraseChange(key: string, value: string) {
    setLocalPhrases((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  }

  function handleAddNewPhrase() {
    if (!newKey.trim()) {
      toast.error("Phrase key is required");
      return;
    }
    const key = newKey.trim();
    const val = newValue.trim() || key;
    setLocalPhrases((prev) => ({ ...prev, [key]: val }));
    setHasUnsavedChanges(true);
    setNewKey("");
    setNewValue("");
    setIsAddPhraseOpen(false);
    toast.success(`Phrase key '${key}' added to editor`);
  }

  // Filtered and paginated entries
  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return Object.entries(localPhrases).filter(
      ([k, v]) => !q || k.toLowerCase().includes(q) || (v || "").toLowerCase().includes(q),
    );
  }, [localPhrases, searchQuery]);

  const totalPages = Math.ceil(filteredEntries.length / perPage) || 1;
  const paginatedSlice = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredEntries.slice(start, start + perPage);
  }, [filteredEntries, currentPage, perPage]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Languages className="size-7 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Multilingual Phrase Editor
            </h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Globe className="size-3 text-primary" /> {languages.length} Active Locales
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Manage UI labels, system terminology, and localized string dictionaries with real-time MySQL persistence.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchPhrases()}
            className="gap-2 text-xs"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddPhraseOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Plus className="size-3.5" /> Add Phrase Key
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddLangOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Plus className="size-3.5" /> Create Language
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !hasUnsavedChanges}
            className="gap-2 text-xs shadow-xs"
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {hasUnsavedChanges ? "Save Changes *" : "Saved"}
          </Button>
        </div>
      </div>

      {/* Control Bar: Language Selection & Search */}
      <Card className="p-4 border-border/60 shadow-xs bg-muted/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Select Language:
              </Label>
              <Select value={selectedLangCode} onValueChange={(val) => setSelectedLangCode(val)}>
                <SelectTrigger className="w-[200px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l.code} value={l.code} className="text-xs">
                      <span className="mr-2 font-mono uppercase font-bold text-primary">[{l.code}]</span>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentLang?.code !== "en" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleLangMutation.mutate(currentLang.code)}
                  disabled={toggleLangMutation.isPending}
                  className="h-9 text-xs gap-1.5"
                  title="Toggle enabled status"
                >
                  <Power className="size-3.5" />
                  {currentLang.enabled === false ? "Enable Language" : "Disable Language"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete language pack '${currentLang.name}'?`)) {
                      deleteLangMutation.mutate(currentLang.code);
                    }
                  }}
                  disabled={deleteLangMutation.isPending}
                  className="h-9 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                  title="Delete Language"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )}
          </div>

          <div className="relative min-w-[260px] max-w-sm flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search phrase key or translation text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Phrase Table */}
      {isLanguagesLoading || isPhrasesLoading ? (
        <div className="py-24 grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading translation dictionary...</p>
          </div>
        </div>
      ) : (
        <Card className="border border-border/60 shadow-xs overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 font-semibold border-b border-border/60 text-[11px] text-muted-foreground uppercase">
              <tr>
                <th className="p-3 pl-4 w-1/3">Phrase Key / English Baseline</th>
                <th className="p-3 w-2/3">
                  Translation in <span className="text-primary font-bold">{currentLang?.name || selectedLangCode}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginatedSlice.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-12 text-center text-muted-foreground">
                    No phrases found matching "{searchQuery}". Click "Add Phrase Key" above to create one.
                  </td>
                </tr>
              ) : (
                paginatedSlice.map(([key, val]) => (
                  <tr key={key} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 pl-4 font-mono font-medium text-foreground align-top">
                      <div className="break-all">{key}</div>
                    </td>
                    <td className="p-2.5 pr-4 align-top">
                      <Input
                        value={val || ""}
                        onChange={(e) => handlePhraseChange(key, e.target.value)}
                        className="h-8 text-xs font-sans bg-background"
                        placeholder={`Translation for ${key}...`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Bar */}
          <div className="p-3.5 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              Showing {filteredEntries.length === 0 ? 0 : (currentPage - 1) * perPage + 1} to{" "}
              {Math.min(currentPage * perPage, filteredEntries.length)} of {filteredEntries.length} phrases
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs gap-1 px-2.5"
              >
                <ArrowLeft className="size-3" /> Prev
              </Button>
              <span className="px-2 font-mono font-semibold text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 text-xs gap-1 px-2.5"
              >
                Next <ArrowRight className="size-3" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Add Phrase Dialog ─── */}
      <Dialog open={isAddPhraseOpen} onOpenChange={setIsAddPhraseOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              Add Translation Phrase Key
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new string token to the localization dictionary for this language.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label>Phrase Key (e.g. "Leave Balance")</Label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Leave Balance"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Initial Translation Text ({currentLang?.name})</Label>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Translated text..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddPhraseOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddNewPhrase}>
              Add Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Language Dialog ─── */}
      <Dialog open={isAddLangOpen} onOpenChange={setIsAddLangOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Globe className="size-5 text-primary" />
              Register New Language Locale
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register a new language code and clone the baseline dictionary.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label>Language Code (ISO 2-letter, e.g. "it", "ja", "pt")</Label>
              <Input
                value={newLangCode}
                onChange={(e) => setNewLangCode(e.target.value)}
                placeholder="it"
                maxLength={10}
                className="h-9 text-xs uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Display Name (e.g. "Italiano", "Japanese")</Label>
              <Input
                value={newLangName}
                onChange={(e) => setNewLangName(e.target.value)}
                placeholder="Italiano"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Country Code (2-letter flag, e.g. "IT", "JP")</Label>
              <Input
                value={newLangCountry}
                onChange={(e) => setNewLangCountry(e.target.value)}
                placeholder="IT"
                maxLength={2}
                className="h-9 text-xs uppercase"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddLangOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={createLangMutation.isPending || !newLangCode || !newLangName}
              onClick={() => createLangMutation.mutate()}
            >
              {createLangMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Create Language
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
