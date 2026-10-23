"use client";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Settings,
  MoreVertical,
  Kanban,
  Star,
  Lock,
  Globe,
  Trash2,
  Calendar,
  CheckSquare,
  MessageSquare,
  Layers,
  ChevronDown,
  LayoutGrid,
  ListFilter,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  ChevronRight,
  Shield,
  Clock,
  Archive,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type TaskboardMode = "projects" | "kanban" | "pipeline";

interface ClassicTaskboardAppProps {
  initialMode: TaskboardMode;
}

const DEFAULT_PROJECTS = [
  {
    id: "proj_1",
    name: "Jampack",
    letter: "J",
    color: "bg-pink-600 text-white",
    updated: "Updated 25 min ago",
    frequent: true,
    members: ["JD", "TS", "RM"],
  },
  {
    id: "proj_2",
    name: "Angular – Jampack",
    letter: "A",
    color: "bg-amber-600 text-white",
    updated: "Updated 5 min ago",
    frequent: true,
    members: ["AM", "GT"],
  },
  {
    id: "proj_3",
    name: "React – Jampack",
    letter: "R",
    color: "bg-purple-600 text-white",
    updated: "Updated Yesterday",
    frequent: false,
    members: ["JD", "TS", "RM", "AB"],
  },
  {
    id: "proj_4",
    name: "Griffin",
    letter: "G",
    color: "bg-amber-500 text-white",
    updated: "Updated 10 min ago",
    frequent: false,
    members: ["WF", "GT"],
  },
  {
    id: "proj_5",
    name: "Pangong",
    letter: "P",
    color: "bg-teal-700 text-white",
    updated: "Updated 1 hour ago",
    frequent: false,
    members: ["TS", "RM"],
  },
  {
    id: "proj_6",
    name: "Doodle",
    letter: "D",
    color: "bg-cyan-500 text-white",
    updated: "Updated 20 min ago",
    frequent: false,
    members: ["AM", "GT", "JD"],
  },
];

interface KanbanTask {
  id: string;
  title: string;
  desc?: string;
  progress?: string;
  comments?: number;
  date?: string;
  barColor?: string;
  tags?: string[];
  members?: string[];
}

interface KanbanColumn {
  id: string;
  name: string;
  count: number;
  tasks: KanbanTask[];
}

const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "all_modules",
    name: "ALL MODULES",
    count: 15,
    tasks: [
      {
        id: "t_1",
        title: "Application Pages",
        progress: "4/8",
        comments: 24,
        date: "22 Sep, 22",
        barColor: "bg-transparent",
        members: ["JD", "TS", "B"],
      },
      {
        id: "t_2",
        title: "Authentication",
        progress: "12/18",
        comments: 24,
        date: "22 Sep, 22",
        barColor: "bg-transparent",
        members: ["RM"],
      },
      {
        id: "t_3",
        title: "Menu Modules",
        progress: "0/3",
        comments: 24,
        date: "22 Sep, 22",
        barColor: "bg-transparent",
        members: ["TS"],
      },
      {
        id: "t_4",
        title: "Content",
        progress: "0/3",
        comments: 24,
        date: "22 Sep, 22",
        barColor: "bg-transparent",
        members: ["JD", "TS"],
      },
    ],
  },
  {
    id: "in_progress",
    name: "IN PROGRESS",
    count: 8,
    tasks: [
      {
        id: "t_5",
        title: "Profile Pages",
        progress: "4/8",
        comments: 18,
        date: "18 Sep, 22",
        barColor: "bg-amber-500",
        members: ["TS"],
      },
      {
        id: "t_6",
        title: "Advance Tables",
        progress: "4/8",
        comments: 24,
        date: "22 Sep, 22",
        barColor: "bg-teal-600",
        members: ["RM"],
      },
      {
        id: "t_7",
        title: "CSS Compilation",
        progress: "4/8",
        comments: 12,
        date: "18 Sep, 22",
        barColor: "bg-teal-700",
        tags: ["Priority", "Angular"],
        members: ["A"],
      },
    ],
  },
  {
    id: "completed",
    name: "COMPLETED",
    count: 5,
    tasks: [
      {
        id: "t_8",
        title: "Forms",
        desc: "Form validation works only online. Check by activating local server.",
        progress: "18/18",
        date: "28 Sep, 22",
        barColor: "bg-emerald-500",
        members: [],
      },
      {
        id: "t_9",
        title: "Tables",
        progress: "1/9",
        comments: 5,
        date: "30 Sep, 22",
        barColor: "bg-emerald-500",
        members: [],
      },
      {
        id: "t_10",
        title: "Application Pages",
        progress: "4/8",
        comments: 14,
        date: "18 Sep, 22",
        barColor: "bg-emerald-500",
        members: ["JD", "TS", "C"],
      },
    ],
  },
];

