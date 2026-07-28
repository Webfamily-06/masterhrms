import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LifeBuoy, Plus, Image as ImageIcon, Upload, X, Loader2, CheckCircle2, AlertTriangle, Paperclip } from "lucide-react";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/support")({
  component: SupportPage,
  head: () => ({ meta: [{ title: "Support Tickets — Master ERP" }] }),
});

export type SupportTicket = {
  id: string;
  subject: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved";
  message: string;
  imageUrl?: string;
  imageFileName?: string;
  created: string;
};

// Strict Allowed Extensions: ONLY jpg, jpeg, png
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];

function SupportPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [message, setMessage] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [attachmentFileName, setAttachmentFileName] = useState<string>("");

  // 1. REALTIME QUERY: Fetch support tickets from Supabase
  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ["realtime-tenant-support-tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("content")
        .eq("slug", "system-tenant-support-tickets")
        .maybeSingle();

      if (data?.content && Array.isArray((data.content as any).tickets)) {
        return (data.content as any).tickets as SupportTicket[];
      }
      return [] as SupportTicket[]; // NO dummy values!
    },
  });

  // 2. REALTIME MUTATION: Save ticket list to Supabase
  const saveTicketsMutation = useMutation({
    mutationFn: async (updatedList: SupportTicket[]) => {
      const { error } = await supabase.from("cms_pages").upsert({
        slug: "system-tenant-support-tickets",
        title: "Tenant Support Helpdesk Tickets",
        meta_description: "Realtime support tickets submitted by tenants",
        content: { tickets: updatedList } as any,
        published: true,
      }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["realtime-tenant-support-tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Handle Strict Image File Upload Validation (JPG, JPEG, PNG only)
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Extract File Extension
    const fileExt = file.name.split(".").pop()?.toLowerCase();

    // Strict Validation
    if (!fileExt || !ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return toast.error(
        `Invalid file extension ".${fileExt || "unknown"}"! Only JPG, JPEG, and PNG image files are allowed.`,
        { duration: 5000 }
      );
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Url = ev.target?.result as string;
      setAttachmentUrl(base64Url);
      setAttachmentFileName(file.name);
      toast.success(`Image attachment "${file.name}" uploaded successfully!`);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveAttachment() {
    setAttachmentUrl("");
    setAttachmentFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function createTicket() {
    if (!subject.trim() || !message.trim()) {
      return toast.error("Please fill in subject and detailed issue description");
    }

    const newTck: SupportTicket = {
      id: `TCK-${Math.floor(8800 + Math.random() * 1000)}`,
      subject: subject.trim(),
      priority,
      status: "open",
      message: message.trim(),
      imageUrl: attachmentUrl || undefined,
      imageFileName: attachmentFileName || undefined,
      created: new Date().toLocaleString(),
    };

    const updatedList = [newTck, ...tickets];
    saveTicketsMutation.mutate(updatedList);

    toast.success(`Support Ticket "${newTck.id}" submitted to Helpdesk!`);

    // Reset Form
    setSubject("");
    setMessage("");
    setPriority("medium");
    setAttachmentUrl("");
    setAttachmentFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <PlanGuard moduleName="Tenant Support Tickets" requiredPlan="free">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <LifeBuoy className="size-6 text-primary" /> Tenant Support Helpdesk
            </h1>
            <p className="text-xs text-muted-foreground">Submit tech support tickets, attach screenshots & track SLA responses.</p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={tickets.length} limit={20} label="Active Support Tickets" />
          </div>
        </div>

        {/* Form & Tickets Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* New Ticket Form */}
          <Card className="lg:col-span-5 border shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold">Submit New Ticket</CardTitle>
              <CardDescription className="text-xs">Direct 24/7 channel to ERP solution engineers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Subject / Issue Title *</label>
                <Input
                  placeholder="e.g. Need assistance with GST tax import"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Priority Level</label>
                <Select value={priority} onValueChange={(val) => setPriority(val as any)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low" className="text-xs">Low Priority</SelectItem>
                    <SelectItem value="medium" className="text-xs">Medium Standard</SelectItem>
                    <SelectItem value="high" className="text-xs font-bold text-red-500">High Urgent SLA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Detailed Issue Message *</label>
                <Textarea
                  placeholder="Describe the steps, error logs or help needed..."
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>

              {/* IMAGE ATTACHMENT UPLOAD (JPG, JPEG, PNG ONLY) */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <Paperclip className="size-3.5 text-primary" /> Image Screenshot Attachment
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Allowed: .jpg, .jpeg, .png
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {!attachmentUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-9 gap-2 text-xs border-dashed"
                  >
                    <Upload className="size-3.5 text-primary" /> Select Image Screenshot (JPG, JPEG, PNG)
                  </Button>
                ) : (
                  <div className="relative border rounded-xl p-2 bg-secondary/30 flex items-center gap-3">
                    <img src={attachmentUrl} alt="Screenshot Attachment" className="size-12 object-cover rounded-lg border bg-background" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs truncate">{attachmentFileName}</div>
                      <Badge variant="outline" className="text-[9px] font-mono text-emerald-600 border-emerald-500/40 bg-emerald-500/10">
                        ✓ Valid JPG/PNG Screenshot
                      </Badge>
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="size-7 text-destructive shrink-0" onClick={handleRemoveAttachment}>
                      <X className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              <Button size="lg" onClick={createTicket} disabled={saveTicketsMutation.isPending} className="w-full font-bold gap-2 bg-primary mt-2">
                {saveTicketsMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Submit Ticket
              </Button>
            </CardContent>
          </Card>

          {/* Ticket History */}
          <Card className="lg:col-span-7 border shadow-xs flex flex-col justify-between">
            <div>
              <CardHeader className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Ticket History ({tickets.length})</CardTitle>
                    <CardDescription className="text-xs">Live tracking of active and resolved tickets.</CardDescription>
                  </div>
                  {isLoading && <Loader2 className="size-4 animate-spin text-primary" />}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {tickets.length === 0 ? (
                  <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                    <LifeBuoy className="size-8 mx-auto opacity-30" />
                    <p className="font-medium text-foreground">No support tickets submitted yet.</p>
                    <p>Fill in the subject and issue description on the left to submit your first ticket.</p>
                  </div>
                ) : (
                  <div className="divide-y text-xs">
                    {tickets.map((t) => (
                      <div key={t.id} className="p-4 space-y-2 hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-primary">{t.id}</span>
                            <Badge variant="outline" className="text-[9px] capitalize font-mono">
                              {t.priority}
                            </Badge>
                          </div>

                          <Badge
                            className={`text-[9px] font-mono capitalize shrink-0 ${
                              t.status === "resolved" ? "bg-emerald-500 text-white" : t.status === "in_progress" ? "bg-amber-500 text-white" : "bg-primary text-white"
                            }`}
                          >
                            {t.status.replace("_", " ")}
                          </Badge>
                        </div>

                        <p className="font-bold text-foreground text-xs leading-snug">{t.subject}</p>
                        <p className="text-muted-foreground text-xs leading-relaxed">{t.message}</p>

                        {/* Image Attachment Preview */}
                        {t.imageUrl && (
                          <div className="pt-2">
                            <div className="text-[10px] font-bold text-muted-foreground mb-1 flex items-center gap-1">
                              <ImageIcon className="size-3 text-primary" /> Attached Screenshot:
                            </div>
                            <a href={t.imageUrl} target="_blank" rel="noopener noreferrer" className="inline-block group">
                              <img src={t.imageUrl} alt={t.subject} className="h-24 max-w-xs object-cover rounded-lg border group-hover:opacity-90 transition-opacity" />
                            </a>
                          </div>
                        )}

                        <p className="text-[10px] text-muted-foreground font-mono pt-1">{t.created}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </PlanGuard>
  );
}
