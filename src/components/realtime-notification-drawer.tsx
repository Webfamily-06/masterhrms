import { useState } from "react";
import { useRealtimeSocket, RealtimeNotification } from "@/lib/socket";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  CheckCheck,
  Trash2,
  Radio,
  Clock,
  Calendar,
  CreditCard,
  MessageSquare,
  AlertCircle,
} from "lucide-react";

export function RealtimeNotificationDrawer() {
  const { isConnected, notifications, unreadCount, markAllAsRead, clearAllNotifications } =
    useRealtimeSocket();
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    return n.type === filter;
  });

  const getIcon = (type: RealtimeNotification["type"]) => {
    switch (type) {
      case "punch":
        return <Clock className="size-3.5 text-blue-500" />;
      case "leave":
        return <Calendar className="size-3.5 text-amber-500" />;
      case "payroll":
        return <CreditCard className="size-3.5 text-emerald-500" />;
      case "chat":
        return <MessageSquare className="size-3.5 text-purple-500" />;
      default:
        return <AlertCircle className="size-3.5 text-primary" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 rounded-xl hover:bg-secondary/80 transition-colors"
          title="Live Notifications"
        >
          <Bell className="size-4 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white shadow-xs animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 rounded-2xl shadow-xl border overflow-hidden"
      >
        {/* Header with Connection Status */}
        <div className="p-3.5 bg-secondary/50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-xs tracking-tight">Real-Time Alerts</h4>
            <div className="flex items-center gap-1">
              <span
                className={`size-2 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-ping" : "bg-amber-500"
                }`}
              />
              <span className="text-[10px] text-muted-foreground font-mono">
                {isConnected ? "WS Live" : "Reconnecting"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 text-[10px] gap-1 px-2 font-semibold text-primary"
              >
                <CheckCheck className="size-3" /> Mark read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearAllNotifications}
                className="size-7 text-muted-foreground hover:text-destructive"
                title="Clear all"
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 px-3 py-2 border-b bg-background/50 overflow-x-auto">
          {["all", "punch", "leave", "payroll", "system"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full capitalize transition-colors ${
                filter === cat
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Notification Items List */}
        <ScrollArea className="max-h-80">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <Radio className="size-8 mx-auto opacity-30 animate-pulse" />
              <p className="font-semibold">No alerts right now</p>
              <p className="text-[10px]">Real-time system events will stream live here automatically.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 flex items-start gap-2.5 transition-colors ${
                    n.read ? "bg-background opacity-80" : "bg-primary/5 font-medium"
                  }`}
                >
                  <div className="mt-0.5 rounded-lg p-1.5 bg-secondary/80 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold truncate">{n.title}</p>
                      <span className="text-[9px] text-muted-foreground shrink-0 font-mono">
                        {new Date(n.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {n.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
