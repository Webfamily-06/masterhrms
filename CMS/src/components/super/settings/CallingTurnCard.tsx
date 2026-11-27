'use client';

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CallingTurnCard() {
  const qc = useQueryClient();
  const [showCred, setShowCred] = useState(false);
  const [testing, setTesting] = useState(false);

  const [form, setForm] = useState({
    turnUrls: "stun:stun.l.google.com:19302",
    turnUsername: "",
    turnCredential: "",
    hasCredential: false,
    reconnectGraceMs: "15000",
  });

  const { data } = useQuery({
    queryKey: ["settings", "PLATFORM", "calling"],
    queryFn: async () => {
      const res: any = await api.get("/v1/settings/PLATFORM/calling").catch(() => null);
      return res?.values || {};
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm((prev) => ({
      ...prev,
      turnUrls: String(data["calling.turn_urls"] || "stun:stun.l.google.com:19302"),
      turnUsername: String(data["calling.turn_username"] || ""),
      turnCredential: data["calling.turn_credential"]?.set ? "••••••••••••••••" : "",
      hasCredential: Boolean(data["calling.turn_credential"]?.set),
      reconnectGraceMs: String(data["calling.reconnect_grace_ms"] ?? 15000),
    }));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        "calling.turn_urls": form.turnUrls.trim(),
        "calling.turn_username": form.turnUsername.trim(),
        "calling.reconnect_grace_ms": Math.max(3000, Math.min(120000, Number(form.reconnectGraceMs) || 15000)),
      };
      if (form.turnCredential && !form.turnCredential.includes("••••")) {
        payload["calling.turn_credential"] = form.turnCredential.trim();
      }
      return await api.put("/v1/settings/PLATFORM/calling", payload);
    },
    onSuccess: () => {
      toast.success("WebRTC TURN/STUN calling infrastructure saved.");
      qc.invalidateQueries({ queryKey: ["settings", "PLATFORM", "calling"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save calling settings"),
  });

  async function handleTestTurn() {
    setTesting(true);
    try {
      const res: any = await api.post("/v1/settings/PLATFORM/calling/test", {
        "calling.turn_urls": form.turnUrls.trim(),
      });
      if (res?.success) {
        toast.success("ICE Server Config Valid!", { description: res.message });
      } else {
        toast.error("ICE Validation Failed", { description: res?.error });
      }
    } catch (err: any) {
      toast.error("Validation Error", { description: err?.response?.data?.error || err?.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card id="settings-section-calling" className="border border-border/80 rounded-xl bg-card shadow-xs scroll-mt-20">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4 flex-wrap">
          <div className="flex items-start gap-2.5">
            <i className="ph ph-phone-call text-xl text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-foreground">WebRTC Audio &amp; Video Calling (TURN / STUN)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure STUN/TURN relay servers and reconnect tolerance for built-in unified chat voice &amp; video calls behind corporate firewalls.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={testing}
              onClick={handleTestTurn}
              className="gap-1.5"
            >
              <i className={testing ? "ph ph-spinner-gap animate-spin" : "ph ph-check-circle"} />
              Validate URIs
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <i className={saveMut.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-floppy-disk"} />
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-semibold">ICE Server URLs (Comma-Separated)</Label>
            <Input
              value={form.turnUrls}
              onChange={(e) => setForm((p) => ({ ...p, turnUrls: e.target.value }))}
              placeholder="stun:stun.l.google.com:19302, turn:turn.masterhrms.com:3478, turns:turn.masterhrms.com:5349"
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">TURN Username (Optional)</Label>
            <Input
              value={form.turnUsername}
              onChange={(e) => setForm((p) => ({ ...p, turnUsername: e.target.value }))}
              placeholder="Leave blank if using coturn HMAC shared secret"
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">TURN Credential / Shared Secret</Label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                {form.hasCredential ? "Encrypted & Set" : "Not set"}
              </span>
            </div>
            <div className="relative">
              <Input
                type={showCred ? "text" : "password"}
                value={form.turnCredential}
                onChange={(e) => setForm((p) => ({ ...p, turnCredential: e.target.value }))}
                placeholder="TURN password or HMAC secret"
                className="h-9 text-xs pr-9"
              />
              <button
                type="button"
                onClick={() => setShowCred((v) => !v)}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <i className={`ph ${showCred ? "ph-eye-slash" : "ph-eye"} text-sm`} />
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Call Reconnect Grace Window (ms)</Label>
            <Input
              type="number"
              min={3000}
              max={120000}
              step={1000}
              value={form.reconnectGraceMs}
              onChange={(e) => setForm((p) => ({ ...p, reconnectGraceMs: e.target.value }))}
              className="h-9 text-xs tabular-nums"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
