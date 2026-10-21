import { Link } from "@/lib/router-compat";
import { 
  FileText, 
  Layers, 
  FolderTree, 
  Smile, 
  History, 
  BarChart2, 
  Settings2,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AiDocumentNavHeaderProps {
  activeTab?: 
    | "generate" 
    | "templates" 
    | "categories" 
    | "tones" 
    | "history" 
    | "analytics" 
    | "settings";
  active?: 
    | "generate" 
    | "templates" 
    | "categories" 
    | "tones" 
    | "history" 
    | "analytics" 
    | "settings";
}

export function AiDocumentNavHeader({ activeTab, active }: AiDocumentNavHeaderProps) {
  const currentTab = activeTab || active || "generate";
  const tabs = [
    { id: "generate", label: "Generate Document", href: "/addons/ai-document/generate", icon: Sparkles },
    { id: "templates", label: "Templates", href: "/addons/ai-document/templates", icon: FileText },
    { id: "categories", label: "Template Categories", href: "/addons/ai-document/template-categories", icon: FolderTree },
    { id: "tones", label: "Tones", href: "/addons/ai-document/tones", icon: Smile },
    { id: "history", label: "History", href: "/addons/ai-document/history", icon: History },
    { id: "analytics", label: "Analytics", href: "/addons/ai-document/analytics", icon: BarChart2 },
    { id: "settings", label: "Settings", href: "/addons/ai-document/settings", icon: Settings2 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">AI Document Studio</h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Add-on
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Template-driven multi-lingual generative document suite with tone control, keyword optimization, and word analytics.
          </p>
        </div>
      </div>

      {/* Segmented Control Bar (Routes, not internal tabs) */}
      <div className="flex flex-wrap gap-1 p-1 bg-muted/60 rounded-lg border text-xs font-medium">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={tab.href}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all ${
                isActive
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : ""}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
