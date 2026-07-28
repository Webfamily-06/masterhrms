import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  LifeBuoy,
  Tag,
  Ticket,
  Plus,
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  Trash2,
  Pencil,
  RefreshCw,
  User,
  Send,
  Loader2,
  Filter,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/support")({
  component: SupportDeskAdmin,
});

export type SupportTicket = {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  user_name: string;
  user_email: string;
  created_at: string;
  messages: { sender: string; text: string; time: string }[];
};

export type SupportCategory = {
  id: string;
  name: string;
  count: number;
};

const DEFAULT_CATEGORIES: SupportCategory[] = [
  { id: "cat-1", name: "Technical & Bug Report", count: 0 },
  { id: "cat-2", name: "Billing & Subscription", count: 0 },
  { id: "cat-3", name: "Addon & Integration", count: 0 },
  { id: "cat-4", name: "Feature Request", count: 0 },
  { id: "cat-5", name: "Account & Login", count: 0 },
];

function SupportDeskAdmin() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all_tickets" | "categories">("all_tickets");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // 1. REALTIME QUERY: Fetch support tickets & categories from Supabase
  const { data: supportData, isLoading, refetch } = useQuery({
    queryKey: ["realtime-support-desk"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-support-tickets").maybeSingle();
      if (data?.content) {
        const parsed = data.content as any;
        return {
          tickets: (parsed.tickets ?? []) as SupportTicket[],
          categories: (parsed.categories ?? DEFAULT_CATEGORIES) as SupportCategory[],
        };
      }
      return { tickets: [], categories: DEFAULT_CATEGORIES };
    },
  });

  const tickets = supportData?.tickets ?? [];
  const categories = supportData?.categories ?? DEFAULT_CATEGORIES;
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) ?? tickets[0] ?? null;

  // 2. REALTIME MUTATION: Save tickets & categories to Supabase
  const saveSupportDataMutation = useMutation({
    mutationFn: async ({ updatedTickets, updatedCategories }: { updatedTickets?: SupportTicket[]; updatedCategories?: SupportCategory[] }) => {
      const payload = {
        tickets: updatedTickets ?? tickets,
        categories: updatedCategories ?? categories,
      };
      const { error } = await supabase.from("cms_pages").upsert({
        slug: "system-support-tickets",
        title: "System Support Desk",
        meta_description: "Realtime support tickets and categories",
        content: payload as any,
        published: true,
      }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["realtime-support-desk"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const needle = searchQuery.toLowerCase();
      const matchesSearch =
        !needle ||
        t.ticket_number.toLowerCase().includes(needle) ||
        t.subject.toLowerCase().includes(needle) ||
        t.user_name.toLowerCase().includes(needle) ||
        t.user_email.toLowerCase().includes(needle);

      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchQuery, statusFilter]);

  function handleSendReply() {
    if (!replyText || !selectedTicket) return;
    const newMsg = {
      sender: "Super Admin",
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updatedMessages = [...selectedTicket.messages, newMsg];
    const updatedTickets = tickets.map((t) =>
      t.id === selectedTicket.id ? { ...t, messages: updatedMessages, status: "in_progress" as const } : t
    );

    saveSupportDataMutation.mutate({ updatedTickets });
    setReplyText("");
    toast.success("Reply sent & saved in real-time");
  }

  function handleUpdateStatus(ticketId: string, newStatus: SupportTicket["status"]) {
    const updatedTickets = tickets.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t));
    saveSupportDataMutation.mutate({ updatedTickets });
    toast.success(`Ticket status updated to "${newStatus}"`);
  }

  function handleAddCategory() {
    if (!newCategoryName) return;
    const updatedCategories = [...categories, { id: `cat-${Date.now()}`, name: newCategoryName, count: 0 }];
    saveSupportDataMutation.mutate({ updatedCategories });
    setNewCategoryName("");
    setIsCategoryModalOpen(false);
    toast.success("Category added in real-time");
  }

  function handleDeleteTicket(id: string) {
    const updatedTickets = tickets.filter((t) => t.id !== id);
    saveSupportDataMutation.mutate({ updatedTickets });
    if (selectedTicketId === id) setSelectedTicketId(null);
    toast.success("Ticket deleted");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Support Desk</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <LifeBuoy className="size-3 text-primary" /> Realtime Tickets ({tickets.length})
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time customer support desk connected to Supabase database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh Data
          </Button>
          <Button size="sm" onClick={() => setIsCategoryModalOpen(true)} className="gap-2">
            <FolderPlus className="size-4" /> Add Category
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-2 w-[360px]">
          <TabsTrigger value="all_tickets" className="gap-2 text-xs">
            <Ticket className="size-3.5" /> All Tickets ({tickets.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 text-xs">
            <Tag className="size-3.5" /> Categories ({categories.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ALL TICKETS LIST & CHAT DRAWER */}
        <TabsContent value="all_tickets" className="space-y-6 pt-4">
          <Card className="p-4 shadow-xs border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ticket #, subject, customer email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[160px] text-xs">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                  <SelectItem value="open" className="text-xs">🔴 Open</SelectItem>
                  <SelectItem value="in_progress" className="text-xs">🟡 In Progress</SelectItem>
                  <SelectItem value="resolved" className="text-xs">🟢 Resolved</SelectItem>
                  <SelectItem value="closed" className="text-xs">⚫ Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {isLoading ? (
            <div className="py-20 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">
              {/* Tickets Table */}
              <Card className="shadow-xs border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-secondary/50 font-semibold border-b text-muted-foreground uppercase text-[10px]">
                      <tr>
                        <th className="p-3 pl-4">Ticket</th>
                        <th className="p-3">Subject & Category</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            No tickets in database matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredTickets.map((t) => (
                          <tr
                            key={t.id}
                            onClick={() => setSelectedTicketId(t.id)}
                            className={`cursor-pointer transition-colors ${
                              selectedTicket?.id === t.id ? "bg-primary/5 font-medium" : "hover:bg-secondary/30"
                            }`}
                          >
                            <td className="p-3 pl-4 font-mono font-bold text-primary">{t.ticket_number}</td>
                            <td className="p-3">
                              <div className="font-semibold text-foreground">{t.subject}</div>
                              <div className="text-[11px] text-muted-foreground">{t.user_name} ({t.category})</div>
                            </td>
                            <td className="p-3">
                              <Badge
                                variant="outline"
                                className={`text-[10px] capitalize ${
                                  t.priority === "urgent" || t.priority === "high"
                                    ? "text-red-600 border-red-600"
                                    : "text-slate-600"
                                }`}
                              >
                                {t.priority}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={t.status === "resolved" ? "default" : "secondary"}
                                className={`text-[10px] capitalize ${
                                  t.status === "open"
                                    ? "bg-red-500 text-white"
                                    : t.status === "in_progress"
                                    ? "bg-amber-500 text-white"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                {t.status.replace("_", " ")}
                              </Badge>
                            </td>
                            <td className="p-3 pr-4 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTicket(t.id);
                                }}
                                className="text-destructive hover:bg-destructive/10 size-7 p-0"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Selected Ticket Conversation Panel */}
              {selectedTicket ? (
                <Card className="shadow-xs border sticky top-6">
                  <CardHeader className="p-4 border-b bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-xs">{selectedTicket.ticket_number}</Badge>
                      <Select
                        value={selectedTicket.status}
                        onValueChange={(val) => handleUpdateStatus(selectedTicket.id, val as any)}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">🔴 Open</SelectItem>
                          <SelectItem value="in_progress">🟡 In Progress</SelectItem>
                          <SelectItem value="resolved">🟢 Resolved</SelectItem>
                          <SelectItem value="closed">⚫ Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <CardTitle className="text-sm font-bold">{selectedTicket.subject}</CardTitle>
                    <CardDescription className="text-xs">
                      Customer: <strong>{selectedTicket.user_name}</strong> ({selectedTicket.user_email})
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Messages Stream */}
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {selectedTicket.messages.map((msg, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-xl text-xs space-y-1 ${
                            msg.sender === "Super Admin" ? "bg-primary text-primary-foreground ml-4" : "bg-secondary border mr-4"
                          }`}
                        >
                          <div className="flex justify-between font-bold text-[10px] opacity-80">
                            <span>{msg.sender}</span>
                            <span>{msg.time}</span>
                          </div>
                          <p className="leading-relaxed">{msg.text}</p>
                        </div>
                      ))}
                    </div>

                    {/* Reply Input */}
                    <div className="space-y-2 pt-2 border-t">
                      <Textarea
                        placeholder="Type admin reply message..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                        className="text-xs"
                      />
                      <Button size="sm" onClick={handleSendReply} disabled={saveSupportDataMutation.isPending} className="w-full gap-2">
                        {saveSupportDataMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                        Send & Sync Reply
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="p-8 text-center text-xs text-muted-foreground">
                  Select a ticket from the table to view conversation history and reply.
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: CATEGORY MANAGER */}
        <TabsContent value="categories" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Tag className="size-4 text-primary" /> Support Categories ({categories.length})
            </h2>
            <Button size="sm" onClick={() => setIsCategoryModalOpen(true)} className="gap-1.5 text-xs">
              <Plus className="size-3.5" /> Add Category
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {categories.map((cat) => (
              <Card key={cat.id} className="p-4 flex items-center justify-between border shadow-xs">
                <div>
                  <h4 className="font-bold text-sm">{cat.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tickets.filter((t) => t.category === cat.name).length} Active Tickets
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    const updatedCategories = categories.filter((c) => c.id !== cat.id);
                    saveSupportDataMutation.mutate({ updatedCategories });
                  }}
                  className="size-7 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Category Dialog */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Support Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">Category Name</Label>
            <Input
              placeholder="e.g. Mobile App & API"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
