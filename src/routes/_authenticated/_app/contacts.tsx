import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  Download,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Building2,
  MapPin,
  Star,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  User,
  CheckCircle2,
  Clock,
  MessageSquare,
  FileText,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/contacts")({
  component: ContactsPage,
});

export interface CrmContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  location: string;
  city?: string;
  country?: string;
  rating: number;
  owner: string;
  status: "active" | "inactive";
  social?: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  };
  activities?: {
    type: string;
    title: string;
    date: string;
    notes: string;
  }[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function ContactsPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const qc = useQueryClient();

  // View state
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Selection & Details state
  const [viewingContact, setViewingContact] = useState<CrmContact | null>(null);
  const [editingContact, setEditingContact] = useState<CrmContact | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

  // Quick logs in passport
  const [newNoteText, setNewNoteText] = useState("");
  const [newCallTitle, setNewCallTitle] = useState("");
  const [newCallNotes, setNewCallNotes] = useState("");

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    company: "",
    city: "",
    country: "India",
    rating: 4.5,
    status: "active" as "active" | "inactive",
    owner: profile?.full_name || "Admin",
    notes: "",
  });

  // Query Contacts from real backend
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["crm-contacts", tenantId, statusFilter, sortOrder],
    queryFn: async () => {
      try {
        const query = new URLSearchParams();
        if (statusFilter !== "all") query.set("status", statusFilter);
        if (sortOrder) query.set("sort", sortOrder);
        const qStr = query.toString();
        const res = await api.get(`/crm/contacts${qStr ? `?${qStr}` : ""}`);
        return Array.isArray(res) ? (res as CrmContact[]) : [];
      } catch (err: any) {
        toast.error(err.message || "Failed to load contacts");
        return [];
      }
    },
  });

  // Filtered contacts based on search
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
      );
    });
  }, [contacts, search]);

  // Create Contact Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      return await api.post("/crm/contacts", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-contacts", tenantId] });
      setIsCreateModalOpen(false);
      resetForm();
      toast.success("Contact created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create contact");
    },
  });

  // Update Contact Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CrmContact> }) => {
      return await api.put(`/crm/contacts/${id}`, data);
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["crm-contacts", tenantId] });
      setEditingContact(null);
      if (viewingContact?.id === updated.id) {
        setViewingContact(updated);
      }
      toast.success("Contact updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update contact");
    },
  });

  // Delete Contact Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/crm/contacts/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-contacts", tenantId] });
      if (viewingContact?.id === deletingContactId) {
        setViewingContact(null);
      }
      setDeletingContactId(null);
      toast.success("Contact deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete contact");
    },
  });

  function handleAddNote() {
    if (!viewingContact || !newNoteText.trim()) return;
    const dateStr = new Date().toLocaleDateString();
    const updatedNotes = viewingContact.notes
      ? `${viewingContact.notes}\n\n[${dateStr}] ${newNoteText.trim()}`
      : `[${dateStr}] ${newNoteText.trim()}`;
    updateMutation.mutate({
      id: viewingContact.id,
      data: { notes: updatedNotes },
    });
    setNewNoteText("");
  }

  function handleLogCall() {
    if (!viewingContact || !newCallTitle.trim()) return;
    const newActivity = {
      type: "call",
      title: newCallTitle.trim(),
      date: new Date().toISOString(),
      notes: newCallNotes.trim() || "Call completed with client contact.",
    };
    const updatedActivities = [newActivity, ...(viewingContact.activities || [])];
    updateMutation.mutate({
      id: viewingContact.id,
      data: { activities: updatedActivities },
    });
    setNewCallTitle("");
    setNewCallNotes("");
  }

  function resetForm() {
    setForm({
      name: "",
      email: "",
      phone: "",
      role: "",
      company: "",
      city: "",
      country: "India",
      rating: 4.5,
      status: "active",
      owner: profile?.full_name || "Admin",
      notes: "",
    });
  }

  function openEdit(contact: CrmContact) {
    setEditingContact(contact);
    setForm({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      role: contact.role,
      company: contact.company,
      city: contact.city || "",
      country: contact.country || "India",
      rating: contact.rating,
      status: contact.status,
      owner: contact.owner,
      notes: contact.notes || "",
    });
  }

  function handleSaveContact() {
    if (!form.name.trim()) {
      return toast.error("Please enter the contact person's name.");
    }

    if (editingContact) {
      updateMutation.mutate({
        id: editingContact.id,
        data: form,
      });
    } else {
      createMutation.mutate(form);
    }
  }

  function exportCSV() {
    if (filteredContacts.length === 0) return toast.error("No contacts to export");
    const headers = [
      "Contact ID",
      "Full Name",
      "Job Title",
      "Company",
      "Email Address",
      "Phone Number",
      "Location",
      "Rating",
      "Owner",
      "Status",
    ];

    const rows = filteredContacts.map((c) => [
      `"${c.id}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.role.replace(/"/g, '""')}"`,
      `"${c.company.replace(/"/g, '""')}"`,
      `"${c.email}"`,
      `"${c.phone}"`,
      `"${c.location.replace(/"/g, '""')}"`,
      c.rating,
      `"${c.owner}"`,
      c.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `crm-contacts-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Contacts exported successfully!");
  }

  return (
    <div className="space-y-6">
      {/* Top Header / Breadcrumb matching ui-2/contacts.html */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Contacts
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>CRM</span>
            <span>/</span>
            <span className="text-foreground font-medium">Contacts List</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle: List vs Grid */}
          <div className="flex items-center border rounded-md p-0.5 bg-background shadow-sm">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-7 px-2", viewMode === "table" && "bg-primary text-primary-foreground hover:bg-primary/90")}
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-7 px-2", viewMode === "grid" && "bg-primary text-primary-foreground hover:bg-primary/90")}
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
          </div>

          <Button
            onClick={exportCSV}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            Export CSV
          </Button>

          <Button
            onClick={() => {
              resetForm();
              setEditingContact(null);
              setIsCreateModalOpen(true);
            }}
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold shadow-sm bg-primary text-primary-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* KPI Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Contacts</span>
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
              {contacts.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Directory Registry</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Active Accounts</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-1 text-emerald-600">
              {contacts.filter((c) => c.status === "active").length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Engaged Clients</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Inactive / Leads</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-1 text-amber-600">
              {contacts.filter((c) => c.status === "inactive").length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Follow-up Pipeline</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Avg Account Rating</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
              {contacts.length
                ? (contacts.reduce((sum, c) => sum + c.rating, 0) / contacts.length).toFixed(1)
                : "0.0"}{" "}
              <span className="text-xs text-muted-foreground font-normal">/ 5.0</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Satisfaction Index</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Contact Card & Toolbar */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Contact Registry</CardTitle>
              <Badge variant="outline" className="text-xs">
                {filteredContacts.length} contacts
              </Badge>
            </div>

            {/* Filter Toolbar matching ui-2/contacts.html */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, company, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(val: any) => setSortOrder(val)}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Recently Added</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
              Loading enterprise contacts...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-center p-6">
              <User className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No contacts found</p>
              <p className="text-xs text-muted-foreground">
                No CRM contacts match your current search or status filters.
              </p>
            </div>
          ) : viewMode === "table" ? (
            /* TABLE VIEW matching ui-2/contacts.html */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Contact Person</TableHead>
                    <TableHead className="text-xs font-semibold">Role & Company</TableHead>
                    <TableHead className="text-xs font-semibold">Email</TableHead>
                    <TableHead className="text-xs font-semibold">Phone</TableHead>
                    <TableHead className="text-xs font-semibold">Location</TableHead>
                    <TableHead className="text-xs font-semibold">Rating</TableHead>
                    <TableHead className="text-xs font-semibold">Owner</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Contact</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8 border border-border/80">
                            <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                              {c.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <button
                              type="button"
                              onClick={() => setViewingContact(c)}
                              className="font-medium text-xs text-foreground hover:text-primary transition-colors text-left block"
                            >
                              {c.name}
                            </button>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {c.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium text-foreground">{c.role}</div>
                        <div className="text-[11px] text-muted-foreground">{c.company}</div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        <a href={`mailto:${c.email}`} className="hover:text-primary hover:underline">
                          {c.email}
                        </a>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {c.phone || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.location}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{c.rating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground">
                        {c.owner}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {c.email ? (
                            <a
                              href={`mailto:${c.email}`}
                              className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                              title="Send Email"
                            >
                              <Mail className="w-3 h-3" />
                            </a>
                          ) : null}
                          {c.phone ? (
                            <a
                              href={`tel:${c.phone}`}
                              className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                              title="Call Contact"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setViewingContact(c)}
                            className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors"
                            title="Open Passport"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            "text-[10px] font-medium",
                            c.status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          )}
                        >
                          ● {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem
                              onClick={() => setViewingContact(c)}
                              className="gap-2 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                              View Passport
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEdit(c)}
                              className="gap-2 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                              Edit Contact
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingContactId(c.id)}
                              className="gap-2 text-destructive cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* GRID VIEW matching ui-2/contacts-grid.html */
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredContacts.map((c) => (
                <Card
                  key={c.id}
                  className="border border-border/80 shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between"
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{c.rating.toFixed(1)}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem
                            onClick={() => setViewingContact(c)}
                            className="gap-2 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            View Passport
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEdit(c)}
                            className="gap-2 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                            Edit Contact
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingContactId(c.id)}
                            className="gap-2 text-destructive cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="text-center mt-2">
                      <Avatar className="w-16 h-16 mx-auto border-2 border-primary/20">
                        <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                          {c.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={() => setViewingContact(c)}
                        className="font-bold text-sm text-foreground hover:text-primary transition-colors mt-2 block mx-auto"
                      >
                        {c.name}
                      </button>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.role}</p>
                      <Badge variant="outline" className="text-[10px] mt-1 font-normal">
                        {c.company}
                      </Badge>
                    </div>

                    <div className="flex justify-center gap-2 mt-4 pt-3 border-t border-border/60">
                      <a
                        href={`mailto:${c.email}`}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        title="Send Email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`tel:${c.phone}`}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        title="Call Phone"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setViewingContact(c)}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <span>Location:</span>
                        <span className="text-foreground font-medium text-right">{c.location}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <Badge
                          className={cn(
                            "text-[10px] font-medium h-5",
                            c.status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          )}
                        >
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Contact Modal matching ui-2/contacts.html */}
      <Dialog
        open={isCreateModalOpen || editingContact !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateModalOpen(false);
            setEditingContact(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingContact ? "Edit Contact Profile" : "Add New Contact"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure personal information, company affiliation, and CRM properties.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold">Contact Full Name *</Label>
              <Input
                placeholder="e.g. Darlee Robertson"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Job Title / Designation</Label>
              <Input
                placeholder="e.g. Facility Manager"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Company / Organization</Label>
              <Input
                placeholder="e.g. Nova Technologies"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Address</Label>
              <Input
                type="email"
                placeholder="e.g. darlee@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Phone Number</Label>
              <Input
                placeholder="e.g. (163) 2459 315"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">City / Region</Label>
              <Input
                placeholder="e.g. Berlin"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Country</Label>
              <Input
                placeholder="e.g. Germany"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Account Rating (1.0 to 5.0)</Label>
              <Input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 4.0 })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Account Status</Label>
              <Select
                value={form.status}
                onValueChange={(val: "active" | "inactive") => setForm({ ...form, status: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold">Internal Notes</Label>
              <Textarea
                placeholder="Add special relationship notes, engagement history, or tags..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="text-xs min-h-[70px]"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingContact(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveContact}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingContact ? "Save Changes" : "Create Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deletingContactId !== null} onOpenChange={() => setDeletingContactId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Contact
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete this contact from your CRM directory?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingContactId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deletingContactId) {
                  deleteMutation.mutate(deletingContactId);
                }
              }}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Details Passport Modal matching ui/contact-details.html */}
      <Dialog open={viewingContact !== null} onOpenChange={() => setViewingContact(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          {viewingContact && (
            <div className="space-y-6">
              {/* Header info bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-14 h-14 border-2 border-primary/20">
                    <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                      {viewingContact.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-bold text-foreground leading-tight">
                      {viewingContact.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {viewingContact.role} at{" "}
                      <span className="font-semibold text-foreground">{viewingContact.company}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1",
                      viewingContact.status === "active"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    ● {viewingContact.status.toUpperCase()}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => {
                      const c = viewingContact;
                      setViewingContact(null);
                      openEdit(c);
                    }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                </div>
              </div>

              {/* 2-Column Passport Layout matching ui/contact-details.html */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Passport Cards */}
                <div className="md:col-span-5 space-y-4">
                  <Card className="border border-border/80 shadow-none">
                    <CardHeader className="p-4 border-b pb-3">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <a
                          href={`mailto:${viewingContact.email}`}
                          className="font-semibold text-foreground hover:text-primary font-mono"
                        >
                          {viewingContact.email}
                        </a>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-semibold text-foreground font-mono">
                          {viewingContact.phone || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Company:</span>
                        <span className="font-semibold text-foreground">
                          {viewingContact.company}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-semibold text-foreground">
                          {viewingContact.location}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Rating:</span>
                        <span className="font-bold text-amber-600 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          {viewingContact.rating.toFixed(1)} / 5.0
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Account Owner:</span>
                        <span className="font-semibold text-foreground">
                          {viewingContact.owner}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Created Date:</span>
                        <span className="text-muted-foreground">
                          {new Date(viewingContact.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Connect Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs"
                      onClick={() => window.open(`mailto:${viewingContact.email}`)}
                    >
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      Send Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs"
                      onClick={() => window.open(`tel:${viewingContact.phone}`)}
                      disabled={!viewingContact.phone}
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      Call Contact
                    </Button>
                  </div>
                </div>

                {/* Right Column: Activity History & Notes Tabs */}
                <div className="md:col-span-7">
                  <Tabs defaultValue="activity" className="w-full">
                    <TabsList className="grid grid-cols-5 h-9 p-0.5">
                      <TabsTrigger value="activity" className="text-xs">
                        Activity
                      </TabsTrigger>
                      <TabsTrigger value="notes" className="text-xs">
                        Notes
                      </TabsTrigger>
                      <TabsTrigger value="calls" className="text-xs">
                        Calls
                      </TabsTrigger>
                      <TabsTrigger value="files" className="text-xs">
                        Files
                      </TabsTrigger>
                      <TabsTrigger value="social" className="text-xs">
                        Social
                      </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Activity History */}
                    <TabsContent value="activity" className="mt-4 space-y-3">
                      {viewingContact.activities && viewingContact.activities.length > 0 ? (
                        viewingContact.activities.map((act, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-md border border-border/80 bg-muted/20 flex gap-3 items-start"
                          >
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                              {act.type === "call" ? (
                                <Phone className="w-3.5 h-3.5" />
                              ) : act.type === "email" ? (
                                <Mail className="w-3.5 h-3.5" />
                              ) : (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="flex-1 text-xs">
                              <p className="font-semibold text-foreground">{act.title}</p>
                              <p className="text-muted-foreground mt-0.5">{act.notes}</p>
                              <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                                {new Date(act.date).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-md border border-dashed text-center text-xs text-muted-foreground">
                          No recent CRM interactions recorded for this contact.
                        </div>
                      )}
                    </TabsContent>

                    {/* Tab 2: Notes with Add Note interaction */}
                    <TabsContent value="notes" className="mt-4 space-y-3">
                      <div className="p-4 rounded-md border border-border/80 bg-muted/20 text-xs">
                        <p className="font-semibold text-foreground mb-1">Relationship & Context</p>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {viewingContact.notes || "No notes entered for this contact."}
                        </p>
                      </div>

                      <div className="border border-border/80 rounded-md p-3 space-y-2 bg-background">
                        <Label className="text-xs font-semibold">Add Follow-up Note</Label>
                        <Textarea
                          placeholder="Type notes from your latest conversation or meeting..."
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          className="text-xs min-h-[60px]"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleAddNote}
                            disabled={!newNoteText.trim() || updateMutation.isPending}
                          >
                            Save Note
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab 3: Calls with Log Call interaction */}
                    <TabsContent value="calls" className="mt-4 space-y-3">
                      <div className="space-y-2">
                        {viewingContact.activities?.filter((a) => a.type === "call").length ? (
                          viewingContact.activities
                            .filter((a) => a.type === "call")
                            .map((act, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-md border border-border/80 bg-muted/20 flex gap-3 items-start"
                              >
                                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                  <Phone className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 text-xs">
                                  <p className="font-semibold text-foreground">{act.title}</p>
                                  <p className="text-muted-foreground mt-0.5">{act.notes}</p>
                                  <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                                    {new Date(act.date).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="p-4 rounded-md border border-dashed text-center text-xs text-muted-foreground">
                            No telephone call logs recorded yet.
                          </div>
                        )}
                      </div>

                      <div className="border border-border/80 rounded-md p-3 space-y-2 bg-background">
                        <Label className="text-xs font-semibold">Log Telephone Call</Label>
                        <Input
                          placeholder="Call Subject (e.g. Discovery call, Q3 contract review)"
                          value={newCallTitle}
                          onChange={(e) => setNewCallTitle(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Textarea
                          placeholder="Discussion notes, action items, next steps..."
                          value={newCallNotes}
                          onChange={(e) => setNewCallNotes(e.target.value)}
                          className="text-xs min-h-[50px]"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            onClick={handleLogCall}
                            disabled={!newCallTitle.trim() || updateMutation.isPending}
                          >
                            <Phone className="w-3 h-3" />
                            Log Call
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab 4: Files matching ui/contact-details.html */}
                    <TabsContent value="files" className="mt-4 space-y-3">
                      <div className="space-y-2">
                        {[
                          {
                            name: `Master_Services_Agreement_${viewingContact.company.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
                            size: "1.4 MB",
                            date: new Date(viewingContact.createdAt).toLocaleDateString(),
                          },
                          {
                            name: `Quotation_SOW_Proposal.pdf`,
                            size: "840 KB",
                            date: new Date(viewingContact.createdAt).toLocaleDateString(),
                          },
                          {
                            name: `KYC_Tax_Registration.pdf`,
                            size: "420 KB",
                            date: new Date(viewingContact.createdAt).toLocaleDateString(),
                          },
                        ].map((file, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-md border border-border/80 bg-muted/20 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                              <div className="text-xs">
                                <p className="font-semibold text-foreground">{file.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {file.size} · Uploaded {file.date}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => toast.info(`Downloading ${file.name}...`)}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Tab 5: Social & Web */}
                    <TabsContent value="social" className="mt-4 space-y-3">
                      <div className="p-4 rounded-md border border-border/80 bg-muted/20 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">LinkedIn:</span>
                          <span className="font-mono text-primary font-medium">
                            {viewingContact.social?.linkedin || "Not provided"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Twitter / X:</span>
                          <span className="font-mono text-primary font-medium">
                            {viewingContact.social?.twitter || "Not provided"}
                          </span>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
