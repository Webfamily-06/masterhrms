import { Link } from "@/lib/router-compat";
import { Sliders, CheckSquare, BarChart2, History, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AiAssistantNavHeaderProps {
  activeTab: "settings" | "fields" | "usage" | "history";
}

export function AiAssistantNavHeader({ activeTab }: AiAssistantNavHeaderProps) {
  const tabs = [
    { id: "settings", label: "Settings", href: "/addons/ai-assistant/settings", icon: Sliders },
    { id: "fields", label: "Field Rules", href: "/addons/ai-assistant/fields", icon: CheckSquare },
    { id: "usage", label: "Usage Analytics", href: "/addons/ai-assistant/usage", icon: BarChart2 },
    { id: "history", label: "Prompt History", href: "/addons/ai-assistant/history", icon: History },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">AI Assistant Hub</h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Add-on
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Enterprise LLM provider orchestration, contextual field injection, and automated token budgeting.
          </p>
        </div>
      </div>

      {/* Segmented Control Bar (Routes, not tabs) */}
      <div className="inline-flex p-1 bg-muted/60 rounded-lg border text-sm font-medium">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={tab.href}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                isActive
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
