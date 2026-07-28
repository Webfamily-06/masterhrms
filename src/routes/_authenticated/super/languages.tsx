import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Globe, Save, RefreshCw, Loader2, Plus, Search, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/languages")({
  component: LanguageEditorAdminStudio,
});

export type LanguageDictionary = {
  [key: string]: string;
};

export type LanguagePack = {
  code: string;
  name: string;
  flag: string;
  isDefault?: boolean;
  strings: LanguageDictionary;
};

const DEFAULT_LANGUAGES: LanguagePack[] = [
  {
    code: "en",
    name: "English (US)",
    flag: "🇺🇸",
    isDefault: true,
    strings: {
      "app.title": "Master HRMS",
      "nav.dashboard": "Overview Dashboard",
      "nav.employees": "Employees Directory",
      "nav.payroll": "Payroll & Tax Automation",
      "nav.attendance": "Attendance Rosters",
      "nav.support": "Support Desk",
      "nav.settings": "System Settings",
      "btn.save": "Save Changes",
      "btn.cancel": "Cancel",
      "status.active": "Active",
    },
  },
  {
    code: "es",
    name: "Español",
    flag: "🇪🇸",
    isDefault: false,
    strings: {
      "app.title": "Master HRMS",
      "nav.dashboard": "Panel de Control",
      "nav.employees": "Directorio de Empleados",
      "nav.payroll": "Nómina y Automatización Fiscal",
      "nav.attendance": "Listas de Asistencia",
      "nav.support": "Mesa de Ayuda",
      "nav.settings": "Configuración del Sistema",
      "btn.save": "Guardar Cambios",
      "btn.cancel": "Cancelar",
      "status.active": "Activo",
    },
  },
  {
    code: "fr",
    name: "Français",
    flag: "🇫🇷",
    isDefault: false,
    strings: {
      "app.title": "Master HRMS",
      "nav.dashboard": "Tableau de Bord",
      "nav.employees": "Annuaire des Employés",
      "nav.payroll": "Paie et Automatisation Fiscale",
      "nav.attendance": "Feuilles de Présence",
      "nav.support": "Centre de Support",
      "nav.settings": "Paramètres Système",
      "btn.save": "Enregistrer les modifications",
      "btn.cancel": "Annuler",
      "status.active": "Actif",
    },
  },
  {
    code: "de",
    name: "Deutsch",
    flag: "🇩🇪",
    isDefault: false,
    strings: {
      "app.title": "Master HRMS",
      "nav.dashboard": "Übersichts-Dashboard",
      "nav.employees": "Mitarbeiterverzeichnis",
      "nav.payroll": "Lohnabrechnung",
      "nav.attendance": "Anwesenheit",
      "nav.support": "Support-Desk",
      "nav.settings": "Systemeinstellungen",
      "btn.save": "Änderungen speichern",
      "btn.cancel": "Abbrechen",
      "status.active": "Aktiv",
    },
  },
  {
    code: "hi",
    name: "हिन्दी (Hindi)",
    flag: "🇮🇳",
    isDefault: false,
    strings: {
      "app.title": "Master HRMS",
      "nav.dashboard": "डैशबोर्ड",
      "nav.employees": "कर्मचारी निर्देशिका",
      "nav.payroll": "पेरोल और कर",
      "nav.attendance": "उपस्थिति रजिस्टर",
      "nav.support": "सहायता केंद्र",
      "nav.settings": "सिस्टम सेटिंग्स",
      "btn.save": "सहेजें",
      "btn.cancel": "रद्द करें",
      "status.active": "सक्रिय",
    },
  },
  {
    code: "ar",
    name: "العربية (Arabic)",
    flag: "🇦🇪",
    isDefault: false,
    strings: {
      "app.title": "Master HRMS",
      "nav.dashboard": "لوحة التحكم",
      "nav.employees": "دليل الموظفين",
      "nav.payroll": "الرواتب والضرائب",
      "nav.attendance": "سجل الحضور",
      "nav.support": "مكتب الدعم",
      "nav.settings": "إعدادات النظام",
      "btn.save": "حفظ التغييرات",
      "btn.cancel": "إلغاء",
      "status.active": "نشط",
    },
  },
];