const DEFAULT_PIPELINE_STAGES = [
  {
    id: "lead_in",
    name: "LEAD IN",
    value: "$123,453",
    leadCount: 10,
    deals: [
      { id: "d1", name: "Intercom", value: "$1,025", category: "Chatbot", time: "a month ago", dot: "bg-slate-400" },
      { id: "d2", name: "Swiggy", value: "$2,456", category: "Food Order", time: "24 days", dot: "bg-teal-600" },
      { id: "d3", name: "Medium", value: "$9,425", category: "Publishing Co", time: "5 days", dot: "bg-teal-600" },
      { id: "d4", name: "Figma", value: "$109", category: "Design App", time: "2 days", dot: "bg-red-500" },
    ],
  },
  {
    id: "opportunity",
    name: "OPPORTUNITY",
    value: "$123,453",
    leadCount: 8,
    deals: [
      { id: "d5", name: "Phone pay", value: "$5,201", category: "Chatbot", time: "Yesterday", dot: "bg-red-500" },
      { id: "d6", name: "Coursera", value: "$6,542", category: "Food Order", time: "2 days", dot: "bg-slate-400" },
      { id: "d7", name: "Kickstarter", value: "$9,425", category: "Publishing Co", time: "28 days", dot: "bg-slate-400" },
      { id: "d8", name: "Codepen", value: "$901", category: "Design App", time: "18 days", dot: "bg-amber-500" },
    ],
  },
  {
    id: "proposed",
    name: "PROPOSED",
    value: "$123,453",
    leadCount: 3,
    deals: [
      { id: "d9", name: "Icons 8", value: "$9,425", category: "Chatbot", time: "a month ago", dot: "bg-slate-400" },
      { id: "d10", name: "Behance", value: "$4,560", category: "Food Order", time: "a month ago", dot: "bg-teal-600" },
      { id: "d11", name: "Morris Jet", value: "$5,217", category: "Publishing Co", time: "a month ago", dot: "bg-slate-400" },
    ],
  },
  {
    id: "follow_up",
    name: "FOLLOW UP",
    value: "$123,453",
    leadCount: 6,
    deals: [
      { id: "d12", name: "Challenger", value: "$156", category: "Chatbot", time: "a month ago", dot: "bg-pink-400" },
      { id: "d13", name: "Atmanirbhar", value: "$2,456", category: "Food Order", time: "9 days", dot: "bg-emerald-400" },
      { id: "d14", name: "Sketch", value: "$1,760", category: "Publishing Co", time: "5 days", dot: "bg-slate-400" },
      { id: "d15", name: "ITF", value: "$287", category: "UI/UX Design", time: "15 days", dot: "bg-slate-400" },
    ],
  },
];

