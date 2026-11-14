"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  UserPlus,
  Search,
  Users,
  Check,
  AlertCircle,
  Loader2,
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
  currentUserId?: string | null;
  activeCallTargetId?: string | null;
  activeParticipantEmails?: string[];
  contacts: ColleagueContact[];
  onInviteColleague: (targetUserId: string) => Promise<boolean>;
}

export function InCallInviteModal({
  open,
  onOpenChange,
  activeParticipantIds,
  currentUserId,
  activeCallTargetId,
  activeParticipantEmails = [],
  contacts,
  onInviteColleague,
}: InCallInviteModalProps) {
  const [search, setSearch] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedSuccessIds, setInvitedSuccessIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSearch("");
      setInvitingId(null);
    }
  }, [open]);

  const excludedIdSet = useMemo(() => {
    const set = new Set<string>();
    if (currentUserId) set.add(String(currentUserId).trim());
    if (activeCallTargetId) set.add(String(activeCallTargetId).trim());
    for (const id of activeParticipantIds) {
      if (id) set.add(String(id).trim());
    }
    return set;
  }, [currentUserId, activeCallTargetId, activeParticipantIds]);

  const excludedEmailSet = useMemo(() => {
    const set = new Set<string>();
    for (const email of activeParticipantEmails) {
      if (email) set.add(String(email).trim().toLowerCase());
    }
    return set;
  }, [activeParticipantEmails]);

  const currentCount = Math.max(excludedIdSet.size, activeParticipantIds.length, 2);
  const isMaxReached = currentCount >= 6;

  const filteredContacts = useMemo(() => {
    const q = search.toLowerCase().trim();
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();
    const result: ColleagueContact[] = [];

    for (const c of contacts) {
      const uid = String(c.userId || "").trim();
      if (!uid) continue;

      // Item 13: Never show current user (User-A), active target (User-B), or any existing participant
      if (excludedIdSet.has(uid)) continue;

      const emailLower = c.email ? String(c.email).trim().toLowerCase() : "";
      if (emailLower && excludedEmailSet.has(emailLower)) continue;

      // Deduplicate contacts by userId AND email so names never repeat
      if (seenIds.has(uid)) continue;
      if (emailLower && seenEmails.has(emailLower)) continue;

      if (q) {
        const matches =
          c.name.toLowerCase().includes(q) ||
          (emailLower && emailLower.includes(q)) ||
          (c.designation && c.designation.toLowerCase().includes(q));
        if (!matches) continue;
      }

      seenIds.add(uid);
      if (emailLower) seenEmails.add(emailLower);
      result.push(c);
    }

    return result;
  }, [contacts, excludedIdSet, excludedEmailSet, search]);

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
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <UserPlus className="size-5 text-primary" />
            <span>Add Colleague to Live Call</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Ring an organization colleague directly to join this active call.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* WebRTC Mesh Capacity Indicator */}
          <div className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Users className="size-4 text-primary" />
              <span>WebRTC Direct Mesh Call</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {currentCount} / 6 Peers
              </span>
              <Badge
                variant={isMaxReached ? "destructive" : "outline"}
                className={cn(
                  "text-[10px] px-2 py-0.5",
                  !isMaxReached && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                )}
              >
                {isMaxReached ? "Limit Reached" : "Active"}
              </Badge>
            </div>
          </div>

          {isMaxReached && (
            <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>Maximum participant capacity (6 peers) reached for this call.</span>
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
            className="max-h-64 overflow-y-auto space-y-1 pr-1 divide-y divide-border/50"
          >
            {filteredContacts.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                {search
                  ? "No colleagues match your search."
                  : "All available colleagues are already in this call."}
              </div>
            ) : (
              filteredContacts.slice(0, 25).map((contact) => {
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
                      onClick={() => void handleInvite(contact.userId)}
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
                          <span>Ringing</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <UserPlus className="size-3" />
                          <span>Call & Add</span>
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