function LanguageEditorAdminStudio() {
  const qc = useQueryClient();
  const [selectedLangCode, setSelectedLangCode] = useState("en");
  const [searchQuery, setSearchQuery] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  // 1. REALTIME QUERY: Fetch language packs from Supabase
  const { data: langPacks, isLoading, refetch } = useQuery({
    queryKey: ["realtime-language-packs"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-language-packs").maybeSingle();
      if (data?.content && Array.isArray((data.content as any).languages)) {
        return (data.content as any).languages as LanguagePack[];
      }
      return DEFAULT_LANGUAGES;
    },
  });

  const list = langPacks ?? DEFAULT_LANGUAGES;
  const currentPack = list.find((l) => l.code === selectedLangCode) ?? list[0];

  // 2. REALTIME MUTATION: Save language packs to Supabase
  const saveMutation = useMutation({
    mutationFn: async (updatedList: LanguagePack[]) => {
      const { error } = await supabase.from("cms_pages").upsert({
        slug: "system-language-packs",
        title: "System Language Localization Packs",
        meta_description: "Realtime JSON language translation files",
        content: { languages: updatedList } as any,
        published: true,
      }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Language pack ${currentPack.name} (${currentPack.code}.json) saved to Supabase!`);
      qc.invalidateQueries({ queryKey: ["realtime-language-packs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function updateStringValue(key: string, val: string) {
    const updatedStrings = { ...currentPack.strings, [key]: val };
    const updatedPacks = list.map((l) => (l.code === currentPack.code ? { ...l, strings: updatedStrings } : l));
    saveMutation.mutate(updatedPacks);
  }

  function handleAddStringKey() {
    if (!newKey) return;
    updateStringValue(newKey, newValue || newKey);
    setNewKey("");
    setNewValue("");
    toast.success(`Translation key "${newKey}" added`);
  }

  const entries = Object.entries(currentPack.strings).filter(([k, v]) => {
    const q = searchQuery.toLowerCase();
    return !q || k.toLowerCase().includes(q) || v.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Language Editor</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Globe className="size-3 text-primary" /> Realtime JSON Localization
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Customize heading texts, labels, and menu items across Super Admin & Tenant panels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Select value={selectedLangCode} onValueChange={setSelectedLangCode}>
            <SelectTrigger className="h-9 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {list.map((l) => (
                <SelectItem key={l.code} value={l.code} className="text-xs">
                  <span className="mr-2">{l.flag}</span> {l.name} ({l.code}.json)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => saveMutation.mutate(list)} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Language JSON
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Add Translation Key */}
          <Card className="p-4 border shadow-xs">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full space-y-1">
                <Label className="text-xs font-semibold">New Translation Key String</Label>
                <Input
                  placeholder="e.g. menu.addons_store"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="font-mono text-xs h-9"
                />
              </div>

              <div className="flex-1 w-full space-y-1">
                <Label className="text-xs font-semibold">Translated Value ({currentPack.name})</Label>
                <Input
                  placeholder="e.g. Marketplace Extensions"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <Button onClick={handleAddStringKey} className="sm:mt-5 gap-1.5 h-9 shrink-0 text-xs">
                <Plus className="size-3.5" /> Add Translation
              </Button>
            </div>
          </Card>

          {/* Translation Dictionary Table */}
          <Card className="p-4 border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search keys or translated values..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <Badge variant="outline" className="font-mono text-xs">
                File: {currentPack.code}.json ({entries.length} keys)
              </Badge>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/50 font-semibold border-b text-[10px] uppercase">
                  <tr>
                    <th className="p-3 pl-4 w-1/3">Translation Key String</th>
                    <th className="p-3 pr-4">Translated Text Value ({currentPack.flag} {currentPack.name})</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map(([k, val]) => (
                    <tr key={k}>
                      <td className="p-3 pl-4 font-mono font-bold text-primary">{k}</td>
                      <td className="p-3 pr-4">
                        <Input
                          value={val}
                          onChange={(e) => updateStringValue(k, e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