export function ClassicTaskboardApp({ initialMode }: ClassicTaskboardAppProps) {
  const [mode, setMode] = useState<TaskboardMode>(initialMode);
  const [activeBoardTab, setActiveBoardTab] = useState<"Boards" | "Team">("Boards");
  const [searchQuery, setSearchQuery] = useState("");
  const [kanbanColumns, setKanbanColumns] = useState(DEFAULT_KANBAN_COLUMNS);
  const [pipelineStages, setPipelineStages] = useState(DEFAULT_PIPELINE_STAGES);
  const [newBoardModalOpen, setNewBoardModalOpen] = useState(false);
  const [newCardModalOpen, setNewCardModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState("all_modules");
  const [newCardTitle, setNewCardTitle] = useState("");

  // Sync Kanban state with real API
  const { data: serverKanban } = useQuery({
    queryKey: ["kanban-state"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/projects/kanban-state");
        return res?.data || res;
      } catch {
        return null;
      }
    },
  });

  // Sync Pipeline state with real API
  const { data: serverPipeline } = useQuery({
    queryKey: ["pipeline-state"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/projects/pipeline-state");
        return res?.data || res;
      } catch {
        return null;
      }
    },
  });

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    const task = {
      id: `task_${Date.now()}`,
      title: newCardTitle.trim(),
      progress: "0/1",
      comments: 0,
      date: "Today",
      barColor: "bg-teal-600",
      members: ["Me"],
    };

    setKanbanColumns((prev) =>
      prev.map((col) =>
        col.id === selectedColumnId
          ? { ...col, count: col.count + 1, tasks: [task, ...col.tasks] }
          : col
      )
    );

    setNewCardTitle("");
    setNewCardModalOpen(false);
    toast.success("Card added to board!");

    try {
      await api.put("/api/projects/kanban-state", {
        board: kanbanColumns,
      });
    } catch {
      // Local state persists
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background border-t border-border">
      {/* ─── LEFT SIDEBAR (Scrumboard Navigation) ─── */}
      <aside className="w-[280px] flex-shrink-0 border-r border-border bg-card flex flex-col justify-between">
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Add New Board Button */}
          <Button
            onClick={() => setNewBoardModalOpen(true)}
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-full h-10 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>Add New Board</span>
          </Button>

          {/* Board Views / Categories */}
          <div className="space-y-1">
            <Link
              to="/apps/taskboard/projects-board"
              onClick={() => setMode("projects")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer",
                mode === "projects"
                  ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <LayoutGrid className="size-4 text-teal-600" />
              <span>All Boards</span>
            </Link>
            <Link
              to="/apps/taskboard/kanban-board"
              onClick={() => setMode("kanban")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer",
                mode === "kanban"
                  ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Kanban className="size-4 text-teal-600" />
              <span>Project Kanban</span>
            </Link>
            <Link
              to="/apps/taskboard/pipeline"
              onClick={() => setMode("pipeline")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer",
                mode === "pipeline"
                  ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <TrendingUp className="size-4 text-teal-600" />
              <span>Pipeline Kanban</span>
            </Link>
            <button
              onClick={() => toast.info("Viewing Starred Boards")}
              className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Star className="size-4" />
              <span>Starred Boards</span>
            </button>
            <button
              onClick={() => toast.info("Viewing Private Boards")}
              className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Lock className="size-4" />
              <span>Private Boards</span>
            </button>
            <button
              onClick={() => toast.info("Viewing Public Boards")}
              className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Globe className="size-4" />
              <span>Public Boards</span>
            </button>
            <button
              onClick={() => toast.info("Viewing Deleted Boards")}
              className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Trash2 className="size-4" />
              <span>Deleted</span>
            </button>
          </div>

          {/* Favourite Boards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-bold text-teal-700 dark:text-teal-400">Favourite Boards</h5>
              <button
                onClick={() => toast.info("Add board to favorites")}
                className="size-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Plus className="size-3" />
              </button>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-[10px]">
                    J
                  </div>
                  <span className="font-semibold text-foreground">Jampack</span>
                </div>
                <Lock className="size-3 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-pink-600 text-white flex items-center justify-center font-bold text-[10px]">
                    H
                  </div>
                  <span className="font-semibold text-foreground">Hencework</span>
                </div>
                <Globe className="size-3 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Subscription Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
              <Shield className="size-3.5" />
              <span>Enterprise Edition</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
              Unlimited project boards, realtime column syncing, and team permissions active.
            </p>
          </div>
        </div>

        {/* Bottom Toolbar Icons */}
        <div className="p-3 border-t border-border flex items-center justify-around text-muted-foreground">
          <button className="hover:text-foreground p-1 transition-colors cursor-pointer" title="Settings">
            <Settings className="size-4" />
          </button>
          <button className="hover:text-foreground p-1 transition-colors cursor-pointer" title="Archive">
            <Archive className="size-4" />
          </button>
          <button className="hover:text-foreground p-1 transition-colors cursor-pointer" title="Notes">
            <BookOpen className="size-4" />
          </button>
        </div>
      </aside>

      {/* ─── MAIN TASKBOARD AREA ─── */}
      <main className="flex-1 flex flex-col bg-muted/10 overflow-hidden">
        {/* MODE 1: ALL BOARDS (Projects Board) */}
        {mode === "projects" && (
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {/* Top Switcher: Boards vs Team */}
            <div className="flex justify-center">
              <div className="inline-flex border border-border rounded-full p-0.5 bg-card shadow-2xs">
                <button
                  onClick={() => setActiveBoardTab("Boards")}
                  className={cn(
                    "px-6 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer",
                    activeBoardTab === "Boards"
                      ? "bg-teal-700 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Boards
                </button>
                <button
                  onClick={() => setActiveBoardTab("Team")}
                  className={cn(
                    "px-6 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer",
                    activeBoardTab === "Team"
                      ? "bg-teal-700 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Team
                </button>
              </div>
            </div>

            {/* Frequent Boards */}
            <div>
              <h4 className="text-sm font-bold text-foreground mb-4">Frequent Boards</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DEFAULT_PROJECTS.filter((p) => p.frequent).map((board) => (
                  <div
                    key={board.id}
                    onClick={() => {
                      setMode("kanban");
                      toast.info(`Switched to board: ${board.name}`);
                    }}
                    className="p-5 rounded-2xl border border-border/80 bg-card hover:border-teal-600 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                  >
                    <div className="flex items-center gap-3.5 mb-4">
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center font-bold text-base shadow-xs",
                          board.color
                        )}
                      >
                        {board.letter}
                      </div>
                      <h5 className="font-bold text-sm text-foreground group-hover:text-teal-700 transition-colors">
                        {board.name}
                      </h5>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-3 border-t border-border/60">
                      <div className="flex -space-x-1.5">
                        {board.members.map((m, idx) => (
                          <div
                            key={idx}
                            className="size-6 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-card flex items-center justify-center font-bold text-[9px] text-foreground"
                          >
                            {m}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                        <span>{board.updated}</span>
                        <Globe className="size-3" />
                        <MoreVertical className="size-3.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Boards Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-foreground">All Boards</h4>
                <button
                  onClick={() => setNewBoardModalOpen(true)}
                  className="size-7 rounded-lg bg-card border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {DEFAULT_PROJECTS.map((board) => (
                  <div
                    key={board.id}
                    onClick={() => {
                      setMode("kanban");
                      toast.info(`Opening ${board.name} Kanban`);
                    }}
                    className="p-5 rounded-2xl border border-border/80 bg-card hover:border-teal-600 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                  >
                    <div className="flex items-center gap-3.5 mb-4">
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center font-bold text-base shadow-xs",
                          board.color
                        )}
                      >
                        {board.letter}
                      </div>
                      <h5 className="font-bold text-sm text-foreground group-hover:text-teal-700 transition-colors">
                        {board.name}
                      </h5>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-3 border-t border-border/60">
                      <div className="flex -space-x-1.5">
                        {board.members.map((m, idx) => (
                          <div
                            key={idx}
                            className="size-6 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-card flex items-center justify-center font-bold text-[9px] text-foreground"
                          >
                            {m}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                        <span>{board.updated}</span>
                        <Globe className="size-3" />
                        <MoreVertical className="size-3.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: KANBAN BOARD */}
        {mode === "kanban" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Kanban Header Bar */}
            <div className="p-4 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-foreground">Jampack</h3>
                  <Star className="size-4 text-amber-500 fill-amber-500" />
                </div>
                <div className="flex items-center border border-border rounded-md px-2 py-1 text-xs gap-1 bg-muted/30">
                  <Lock className="size-3 text-muted-foreground" />
                  <span className="font-medium">Priv</span>
                  <ChevronDown className="size-3" />
                </div>
                <div className="flex items-center border border-border rounded-full p-0.5 bg-muted/20">
                  <span className="px-3 py-1 bg-teal-700 text-white rounded-full text-xs font-semibold shadow-2xs">
                    Task Board
                  </span>
                  <span className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    Conversation
                  </span>
                  <span className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    To Do List
                  </span>
                  <span className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    Files
                  </span>
                  <span className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    Links
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNewCardModalOpen(true)}
                  className="text-xs h-8 cursor-pointer"
                >
                  Create New
                </Button>
                <div className="relative">
                  <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search in conversation"
                    className="pl-7 text-xs h-8 w-48 bg-muted/20 border-border"
                  />
                </div>
              </div>
            </div>

            {/* Kanban Columns */}
            <div className="flex-1 overflow-x-auto p-6 flex gap-6">
              {kanbanColumns.map((col) => (
                <div key={col.id} className="w-[320px] flex-shrink-0 flex flex-col">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs tracking-wider uppercase text-foreground">{col.name}</h4>
                      <span className="size-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-[10px]">
                        {col.count}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MoreVertical className="size-4 cursor-pointer hover:text-foreground" />
                    </div>
                  </div>

                  {/* Quick Add Button */}
                  <button
                    onClick={() => {
                      setSelectedColumnId(col.id);
                      setNewCardModalOpen(true);
                    }}
                    className="w-full py-1.5 mb-3 border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-teal-600 flex items-center justify-center transition-colors cursor-pointer bg-card/50"
                  >
                    <Plus className="size-4" />
                  </button>

                  {/* Task Cards Stack */}
                  <div className="space-y-3 overflow-y-auto pr-1">
                    {col.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 rounded-xl border border-border bg-card shadow-2xs hover:shadow-xs transition-all relative overflow-hidden"
                      >
                        {task.barColor && task.barColor !== "bg-transparent" && (
                          <div className={cn("absolute top-0 left-0 right-0 h-1", task.barColor)} />
                        )}
                        <h5 className="font-bold text-xs text-foreground mb-2 mt-1">{task.title}</h5>
                        {task.desc && <p className="text-[11px] text-muted-foreground mb-3">{task.desc}</p>}

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[11px]">
                              <CheckSquare className="size-3" />
                              {task.progress}
                            </span>
                            {task.comments && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <MessageSquare className="size-3" />
                                {task.comments}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px]">{task.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODE 3: SALES PIPELINE */}
        {mode === "pipeline" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Pipeline Header */}
            <div className="p-4 border-b border-border bg-card flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h3 className="text-base font-bold text-foreground">Sales Pipeline</h3>
                <Button
                  size="sm"
                  onClick={() => toast.info("Add Deal Dialog opened")}
                  className="bg-teal-700 hover:bg-teal-800 text-white rounded-lg h-8 text-xs cursor-pointer"
                >
                  Add Deal
                </Button>
                <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground ml-2">
                  <span>
                    Pipeline Value: <strong className="text-foreground">$23,706</strong>
                  </span>
                  <span>
                    Total Value: <strong className="text-foreground">$100,000</strong>
                  </span>
                </div>
              </div>

              <div className="relative">
                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search cards" className="pl-7 text-xs h-8 w-44 bg-muted/20 border-border" />
              </div>
            </div>

            {/* Stages Columns */}
            <div className="flex-1 overflow-x-auto p-6 flex gap-6">
              {pipelineStages.map((stage) => (
                <div key={stage.id} className="w-[300px] flex-shrink-0 flex flex-col">
                  {/* Stage Title */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">{stage.name}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        <strong className="text-foreground">{stage.value}</strong> • {stage.leadCount} Leads
                      </p>
                    </div>
                    <MoreVertical className="size-4 text-muted-foreground cursor-pointer" />
                  </div>

                  <button
                    onClick={() => toast.info(`Add card to ${stage.name}`)}
                    className="w-full py-1.5 mb-3 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-teal-600 flex items-center justify-center gap-1 transition-colors cursor-pointer bg-card/60"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Card</span>
                  </button>

                  {/* Deals Stack */}
                  <div className="space-y-3 overflow-y-auto pr-1">
                    {stage.deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="p-3.5 rounded-xl border border-border bg-card shadow-2xs hover:shadow-xs transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-foreground border border-border">
                            {deal.name.slice(0, 1)}
                          </div>
                          <div>
                            <h5 className="font-bold text-xs text-foreground">{deal.name}</h5>
                            <p className="font-semibold text-xs text-teal-700 dark:text-teal-400 mt-0.5">
                              {deal.value}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{deal.category}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn("size-2 rounded-full", deal.dot)} />
                          <span className="text-[10px] text-muted-foreground">{deal.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Lost / Win Buttons */}
            <div className="p-3 border-t border-border bg-card flex items-center justify-center gap-4">
              <Button
                variant="destructive"
                className="w-40 font-bold text-xs h-9 cursor-pointer shadow-xs"
                onClick={() => toast.error("Deal marked as Lost")}
              >
                Lost
              </Button>
              <Button
                className="w-40 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-9 cursor-pointer shadow-xs"
                onClick={() => toast.success("Deal marked as Won!")}
              >
                Win
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ─── MODAL: ADD CARD ─── */}
      <Dialog open={newCardModalOpen} onOpenChange={setNewCardModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Task Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-medium">Card Title</Label>
              <Input
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="e.g. Implement Payment Gateway Webhooks"
                className="text-xs mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewCardModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white" onClick={handleAddCard}>
              Add to Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
