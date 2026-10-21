import React from "react";
import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Target, FileText, SlidersHorizontal, List, Grid3X3, Kanban, Network } from "lucide-react";

interface PlanningNavHeaderProps {
  active: "dashboard" | "challenges" | "charters" | "categories" | "stages" | "statuses";
  charterView?: "list" | "grid" | "kanban" | "tree";
}

export function PlanningNavHeader({ active, charterView }: PlanningNavHeaderProps) {
  return (
    <div className="space-y-3 pb-2 border-b">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={active === "dashboard" ? "default" : "outline"}
            size="sm"
            asChild
            className="h-8 text-xs font-semibold"
          >
            <Link to="/addons/planning/dashboard">
              <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
              Dashboard
            </Link>
          </Button>

          <Button
            variant={active === "challenges" ? "default" : "outline"}
            size="sm"
            asChild
            className="h-8 text-xs font-semibold"
          >
            <Link to="/addons/planning/challenges">
              <Target className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />
              Challenges
            </Link>
          </Button>

          <Button
            variant={active === "charters" ? "default" : "outline"}
            size="sm"
            asChild
            className="h-8 text-xs font-semibold"
          >
            <Link to="/addons/planning/charters">
              <FileText className="mr-1.5 h-3.5 w-3.5 text-primary" />
              Charters
            </Link>
          </Button>

          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          <Button
            variant={active === "categories" ? "default" : "ghost"}
            size="sm"
            asChild
            className="h-8 text-xs font-medium"
          >
            <Link to="/addons/planning/setup/categories">
              Categories
            </Link>
          </Button>

          <Button
            variant={active === "stages" ? "default" : "ghost"}
            size="sm"
            asChild
            className="h-8 text-xs font-medium"
          >
            <Link to="/addons/planning/setup/stages">
              Stages
            </Link>
          </Button>

          <Button
            variant={active === "statuses" ? "default" : "ghost"}
            size="sm"
            asChild
            className="h-8 text-xs font-medium"
          >
            <Link to="/addons/planning/setup/statuses">
              Statuses
            </Link>
          </Button>
        </div>

        {charterView && (
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border">
            <Button
              variant={charterView === "list" ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="h-7 px-2.5 text-xs gap-1"
            >
              <Link to="/addons/planning/charters">
                <List className="h-3 w-3" /> List
              </Link>
            </Button>
            <Button
              variant={charterView === "grid" ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="h-7 px-2.5 text-xs gap-1"
            >
              <Link to="/addons/planning/charters/grid">
                <Grid3X3 className="h-3 w-3" /> Grid
              </Link>
            </Button>
            <Button
              variant={charterView === "kanban" ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="h-7 px-2.5 text-xs gap-1"
            >
              <Link to="/addons/planning/charters/kanban">
                <Kanban className="h-3 w-3" /> Kanban
              </Link>
            </Button>
            <Button
              variant={charterView === "tree" ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="h-7 px-2.5 text-xs gap-1"
            >
              <Link to="/addons/planning/charters/tree">
                <Network className="h-3 w-3" /> Tree
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
