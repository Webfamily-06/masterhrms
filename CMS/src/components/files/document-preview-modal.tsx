"use client";

import React, { useState, useEffect, useRef } from "react";
import { API_URL, getAuthHeaders } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MessageSquare,
  ShieldAlert,
  FileText,
  Table,
  CheckCircle2,
  Trash2,
  Send,
  Eye,
  Download,
  Lock,
} from "lucide-react";

interface AnnotationReply {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

interface Annotation {
  id: string;
  fileVersion: number;
  pageNumber: number;
  coordinates: { x: number; y: number };
  content: string;
  color: string;
  status: "ACTIVE" | "RESOLVED" | "DELETED";
  createdBy: string;
  createdAt: string;
  replies: AnnotationReply[];
}

interface DocumentPreviewModalProps {
  fileId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (fileId: string) => void;
}

export function DocumentPreviewModal({
  fileId,
  isOpen,
  onClose,
  onDownload,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Viewport states
  const [zoom, setZoom] = useState(100);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [showAnnotations, setShowAnnotations] = useState(true);

  // Annotations state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [newAnnotationCoord, setNewAnnotationCoord] = useState<{ x: number; y: number } | null>(null);
  const [newAnnotationText, setNewAnnotationText] = useState("");
  const [newAnnotationColor, setNewAnnotationColor] = useState("#FFEB3B");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Load preview data and annotations when modal opens
  useEffect(() => {
    if (!isOpen || !fileId) {
      setPreviewData(null);
      setAnnotations([]);
      setError(null);
      setZoom(100);
      setNewAnnotationCoord(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    // 1. Fetch rich preview data
    fetch(`${API_URL}/v1/files/nodes/${fileId}/rich-preview`, {
      headers: getAuthHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load preview`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) setPreviewData(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load document preview");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // 2. Fetch annotations
    fetch(`${API_URL}/v1/files/nodes/${fileId}/annotations`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.annotations) {
          setAnnotations(data.annotations);
        }
      })
      .catch((err) => console.warn("Failed to load annotations:", err));

    return () => {
      isMounted = false;
    };
  }, [isOpen, fileId]);

  // Click on viewer to drop a new annotation pin
  const handleViewerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!viewerContainerRef.current) return;
    const rect = viewerContainerRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setNewAnnotationCoord({ x, y });
  };

  // Submit new annotation
  const handleCreateAnnotation = async () => {
    if (!fileId || !newAnnotationCoord || !newAnnotationText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/v1/files/nodes/${fileId}/annotations`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          pageNumber: 1,
          coordinates: newAnnotationCoord,
          content: newAnnotationText.trim(),
          color: newAnnotationColor,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnnotations((prev) => [...prev, data.annotation]);
        setNewAnnotationCoord(null);
        setNewAnnotationText("");
      }
    } catch (err) {
      console.error("Error creating annotation:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resolve or toggle status of annotation
  const handleToggleResolve = async (annId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "RESOLVED" ? "ACTIVE" : "RESOLVED";
    try {
      const res = await fetch(`${API_URL}/v1/files/annotations/${annId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setAnnotations((prev) =>
          prev.map((a) => (a.id === annId ? { ...a, status: nextStatus as any } : a))
        );
      }
    } catch (err) {
      console.error("Error updating annotation:", err);
    }
  };

  // Delete annotation
  const handleDeleteAnnotation = async (annId: string) => {
    try {
      const res = await fetch(`${API_URL}/v1/files/annotations/${annId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setAnnotations((prev) => prev.filter((a) => a.id !== annId));
      }
    } catch (err) {
      console.error("Error deleting annotation:", err);
    }
  };

  // Add threaded reply
  const handleAddReply = async (annId: string) => {
    const text = replyText[annId]?.trim();
    if (!text) return;
    try {
      const res = await fetch(`${API_URL}/v1/files/annotations/${annId}/replies`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnnotations((prev) =>
          prev.map((a) =>
            a.id === annId ? { ...a, replies: [...(a.replies || []), data.reply] } : a
          )
        );
        setReplyText((prev) => ({ ...prev, [annId]: "" }));
      }
    } catch (err) {
      console.error("Error adding reply:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border shadow-2xl">
        {/* Top Control Header */}
        <DialogHeader className="px-5 py-3 border-b flex flex-row items-center justify-between space-y-0 bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-base font-semibold truncate max-w-[320px] md:max-w-md">
              {previewData?.fileName || "Document Preview"}
            </DialogTitle>
            {previewData?.extension && (
              <Badge variant="outline" className="uppercase text-[11px] font-mono">
                {previewData.extension}
              </Badge>
            )}
            {previewData?.quarantined && (
              <Badge variant="destructive" className="flex items-center gap-1 text-[11px]">
                <ShieldAlert className="w-3.5 h-3.5" /> Quarantined
              </Badge>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5">
            {/* Zoom Controls */}
            <div className="flex items-center bg-background border rounded-md mr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((z) => Math.max(50, z - 15))}
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-mono px-2 select-none">{zoom}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((z) => Math.min(200, z + 15))}
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 border-l"
                onClick={() => setZoom(100)}
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Toggle Annotations Sidebar */}
            <Button
              variant={showAnnotations ? "secondary" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowAnnotations(!showAnnotations)}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Annotations ({annotations.length})
            </Button>

            {/* Download */}
            {onDownload && fileId && !previewData?.quarantined && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => onDownload(fileId)}
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
            )}

            <Button variant="ghost" size="icon" className="h-8 w-8 ml-1" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Main Dual-Pane Body */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Document Viewport Area */}
          <div
            ref={viewerContainerRef}
            onClick={handleViewerClick}
            className="flex-1 overflow-auto bg-neutral-900/10 dark:bg-neutral-950/40 p-6 flex flex-col items-center justify-start relative select-none cursor-crosshair"
          >
            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center m-auto text-muted-foreground gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium">Rendering secure preview...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex flex-col items-center justify-center m-auto max-w-md p-6 bg-destructive/10 border border-destructive/20 rounded-lg text-center gap-2">
                <ShieldAlert className="w-10 h-10 text-destructive mb-1" />
                <h4 className="font-semibold text-destructive">Preview Unavailable</h4>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            )}

            {/* Quarantined State */}
            {previewData?.quarantined && (
              <div className="flex flex-col items-center justify-center m-auto max-w-md p-6 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center gap-2">
                <Lock className="w-10 h-10 text-amber-500 mb-1" />
                <h4 className="font-semibold text-amber-600 dark:text-amber-400">File Quarantined</h4>
                <p className="text-sm text-muted-foreground">{previewData.content}</p>
              </div>
            )}

            {/* Document Content Renders */}
            {!loading && !error && !previewData?.quarantined && previewData && (
              <div
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                className="transition-transform duration-100 ease-out relative shadow-xl bg-background border rounded-md min-w-[700px] max-w-4xl w-full min-h-[600px] p-8 text-foreground"
              >
                {/* Dynamic Confidential Watermark Overlay */}
                {previewData?.watermark?.enabled && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none select-none z-30 overflow-hidden opacity-15 flex flex-wrap content-around justify-around p-4"
                    style={{
                      transform: `rotate(${previewData.watermark.angle || -30}deg)`,
                      transformOrigin: "center center",
                    }}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <span
                        key={i}
                        className="text-sm font-black tracking-widest text-foreground uppercase whitespace-nowrap m-8"
                      >
                        {previewData.watermark.text}
                      </span>
                    ))}
                  </div>
                )}

                {/* 1. DOCX Render (Sanitized HTML) */}
                {previewData.previewType === "docx_html" && (
                  <div
                    className="prose dark:prose-invert max-w-none text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewData.content }}
                  />
                )}

                {/* 2. XLSX Tabular Render (Interactive Spreadsheet Grid) */}
                {previewData.previewType === "xlsx_table" && (
                  <div className="flex flex-col gap-4">
                    {/* Sheet Tabs */}
                    {previewData.sheets && previewData.sheets.length > 0 && (
                      <div className="flex items-center gap-1 border-b pb-2 overflow-x-auto">
                        {previewData.sheets.map((sheet: any, idx: number) => (
                          <Button
                            key={sheet.name || idx}
                            variant={activeSheetIndex === idx ? "secondary" : "ghost"}
                            size="sm"
                            className="text-xs h-7 gap-1 font-mono"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSheetIndex(idx);
                            }}
                          >
                            <Table className="w-3 h-3" />
                            {sheet.name} ({sheet.rowCount} rows)
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Active Sheet Table */}
                    {previewData.sheets?.[activeSheetIndex] && (
                      <div className="border rounded overflow-x-auto max-h-[550px]">
                        <table className="w-full text-xs text-left border-collapse">
                          <tbody>
                            {previewData.sheets[activeSheetIndex].rows.map(
                              (row: any[], rowIdx: number) => (
                                <tr
                                  key={rowIdx}
                                  className={
                                    rowIdx === 0
                                      ? "bg-muted font-semibold border-b"
                                      : "border-b hover:bg-muted/50"
                                  }
                                >
                                  <td className="p-2 border-r bg-muted/30 font-mono text-muted-foreground w-10 text-center select-none">
                                    {rowIdx + 1}
                                  </td>
                                  {row.map((cell: any, cellIdx: number) => (
                                    <td key={cellIdx} className="p-2 border-r truncate max-w-[200px]">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. CSV Tabular Render */}
                {previewData.previewType === "csv_table" && previewData.sheets?.[0] && (
                  <div className="border rounded overflow-x-auto max-h-[550px]">
                    <table className="w-full text-xs text-left border-collapse">
                      <tbody>
                        {previewData.sheets[0].rows.map((row: any[], rowIdx: number) => (
                          <tr
                            key={rowIdx}
                            className={
                              rowIdx === 0 ? "bg-muted font-semibold border-b" : "border-b hover:bg-muted/50"
                            }
                          >
                            <td className="p-2 border-r bg-muted/30 font-mono text-muted-foreground w-10 text-center select-none">
                              {rowIdx + 1}
                            </td>
                            {row.map((cell: any, cellIdx: number) => (
                              <td key={cellIdx} className="p-2 border-r truncate max-w-[200px]">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 4. Text / Code Render */}
                {previewData.previewType === "text" && (
                  <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto p-4 bg-muted/30 rounded border">
                    {previewData.content}
                  </pre>
                )}

                {/* 5. Image Render */}
                {previewData.previewType === "image" && (
                  <div className="flex items-center justify-center p-4">
                    {previewData.extension === "svg" ? (
                      <div
                        className="max-w-full max-h-[500px]"
                        dangerouslySetInnerHTML={{ __html: previewData.content }}
                      />
                    ) : (
                      <img
                        src={previewData.content}
                        alt={previewData.fileName}
                        className="max-w-full max-h-[500px] object-contain rounded"
                      />
                    )}
                  </div>
                )}

                {/* 6. PDF Stream Render */}
                {previewData.previewType === "pdf" && (
                  <div className="w-full h-[650px] flex flex-col items-center justify-center gap-3">
                    <iframe
                      src={`${previewData.content}#toolbar=0`}
                      className="w-full h-full rounded border"
                      title={previewData.fileName}
                    />
                  </div>
                )}

                {/* 7. Unsupported Render */}
                {previewData.previewType === "unsupported" && (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-3">
                    <FileText className="w-12 h-12 stroke-[1.5]" />
                    <p className="text-sm">{previewData.content}</p>
                  </div>
                )}

                {/* Render Annotation Pins on top of document */}
                {annotations.map((ann) => (
                  <div
                    key={ann.id}
                    style={{ left: `${ann.coordinates.x}%`, top: `${ann.coordinates.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-40 cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAnnotations(true);
                    }}
                    title={`${ann.content} (by ${ann.createdBy})`}
                  >
                    <div
                      style={{ backgroundColor: ann.color || "#FFEB3B" }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-neutral-900 font-bold text-xs shadow-md border-2 ${
                        ann.status === "RESOLVED" ? "border-green-600 opacity-60" : "border-neutral-800"
                      }`}
                    >
                      !
                    </div>
                  </div>
                ))}

                {/* Render Active Pin creation marker */}
                {newAnnotationCoord && (
                  <div
                    style={{ left: `${newAnnotationCoord.x}%`, top: `${newAnnotationCoord.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce"
                  >
                    <div
                      style={{ backgroundColor: newAnnotationColor }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-900 font-bold text-xs shadow-lg border-2 border-primary"
                    >
                      +
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right-Hand Annotation Sidebar */}
          {showAnnotations && (
            <div className="w-80 md:w-96 border-l bg-background flex flex-col shrink-0 z-30 shadow-lg">
              <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Annotations & Collaboration
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {annotations.length} items
                </Badge>
              </div>

              {/* Creator Box if user dropped a pin */}
              {newAnnotationCoord && (
                <div className="p-3 bg-muted/40 border-b flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>Add Pin Annotation ({newAnnotationCoord.x}%, {newAnnotationCoord.y}%)</span>
                    <button
                      onClick={() => setNewAnnotationCoord(null)}
                      className="text-xs hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                  <Input
                    placeholder="Enter annotation comment..."
                    value={newAnnotationText}
                    onChange={(e) => setNewAnnotationText(e.target.value)}
                    className="text-xs h-8"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {["#FFEB3B", "#4CAF50", "#2196F3", "#F44336"].map((c) => (
                        <button
                          key={c}
                          style={{ backgroundColor: c }}
                          className={`w-4 h-4 rounded-full border ${
                            newAnnotationColor === c ? "ring-2 ring-primary" : ""
                          }`}
                          onClick={() => setNewAnnotationColor(c)}
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleCreateAnnotation}
                      disabled={isSubmitting || !newAnnotationText.trim()}
                    >
                      Post Pin
                    </Button>
                  </div>
                </div>
              )}

              {/* Annotations List */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                {annotations.length === 0 && !newAnnotationCoord && (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    Click anywhere on the document to add a collaboration pin.
                  </div>
                )}

                {annotations.map((ann) => (
                  <div
                    key={ann.id}
                    className={`border rounded-lg p-3 flex flex-col gap-2 text-xs transition-colors ${
                      ann.status === "RESOLVED" ? "bg-muted/30 border-muted" : "bg-card shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          style={{ backgroundColor: ann.color || "#FFEB3B" }}
                          className="w-2.5 h-2.5 rounded-full inline-block"
                        />
                        <span className="font-medium text-foreground truncate max-w-[140px]">
                          {ann.createdBy}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleResolve(ann.id, ann.status)}
                          className={`p-1 rounded hover:bg-muted ${
                            ann.status === "RESOLVED" ? "text-green-600" : "text-muted-foreground"
                          }`}
                          title={ann.status === "RESOLVED" ? "Reopen" : "Mark Resolved"}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnnotation(ann.id)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className={`text-xs ${ann.status === "RESOLVED" ? "line-through text-muted-foreground" : ""}`}>
                      {ann.content}
                    </p>

                    {/* Threaded Replies */}
                    {ann.replies && ann.replies.length > 0 && (
                      <div className="pl-3 border-l-2 border-primary/20 flex flex-col gap-2 mt-1">
                        {ann.replies.map((reply) => (
                          <div key={reply.id} className="text-[11px] bg-muted/40 p-2 rounded">
                            <span className="font-semibold block text-muted-foreground truncate">
                              {reply.userId}
                            </span>
                            <span className="text-foreground">{reply.content}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Input */}
                    <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t">
                      <Input
                        placeholder="Reply..."
                        value={replyText[ann.id] || ""}
                        onChange={(e) =>
                          setReplyText((prev) => ({ ...prev, [ann.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddReply(ann.id);
                        }}
                        className="text-[11px] h-7"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleAddReply(ann.id)}
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
