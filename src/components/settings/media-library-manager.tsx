import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Trash2,
  AlertTriangle,
  Folder,
  CheckCircle,
  FileCheck,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export interface MediaFileItem {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  checksumSha: string;
  folder: string;
  createdAt: string;
  usages: {
    id: string;
    entityType: string;
    entityId: string;
    fieldKey: string;
  }[];
}

export function MediaLibraryManager() {
  const qc = useQueryClient();
  const [selectedFileForDelete, setSelectedFileForDelete] = useState<MediaFileItem | null>(null);
  const [inUseConflict, setInUseConflict] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: mediaList = [],
    isLoading,
    refetch,
  } = useQuery<MediaFileItem[]>({
    queryKey: ["platform-media-library"],
    queryFn: async () => {
      try {
        const res = await api.get("/v1/media");
        return res || [];
      } catch {
        return [];
      }
    },
  });

  async function handleDeleteFile(file: MediaFileItem, force = false) {
    setIsDeleting(true);
    try {
      await api.delete(`/v1/media/${file.id}${force ? "?force=true" : ""}`);
      toast.success(`Deleted '${file.fileName}' from Media Library`);
      qc.invalidateQueries({ queryKey: ["platform-media-library"] });
      setSelectedFileForDelete(null);
      setInUseConflict(null);
    } catch (err: any) {
      if (err.status === 409 || err.code === "MEDIA_IN_USE" || err.response?.status === 409) {
        setInUseConflict({
          file,
          usages: file.usages || [],
          message: err.message || "This file is currently in use.",
        });
      } else {
        toast.error(err.message || "Failed to delete file");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Folder className="size-4 text-primary" /> Relational Media Library
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            All branding assets, logos, and platform media files with active relational usage tracking.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs h-8">
          <RefreshCw className="size-3.5" /> Refresh Assets
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-xs">Loading media assets...</span>
        </div>
      ) : mediaList.length === 0 ? (
        <div className="border border-dashed rounded-xl p-10 text-center text-muted-foreground">
          <Folder className="size-8 mx-auto mb-2 opacity-40 text-primary" />
          <p className="text-sm font-medium">No media uploaded yet</p>
          <p className="text-xs mt-1">Upload a logo in the Branding tab to register assets here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mediaList.map((file) => {
            const isInUse = file.usages && file.usages.length > 0;
            return (
              <Card
                key={file.id}
                className="overflow-hidden border bg-card/60 transition-all hover:border-primary/40 hover:shadow-xs group flex flex-col"
              >
                <div className="h-32 bg-slate-100 dark:bg-slate-900 border-b flex items-center justify-center p-3 relative">
                  <img
                    src={file.url}
                    alt={file.fileName}
                    className="max-h-full max-w-full object-contain"
                  />
                  {isInUse ? (
                    <Badge
                      variant="default"
                      className="absolute top-2 left-2 text-[10px] bg-emerald-600 gap-1 font-sans"
                    >
                      <CheckCircle className="size-2.5" /> In Use ({file.usages.length})
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 left-2 text-[10px] font-sans opacity-70"
                    >
                      Unused
                    </Badge>
                  )}
                </div>

                <CardContent className="p-3 text-xs flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <p className="font-semibold truncate text-foreground" title={file.fileName}>
                      {file.fileName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {(file.fileSize / 1024).toFixed(1)} KB • {file.mimeType.split("/")[1]?.toUpperCase()}
                    </p>
                    {isInUse && (
                      <div className="mt-1.5 p-1.5 rounded bg-muted/50 border text-[10px] space-y-0.5">
                        <span className="font-semibold text-primary block">Active Usages:</span>
                        {file.usages.map((u, i) => (
                          <div key={i} className="truncate text-muted-foreground">
                            • {u.fieldKey}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-primary hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink className="size-2.5" />
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Delete Media"
                      aria-label="Delete Media"
                      className="size-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (isInUse) {
                          setInUseConflict({
                            file,
                            usages: file.usages,
                            message: `File is actively used in ${file.usages.length} setting(s).`,
                          });
                        } else {
                          setSelectedFileForDelete(file);
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Unused Deletion */}
      <Dialog
        open={!!selectedFileForDelete}
        onOpenChange={(open) => !open && setSelectedFileForDelete(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-4 text-destructive" /> Delete Media Asset
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {selectedFileForDelete?.fileName}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFileForDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={() => selectedFileForDelete && handleDeleteFile(selectedFileForDelete, false)}
            >
              {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : "Delete Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 409 Conflict Dialog: In-Use Asset Warning */}
      <Dialog
        open={!!inUseConflict}
        onOpenChange={(open) => !open && setInUseConflict(null)}
      >
        <DialogContent className="max-w-md border-amber-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <ShieldAlert className="size-5" /> Media Asset is in Active Use!
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2 text-left">
              <p>
                <span className="font-semibold text-foreground">
                  {inUseConflict?.file?.fileName}
                </span>{" "}
                cannot be deleted safely because it is currently linked to the following live
                settings:
              </p>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-1">
                {inUseConflict?.usages?.map((u: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 font-mono text-[11px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-3 shrink-0" />
                    <span>{u.entityType}: {u.fieldKey}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                To preserve visual stability, you must first replace this logo in the Branding
                settings, or proceed with a forced deletion.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInUseConflict(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={() => inUseConflict?.file && handleDeleteFile(inUseConflict.file, true)}
              className="gap-1 bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : "Force Delete Anyway"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
