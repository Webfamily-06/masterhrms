import { useState } from "react";
import { useRealtimeSocket, RealtimeNotification, NotificationCategory } from "@/lib/socket";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
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
  ExternalLink,
} from "lucide-react";

const CATEGORIES: Array<{ key: "all" | NotificationCategory; label: string }> = [
  { key: "all", label: "All" },
  { key: "calendar", label: "Calendar" },
  { key: "punch", label: "Attendance" },
  { key: "leave", label: "Leave" },
  { key: "payroll", label: "Payroll" },
  { key: "system", label: "System" },
];

export function RealtimeNotificationDrawer() {
  const { notifications, unreadCount, markAllAsRead, markAsRead, clearAllNotifications } =
    useRealtimeSocket();
  const [filter, setFilter] = useState<"all" | NotificationCategory>("all");
  const [open, setOpen] = useState(false);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    return n.type === filter;
  });

  const getIcon = (type: RealtimeNotification["type"]) => {
    switch (type) {
      case "calendar":
        return <Calendar className="size-3.5 text-indigo-500" />;
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

  const getCategoryCount = (key: "all" | NotificationCategory) => {
    if (key === "all") return notifications.length;
    return notifications.filter((n) => n.type === key).length;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 rounded-xl hover:bg-secondary/80 transition-colors"
          title="Notifications"
          aria-label="Open notifications center"
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
        className="w-[calc(100vw-2rem)] sm:w-96 max-w-sm p-0 rounded-2xl shadow-xl border overflow-hidden"
      >
        {/* Header without technical diagnostics */}
        <div className="p-3.5 bg-secondary/50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-xs tracking-tight">Real-Time Alerts</h4>
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
                aria-label="Clear all notifications"
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b bg-background/50 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => {
            const count = getCategoryCount(cat.key);
            const isActive = filter === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setFilter(cat.key)}
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span>{cat.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[9px] px-1 py-0 rounded-full font-mono font-medium ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification Items List */}
        <ScrollArea className="max-h-80">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <Radio className="size-8 mx-auto opacity-30 animate-pulse" />
              <p className="font-semibold">No alerts right now</p>
              <p className="text-[10px]">
                {filter === "all"
                  ? "Real-time system events will stream live here automatically."
                  : `No ${filter} notifications found.`}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`p-3 flex items-start gap-2.5 transition-colors cursor-pointer hover:bg-muted/40 ${
                    n.read ? "bg-background opacity-80" : "bg-primary/5 font-medium"
                  }`}
                >
                  <div className="mt-0.5 rounded-lg p-1.5 bg-secondary/80 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-xs font-bold leading-snug break-words line-clamp-2 min-w-0 flex-1 text-foreground"
                        title={n.title}
                      >
                        {n.title}
                      </p>
                      <span className="text-[9px] text-muted-foreground shrink-0 font-mono mt-0.5 whitespace-nowrap">
                        {new Date(n.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {n.description ? (
                      <p
                        className="text-[11px] text-muted-foreground leading-snug break-words line-clamp-2"
                        title={n.description}
                      >
                        {n.description}
                      </p>
                    ) : null}
                    {n.linkTo && (
                      <div className="pt-1 flex items-center gap-1 text-[10px] text-primary font-medium">
                        <a
                          href={n.linkTo}
                          className="hover:underline flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Details <ExternalLink className="size-2.5" />
                        </a>
                      </div>
                    )}
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
