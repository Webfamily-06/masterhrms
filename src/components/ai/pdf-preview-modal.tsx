import React, { useState, useEffect, useRef } from "react";
import { FileText, Download, ExternalLink, AlertCircle, RefreshCw, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api";

export interface PdfPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId?: string;
  documentTitle?: string;
  directPdfBlob?: Blob;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  open,
  onOpenChange,
  documentId,
  documentTitle = "Document",
  directPdfBlob,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const activeUrlRef = useRef<string | null>(null);

  // Clean up object URL on close or unmount
  const cleanupUrl = () => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
    setObjectUrl(null);
    setCurrentBlob(null);
  };

  const loadPdf = async () => {
    cleanupUrl();
    setError(null);

    // 1. If direct blob provided (e.g. from local studio generator)
    if (directPdfBlob) {
      if (!directPdfBlob.size || directPdfBlob.size < 10) {
        setError("Invalid or empty PDF content generated.");
        return;
      }
      try {
        const url = URL.createObjectURL(directPdfBlob);
        activeUrlRef.current = url;
        setObjectUrl(url);
        setCurrentBlob(directPdfBlob);
      } catch (err: any) {
        setError(err.message || "Failed to create preview from blob.");
      }
      return;
    }

    // 2. Fetch authenticated PDF from backend API
    if (!documentId) {
      setError("No document specified for preview.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/addons/ai-document/documents/${documentId}/export?format=pdf&disposition=inline`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error("You are not authorized to view this document.");
        }
        if (res.status === 404) {
          throw new Error("Document not found or has been removed.");
        }
        throw new Error(`Failed to load document (HTTP ${res.status}).`);
      }

      const contentType = res.headers.get("content-type") || "";
      const blob = await res.blob();

      // Check header or byte size for valid PDF content
      if (blob.size === 0) {
        throw new Error("Received empty document file.");
      }

      // Read first 5 bytes to verify %PDF- magic signature
      const buffer = await blob.slice(0, 5).arrayBuffer();
      const headerStr = String.fromCharCode(...new Uint8Array(buffer));
      if (headerStr !== "%PDF-" && !contentType.includes("pdf")) {
        throw new Error("The returned document format is not a valid PDF.");
      }

      const url = URL.createObjectURL(blob);
      activeUrlRef.current = url;
      setObjectUrl(url);
      setCurrentBlob(blob);
    } catch (err: any) {
      setError(err.message || "Failed to render PDF preview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPdf();
    } else {
      cleanupUrl();
    }
    return () => {
      cleanupUrl();
    };
  }, [open, documentId, directPdfBlob]);

  const handleDownload = () => {
    if (!currentBlob && !objectUrl) return;
    try {
      const blobToDownload = currentBlob || directPdfBlob;
      if (!blobToDownload) return;

      const downloadUrl = URL.createObjectURL(blobToDownload);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const safeFilename = `${documentTitle.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase()}.pdf`;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast.success("PDF downloaded successfully");
    } catch {
      toast.error("Failed to download PDF");
    }
  };

  const handleOpenNewTab = () => {
    if (objectUrl) {
      window.open(objectUrl, "_blank");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) cleanupUrl();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent
        className="max-w-5xl h-[88vh] flex flex-col p-0 gap-0 overflow-hidden"
        aria-label="Inline PDF Document Preview"
      >
        {/* Header */}
        <DialogHeader className="p-4 border-b flex-shrink-0 bg-muted/20 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-2 truncate pr-4">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <DialogTitle className="text-base truncate font-semibold">
              {documentTitle}
            </DialogTitle>
            <Badge variant="outline" className="text-[11px] font-mono shrink-0">
              PDF Preview
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            {objectUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenNewTab}
                className="h-8 text-xs gap-1.5"
                title="Open in new browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Tab</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={!currentBlob && !directPdfBlob}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 w-full h-full relative bg-muted/10 flex items-center justify-center p-0 overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center space-y-3 p-8 text-center" role="status">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">
                Generating and loading secure PDF preview...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="max-w-md p-6 bg-destructive/10 border border-destructive/20 rounded-xl space-y-3 text-center mx-4">
              <div className="flex items-center justify-center text-destructive">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-sm text-destructive">Unable to Preview PDF</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
              <Button size="sm" variant="outline" onClick={loadPdf} className="gap-1.5 text-xs">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </Button>
            </div>
          )}

          {objectUrl && !loading && !error && (
            <iframe
              src={`${objectUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0 bg-white dark:bg-zinc-900"
              title={`PDF Preview: ${documentTitle}`}
              data-testid="inline-pdf-iframe"
            />
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 border-t bg-muted/20 flex-shrink-0 flex sm:justify-between items-center text-xs text-muted-foreground">
          <span className="text-[11px]">
            Rendered via browser-native PDF viewer • Secured by MasterHRMS
          </span>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-7 text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
