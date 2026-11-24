"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Download,
  MoreVertical,
  Trash2,
  FileText,
  File as FileIcon,
  Play,
} from "lucide-react";

export interface ChatAttachmentItem {
  id?: string;
  mediaId?: string;
  name: string;
  url?: string;
  signedPreviewUrl?: string;
  signedDownloadUrl?: string;
  mimeType?: string;
  size?: number;
}

interface WhatsAppAttachmentsGridProps {
  messageId: string;
  attachments: ChatAttachmentItem[];
  deletedIndexesForMe?: number[];
  isSent: boolean;
  canDeleteForEveryone: boolean;
  resolveUrl: (raw?: string | null) => string;
  formatFileSize: (bytes: number) => string;
  onOpenViewer: (attachments: ChatAttachmentItem[], index: number) => void;
  onAttachmentsChanged: () => void;
}

export function WhatsAppAttachmentsGrid({
  messageId,
  attachments,
  deletedIndexesForMe = [],
  canDeleteForEveryone,
  resolveUrl,
  formatFileSize,
  onOpenViewer,
  onAttachmentsChanged,
}: WhatsAppAttachmentsGridProps) {
  const [localHidden, setLocalHidden] = useState<number[]>([]);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  const hiddenSet = new Set([...deletedIndexesForMe, ...localHidden]);
  const visibleEntries = attachments
    .map((att, origIdx) => ({ att, origIdx }))
    .filter(({ origIdx }) => !hiddenSet.has(origIdx));

  if (visibleEntries.length === 0) return null;

  async function handleDeleteAttachment(origIdx: number, scope: "me" | "everyone") {
    setDeletingIdx(origIdx);
    try {
      await api.delete(`/chat/messages/${messageId}/attachments/${origIdx}?scope=${scope}`);
      if (scope === "me") {
        setLocalHidden((prev) => [...prev, origIdx]);
        toast.success("File deleted for you.");
      } else {
        toast.success("File deleted for everyone.");
      }
      onAttachmentsChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete file.");
    } finally {
      setDeletingIdx(null);
    }
  }

  function getAttachmentMeta(att: ChatAttachmentItem) {
    const ext = (att.name || "").split(".").pop()?.toLowerCase() || "";
    const isImage =
      Boolean(att.mimeType?.startsWith("image/")) ||
      ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "heic", "heif"].includes(ext);
    const isVideo =
      Boolean(att.mimeType?.startsWith("video/")) ||
      ["mp4", "webm", "mov", "m4v", "ogg"].includes(ext);
    const isPdf = Boolean(att.mimeType?.includes("pdf")) || ext === "pdf";

    const fallbackMediaId = att.mediaId || att.id;
    const fallbackInlineUrl = fallbackMediaId
      ? resolveUrl(`/api/chat/attachments/${encodeURIComponent(fallbackMediaId)}/download?inline=1`)
      : "";
    const previewSrc = resolveUrl(att.signedPreviewUrl || att.url) || fallbackInlineUrl;
    const downloadHref =
      resolveUrl(att.signedDownloadUrl || att.signedPreviewUrl || att.url) || fallbackInlineUrl;

    return { isImage, isVideo, isPdf, previewSrc, downloadHref, fallbackInlineUrl };
  }

  function renderTileMenu(att: ChatAttachmentItem, origIdx: number, downloadHref: string) {
    return (
      <div
        className="absolute top-1.5 right-1.5 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={deletingIdx === origIdx}
              className="h-6 w-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-sm transition-colors"
              title="File options"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onOpenViewer(attachments, origIdx)}>
              <Eye className="h-3.5 w-3.5 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const link = document.createElement("a");
                link.href = downloadHref;
                link.download = att.name;
                link.click();
              }}
            >
              <Download className="h-3.5 w-3.5 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteAttachment(origIdx, "me")}
              className="text-amber-600 focus:text-amber-600"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete for me
            </DropdownMenuItem>
            {canDeleteForEveryone && (
              <DropdownMenuItem
                onClick={() => handleDeleteAttachment(origIdx, "everyone")}
                className="text-rose-600 focus:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete for everyone
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Single attachment layout
  if (visibleEntries.length === 1) {
    const { att, origIdx } = visibleEntries[0];
    const { isImage, isVideo, isPdf, previewSrc, downloadHref, fallbackInlineUrl } =
      getAttachmentMeta(att);

    if (isImage) {
      return (
        <div
          data-testid="chat-attachment-image-card"
          onClick={() => onOpenViewer(attachments, origIdx)}
          className="mt-2 cursor-pointer group/img relative overflow-hidden rounded-xl border border-border/60 max-w-[260px] sm:max-w-xs bg-muted/20"
        >
          {renderTileMenu(att, origIdx, downloadHref)}
          <img
            src={previewSrc}
            alt={att.name}
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              if (fallbackInlineUrl && !img.dataset.retriedFallback && img.src !== fallbackInlineUrl) {
                img.dataset.retriedFallback = "1";
                img.src = fallbackInlineUrl;
              }
            }}
            className="max-h-56 w-full object-cover group-hover/img:scale-105 transition-transform"
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div
          data-testid="chat-attachment-video-card"
          className="mt-2 relative overflow-hidden rounded-xl border border-border/60 max-w-[260px] sm:max-w-xs bg-black"
        >
          {renderTileMenu(att, origIdx, downloadHref)}
          <video
            src={previewSrc}
            controls
            playsInline
            preload="metadata"
            className="max-h-60 w-full object-contain bg-black"
          />
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-card/95 text-foreground text-[11px] border-t border-border/50">
            <span className="truncate font-medium">{att.name}</span>
            <button
              type="button"
              onClick={() => onOpenViewer(attachments, origIdx)}
              className="text-primary hover:underline shrink-0 font-semibold"
            >
              Expand
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => onOpenViewer(attachments, origIdx)}
        className="mt-2 relative flex items-center gap-2.5 p-2.5 pr-9 rounded-xl bg-card text-foreground border border-border/70 max-w-[260px] sm:max-w-xs cursor-pointer hover:bg-muted/60 transition-colors"
      >
        {renderTileMenu(att, origIdx, downloadHref)}
        {isPdf ? (
          <FileText className="size-5 text-destructive shrink-0" />
        ) : (
          <FileIcon className="size-5 text-primary shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-xs truncate">{att.name}</p>
          <p className="text-[10px] text-muted-foreground">{formatFileSize(att.size ?? 0)}</p>
        </div>
      </div>
    );
  }

  // WhatsApp-style 2x2 Grid for Multiple Files (2, 3, 4, or 4+ with +N overlay)
  const displayEntries = visibleEntries.slice(0, 4);
  const extraCount = Math.max(0, visibleEntries.length - 4);

  return (
    <div
      data-testid="chat-whatsapp-media-grid"
      className="mt-2 grid grid-cols-2 gap-1.5 w-[260px] sm:w-[320px] rounded-xl overflow-hidden"
    >
      {displayEntries.map(({ att, origIdx }, gridIdx) => {
        const { isImage, isVideo, isPdf, previewSrc, downloadHref, fallbackInlineUrl } =
          getAttachmentMeta(att);
        const isLastWithOverflow = gridIdx === 3 && extraCount > 0;
        const spanFull = visibleEntries.length === 3 && gridIdx === 0;

        return (
          <div
            key={origIdx}
            onClick={() => onOpenViewer(attachments, origIdx)}
            className={`relative group/tile cursor-pointer overflow-hidden rounded-lg border border-border/60 bg-muted/30 ${
              spanFull ? "col-span-2 aspect-[2/1]" : "aspect-square"
            }`}
          >
            {renderTileMenu(att, origIdx, downloadHref)}

            {isImage ? (
              <img
                src={previewSrc}
                alt={att.name}
                loading="lazy"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (
                    fallbackInlineUrl &&
                    !img.dataset.retriedFallback &&
                    img.src !== fallbackInlineUrl
                  ) {
                    img.dataset.retriedFallback = "1";
                    img.src = fallbackInlineUrl;
                  }
                }}
                className="h-full w-full object-cover group-hover/tile:scale-105 transition-transform"
              />
            ) : isVideo ? (
              <div className="h-full w-full bg-slate-900 relative flex items-center justify-center">
                <video
                  src={previewSrc}
                  muted
                  preload="metadata"
                  className="h-full w-full object-cover opacity-75"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-9 w-9 rounded-full bg-black/65 text-white flex items-center justify-center">
                    <Play className="h-4 w-4 ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-1 left-1.5 right-1.5 text-[10px] text-white truncate drop-shadow">
                  {att.name}
                </div>
              </div>
            ) : (
              <div className="h-full w-full p-3 flex flex-col items-center justify-center text-center bg-card hover:bg-muted/50 transition-colors">
                {isPdf ? (
                  <FileText className="h-8 w-8 text-rose-500 mb-1.5" />
                ) : (
                  <FileIcon className="h-8 w-8 text-blue-500 mb-1.5" />
                )}
                <p className="text-[11px] font-semibold text-foreground line-clamp-2 break-all">
                  {att.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatFileSize(att.size ?? 0)}
                </p>
              </div>
            )}

            {isLastWithOverflow && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-2xl font-bold z-10">
                +{extraCount}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
