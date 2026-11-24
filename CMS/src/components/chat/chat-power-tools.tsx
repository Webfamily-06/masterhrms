"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE, unwrapArray } from "@/lib/api";
import { getSocketClient } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Calendar,
  Video,
  Copy,
  ExternalLink,
  Plus,
  Star,
  Clock,
  Timer,
  Download,
  Bell,
  BellOff,
  MessageSquare,
  Trash2,
  Send,
  Mic,
} from "lucide-react";

interface UpcomingMeeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  meetingUrl: string;
  roomName: string;
  typeName: string;
  organizerName: string;
  attendeesCount: number;
}

export function UpcomingMeetingsSyncBar({
  workspacePrefix = "/hr",
}: {
  workspacePrefix?: string;
}) {
  const queryClient = useQueryClient();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:30");
  const [agenda, setAgenda] = useState("");

  const { data: upcoming = [] } = useQuery<UpcomingMeeting[]>({
    queryKey: ["chat-upcoming-meetings"],
    queryFn: async () => {
      const res = await api.get("/chat/upcoming-meetings");
      return unwrapArray<UpcomingMeeting>(res);
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    const socket = getSocketClient();
    if (!socket) return;
    const onSync = () => {
      queryClient.invalidateQueries({ queryKey: ["chat-upcoming-meetings"] });
    };
    socket.on("meeting:upcoming:sync", onSync);
    return () => {
      socket.off("meeting:upcoming:sync", onSync);
    };
  }, [queryClient]);

  const scheduleMutation = useMutation({
    mutationFn: async () =>
      api.post("/chat/schedule-meeting", {
        title: title.trim(),
        meetingDate,
        startTime,
        endTime,
        agenda: agenda.trim() || undefined,
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["chat-upcoming-meetings"] });
      queryClient.invalidateQueries({ queryKey: ["hr-meetings"] });
      const link = res?.meetingUrl || res?.data?.meetingUrl;
      toast.success(
        link ? `Meeting scheduled! Link generated: ${link}` : "Meeting scheduled & synced."
      );
      setScheduleOpen(false);
      setTitle("");
      setAgenda("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to schedule meeting.");
    },
  });

  return (
    <>
      <div className="px-3 py-2 border-b border-border/70 bg-emerald-500/5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
            <Calendar className="h-3.5 w-3.5" />
            Upcoming Meetings ({upcoming.length})
          </span>

          {upcoming.length === 0 ? (
            <span className="text-muted-foreground text-[11px]">No upcoming meetings</span>
          ) : (
            upcoming.slice(0, 3).map((m) => {
              const dt = new Date(m.startTime);
              const timeStr = Number.isNaN(dt.getTime())
                ? ""
                : dt.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
              return (
                <div
                  key={m.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border/80 px-2.5 py-1 shrink-0"
                >
                  <Video className="h-3 w-3 text-emerald-600" />
                  <span className="font-medium text-foreground max-w-[140px] truncate">
                    {m.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                  <button
                    type="button"
                    title="Copy Meeting Link"
                    onClick={() => {
                      const fullLink = m.meetingUrl.startsWith("http")
                        ? m.meetingUrl
                        : `${window.location.origin}${m.meetingUrl}`;
                      navigator.clipboard.writeText(fullLink);
                      toast.success("Meeting link copied.");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <a
                    href={m.meetingUrl || `${workspacePrefix}/chat/calls`}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center"
                    title="Join Meeting"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              );
            })
          )}
        </div>

        <Button
          type="button"
          size="xs"
          onClick={() => setScheduleOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-[11px] gap-1 shrink-0"
        >
          <Plus className="h-3 w-3" />
          Schedule Meeting
        </Button>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Meeting (Auto-generates Link)</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) {
                toast.error("Meeting title is required.");
                return;
              }
              scheduleMutation.mutate();
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label>
                Meeting Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sprint Sync"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Agenda</Label>
              <Textarea
                rows={2}
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="Optional agenda..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={scheduleMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {scheduleMutation.isPending ? "Scheduling..." : "Schedule & Sync"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ChatPowerToolsBar({
  threadId,
  onSelectThreadMessage,
}: {
  threadId?: string | null;
  onSelectThreadMessage?: (messageId: string) => void;
}) {
  const queryClient = useQueryClient();

  const [starredOpen, setStarredOpen] = useState(false);
  const [scheduleMsgOpen, setScheduleMsgOpen] = useState(false);
  const [disappearOpen, setDisappearOpen] = useState(false);
  const [threadModalMsgId, setThreadModalMsgId] = useState<string | null>(null);
  const [threadReplyText, setThreadReplyText] = useState("");
  const [transcribing, setTranscribing] = useState(false);

  // Schedule message form
  const [schedContent, setSchedContent] = useState("");
  const [schedWhen, setSchedWhen] = useState("");
  const [disappearTtl, setDisappearTtl] = useState("0");

  const { data: pushStatus } = useQuery<{ enabled: boolean; count: number }>({
    queryKey: ["chat-push-status"],
    queryFn: async () => {
      const res: any = await api.get("/chat/push/status");
      return res?.data || res || { enabled: false, count: 0 };
    },
  });

  const { data: starredMessages = [] } = useQuery<any[]>({
    queryKey: ["chat-starred-messages"],
    enabled: starredOpen,
    queryFn: async () => {
      const res = await api.get("/chat/messages/starred");
      return unwrapArray(res);
    },
  });

  const { data: scheduledMessages = [] } = useQuery<any[]>({
    queryKey: ["chat-scheduled-messages"],
    enabled: scheduleMsgOpen,
    queryFn: async () => {
      const res = await api.get("/chat/messages/scheduled");
      return unwrapArray(res);
    },
  });

  const { data: threadData } = useQuery<{ root: any; replies: any[] }>({
    queryKey: ["chat-thread-replies", threadModalMsgId],
    enabled: Boolean(threadModalMsgId),
    queryFn: async () => {
      const res: any = await api.get(`/chat/messages/${threadModalMsgId}/thread`);
      return res?.data || res;
    },
  });

  async function handleTogglePush() {
    try {
      if (pushStatus?.enabled) {
        await api.delete("/chat/push/unsubscribe");
        toast.success("Offline push notifications disabled.");
      } else {
        if (typeof window !== "undefined" && "Notification" in window) {
          await Notification.requestPermission();
        }
        await api.post("/chat/push/subscribe", {
          platform: "web",
          endpoint: typeof window !== "undefined" ? window.location.origin : "web",
        });
        toast.success("Offline push notifications enabled.");
      }
      queryClient.invalidateQueries({ queryKey: ["chat-push-status"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update push notifications.");
    }
  }

  async function handleExport(format: "csv" | "json") {
    if (!threadId) {
      toast.info("Open a conversation first to export its transcript.");
      return;
    }
    try {
      const base = (API_BASE || "").replace(/\/+$/, "");
      const url = `${base}/chat/conversations/${encodeURIComponent(threadId)}/export?format=${format}`;
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success(`Exporting conversation as ${format.toUpperCase()}...`);
    } catch {
      toast.error("Failed to export conversation.");
    }
  }

  function handleQuickVoiceTranscribe() {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.info("Live voice transcription requires Chrome/Edge Web Speech API.");
      return;
    }
    const rec = new SpeechRec();
    rec.lang = "en-US";
    rec.interimResults = false;
    setTranscribing(true);
    rec.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        navigator.clipboard?.writeText(transcript).catch(() => {});
        toast.success(`Transcribed & copied: "${transcript}"`);
      }
      setTranscribing(false);
    };
    rec.onerror = () => {
      setTranscribing(false);
      toast.error("Voice transcription failed or microphone denied.");
    };
    rec.onend = () => setTranscribing(false);
    rec.start();
  }

  return (
    <>
      <div className="px-3 py-1.5 border-b border-border/60 bg-muted/20 flex flex-wrap items-center gap-1.5 text-[11px]">
        <button
          type="button"
          onClick={() => setStarredOpen(true)}
          className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-card hover:bg-muted px-2 py-1 font-medium text-foreground"
        >
          <Star className="h-3 w-3 text-amber-500" />
          Starred
        </button>

        {threadId && (
          <>
            <button
              type="button"
              onClick={() => setScheduleMsgOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-card hover:bg-muted px-2 py-1 font-medium text-foreground"
            >
              <Clock className="h-3 w-3 text-blue-600" />
              Schedule Msg
            </button>

            <button
              type="button"
              onClick={() => setDisappearOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-card hover:bg-muted px-2 py-1 font-medium text-foreground"
            >
              <Timer className="h-3 w-3 text-purple-600" />
              Disappearing
            </button>

            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-card hover:bg-muted px-2 py-1 font-medium text-foreground"
            >
              <Download className="h-3 w-3 text-emerald-600" />
              Export CSV
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleQuickVoiceTranscribe}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-medium ${
            transcribing
              ? "border-rose-500 bg-rose-500/10 text-rose-600 animate-pulse"
              : "border-border/70 bg-card hover:bg-muted text-foreground"
          }`}
        >
          <Mic className="h-3 w-3 text-rose-500" />
          {transcribing ? "Listening..." : "Voice Transcribe"}
        </button>

        <button
          type="button"
          onClick={handleTogglePush}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-border/70 bg-card hover:bg-muted px-2 py-1 font-medium text-foreground"
          title="Toggle Offline Push Notifications"
        >
          {pushStatus?.enabled ? (
            <>
              <Bell className="h-3 w-3 text-emerald-600" />
              Push On
            </>
          ) : (
            <>
              <BellOff className="h-3 w-3 text-muted-foreground" />
              Push Off
            </>
          )}
        </button>
      </div>

      {/* Starred Messages Modal */}
      <Dialog open={starredOpen} onOpenChange={setStarredOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Starred Messages
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {starredMessages.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No starred messages yet. Star any message to bookmark it here.
              </p>
            ) : (
              starredMessages.map((m: any) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{m.senderName}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setThreadModalMsgId(m.id);
                          onSelectThreadMessage?.(m.id);
                        }}
                        className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Thread
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.post(`/chat/messages/${m.id}/star`, {});
                          queryClient.invalidateQueries({ queryKey: ["chat-starred-messages"] });
                          toast.success("Removed from starred.");
                        }}
                        className="text-rose-600 hover:underline"
                      >
                        Unstar
                      </button>
                    </div>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap">{m.content}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Message Modal */}
      <Dialog open={scheduleMsgOpen} onOpenChange={setScheduleMsgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea
                rows={3}
                value={schedContent}
                onChange={(e) => setSchedContent(e.target.value)}
                placeholder="Type message to schedule..."
              />
            </div>
            <div className="space-y-1">
              <Label>Send At</Label>
              <Input
                type="datetime-local"
                value={schedWhen}
                onChange={(e) => setSchedWhen(e.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={async () => {
                if (!threadId || !schedContent.trim() || !schedWhen) {
                  toast.error("Please enter message and future send time.");
                  return;
                }
                try {
                  await api.post("/chat/messages/schedule", {
                    threadId,
                    content: schedContent.trim(),
                    scheduledFor: new Date(schedWhen).toISOString(),
                  });
                  toast.success("Message scheduled.");
                  setSchedContent("");
                  setSchedWhen("");
                  queryClient.invalidateQueries({ queryKey: ["chat-scheduled-messages"] });
                } catch (err: any) {
                  toast.error(err?.response?.data?.error || "Failed to schedule message.");
                }
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Schedule Message
            </Button>

            {scheduledMessages.length > 0 && (
              <div className="pt-2 border-t border-border/60 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">
                  Pending Scheduled ({scheduledMessages.length})
                </div>
                {scheduledMessages.map((sm: any) => (
                  <div
                    key={sm.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/70 p-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{sm.content}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(sm.scheduledFor).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.delete(`/chat/messages/scheduled/${sm.id}`);
                        queryClient.invalidateQueries({ queryKey: ["chat-scheduled-messages"] });
                        toast.success("Scheduled message cancelled.");
                      }}
                      className="text-rose-600 hover:bg-rose-500/10 p-1 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Disappearing Messages Modal */}
      <Dialog open={disappearOpen} onOpenChange={setDisappearOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Disappearing Messages Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={disappearTtl} onValueChange={setDisappearTtl}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Off</SelectItem>
                <SelectItem value="3600">1 Hour</SelectItem>
                <SelectItem value="86400">24 Hours</SelectItem>
                <SelectItem value="604800">7 Days</SelectItem>
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDisappearOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={async () => {
                  if (!threadId) return;
                  await api.patch(
                    `/chat/conversations/${encodeURIComponent(threadId)}/disappearing`,
                    { ttlSeconds: Number(disappearTtl) }
                  );
                  toast.success("Disappearing message timer saved.");
                  setDisappearOpen(false);
                }}
              >
                Save Timer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thread Replies Modal */}
      <Dialog
        open={Boolean(threadModalMsgId)}
        onOpenChange={(o) => !o && setThreadModalMsgId(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thread Replies</DialogTitle>
          </DialogHeader>
          {threadData && (
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                <div className="font-bold text-foreground">{threadData.root?.senderName}</div>
                <p className="mt-1 text-foreground">{threadData.root?.content}</p>
              </div>
              <div className="space-y-2 pl-3 border-l-2 border-emerald-500/40">
                {(threadData.replies || []).map((r: any) => (
                  <div key={r.id} className="rounded-md bg-card border border-border/70 p-2.5">
                    <div className="font-semibold text-foreground">{r.senderName}</div>
                    <p className="mt-0.5 text-foreground">{r.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Input
                  value={threadReplyText}
                  onChange={(e) => setThreadReplyText(e.target.value)}
                  placeholder="Reply in thread..."
                  className="h-9 text-xs"
                />
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                  onClick={async () => {
                    if (!threadModalMsgId || !threadReplyText.trim()) return;
                    await api.post(`/chat/messages/${threadModalMsgId}/thread`, {
                      content: threadReplyText.trim(),
                    });
                    setThreadReplyText("");
                    queryClient.invalidateQueries({
                      queryKey: ["chat-thread-replies", threadModalMsgId],
                    });
                    toast.success("Thread reply sent.");
                  }}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
