"use client";

import React, { useState, useMemo } from "react";
import {
  UserPlus,
  Search,
  Users,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getDeterministicInitials, getDeterministicAvatarColor } from "./adaptive-video-grid";

export interface ColleagueContact {
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  designation?: string;
}

export interface InCallInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callId: string;
  activeParticipantIds: string[];
  contacts: ColleagueContact[];
  onInviteColleague: (targetUserId: string) => Promise<boolean>;
}

export function InCallInviteModal({
  open,
  onOpenChange,
  callId,
  activeParticipantIds,
  contacts,
  onInviteColleague,
}: InCallInviteModalProps) {
  const [search, setSearch] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedSuccessIds, setInvitedSuccessIds] = useState<Set<string>>(new Set());

  const currentCount = activeParticipantIds.length;
  const isMaxReached = currentCount >= 5;

  const filteredContacts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return contacts.filter((c) => {
      // Exclude already active or invited in current call
      const isAlreadyInCall = activeParticipantIds.includes(c.userId);
      if (isAlreadyInCall) return false;

      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.designation && c.designation.toLowerCase().includes(q))
      );
    });
  }, [contacts, activeParticipantIds, search]);

  const handleInvite = async (userId: string) => {
    if (isMaxReached || invitingId) return;
    setInvitingId(userId);
    try {
      const ok = await onInviteColleague(userId);
      if (ok) {
        setInvitedSuccessIds((prev) => new Set([...prev, userId]));
      }
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="in-call-invite-modal"
        className="sm:max-w-md font-sans select-none"
        style={{
          fontFamily:
            '"Public Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <UserPlus className="size-5 text-primary" />
            <span>Add Colleague to Live Call</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Invite verified organization members to join this P2P direct call.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* P2P Mesh Capacity Indicator */}
          <div className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Users className="size-4 text-primary" />
              <span>P2P Direct Mesh Call</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {currentCount} / 5 Peers
              </span>
              <Badge
                variant={isMaxReached ? "destructive" : "outline"}
                className={cn(
                  "text-[10px] px-2 py-0.5",
                  !isMaxReached && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                )}
              >
                {isMaxReached ? "Limit Reached" : "Optimal 2-4"}
              </Badge>
            </div>
          </div>

          {/* Max Reached Alert */}
          {isMaxReached && (
            <div className="p-3 rounded-lg bg-warning/15 border border-warning/30 text-warning text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-warning" />
              <span>
                Maximum participant capacity (5 peers for P2P mesh) reached. No further colleagues can be added without an SFU media server.
              </span>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="in-call-invite-search"
              placeholder="Search colleagues by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isMaxReached}
              className="text-xs pl-8 h-9"
            />
          </div>

          {/* Colleague List */}
          <div
            data-testid="in-call-colleagues-list"
            className="max-h-60 overflow-y-auto space-y-1 pr-1 divide-y divide-border/50"
          >
            {filteredContacts.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                {search ? "No colleagues match your search." : "No additional colleagues available."}
              </div>
            ) : (
              filteredContacts.slice(0, 15).map((contact) => {
                const isInvited = invitedSuccessIds.has(contact.userId);
                const isCurrentInviting = invitingId === contact.userId;
                const initials = getDeterministicInitials(contact.name);
                const avatarBg = getDeterministicAvatarColor(contact.name);

                return (
                  <div
                    key={contact.userId}
                    data-testid={`colleague-row-${contact.userId}`}
                    className="pt-2 pb-1.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {contact.avatarUrl ? (
                        <img
                          src={contact.avatarUrl}
                          alt={contact.name}
                          className="size-8 rounded-full object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div
                          className={cn(
                            "size-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border",
                            avatarBg
                          )}
                        >
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {contact.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {contact.designation || contact.email || "Organization Member"}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isInvited ? "outline" : "default"}
                      disabled={isMaxReached || isInvited || isCurrentInviting}
                      data-testid={`btn-invite-${contact.userId}`}
                      onClick={() => handleInvite(contact.userId)}
                      className={cn(
                        "h-7 text-xs px-2.5 cursor-pointer rounded-md shrink-0",
                        isInvited && "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                      )}
                    >
                      {isCurrentInviting ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : isInvited ? (
                        <span className="flex items-center gap-1">
                          <Check className="size-3 text-emerald-500" />
                          <span>Invited</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <UserPlus className="size-3" />
                          <span>Invite</span>
                        </span>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
