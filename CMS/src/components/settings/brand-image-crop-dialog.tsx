'use client';

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type BrandAssetType = "logoDark" | "logoLight" | "favicon";

interface BrandImageCropDialogProps {
  open: boolean;
  assetType: BrandAssetType;
  sourceDataUrl: string | null;
  isUploading?: boolean;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

/**
 * Interactive Canvas Cropper + Auto-Trim for Sidebar Logos (540x150 wide) & Favicon (128x128 square).
 * Lets Tenant Admins zoom, drag/reposition, or auto-fit their logo so it fills the sidebar cleanly.
 */
export function BrandImageCropDialog({
  open,
  assetType,
  sourceDataUrl,
  isUploading = false,
  onClose,
  onConfirm,
}: BrandImageCropDialogProps) {
  const isSquare = assetType === "favicon";
  const outputWidth = isSquare ? 128 : 540;
  const outputHeight = isSquare ? 128 : 150;
  const previewWidth = isSquare ? 220 : 420;
  const previewHeight = isSquare ? 220 : 117;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  // Load image whenever sourceDataUrl changes
  useEffect(() => {
    if (!sourceDataUrl || !open) {
      setImgLoaded(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setImgLoaded(true);
    };
    img.src = sourceDataUrl;
  }, [sourceDataUrl, open]);

  // Draw preview canvas whenever zoom/pan/image changes
  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = imgRef.current;
    const baseScale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const drawW = img.width * baseScale * zoom;
    const drawH = img.height * baseScale * zoom;
    const x = (canvas.width - drawW) / 2 + offsetX;
    const y = (canvas.height - drawH) / 2 + offsetY;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, y, drawW, drawH);
  }, [imgLoaded, zoom, offsetX, offsetY, assetType]);

  // Auto-Trim transparent/white margins so the logo fills 95% of the sidebar frame
  const handleAutoFit = () => {
    const img = imgRef.current;
    if (!img) return;
    const tmp = document.createElement("canvas");
    tmp.width = img.width;
    tmp.height = img.height;
    const tctx = tmp.getContext("2d");
    if (!tctx) return;
    tctx.drawImage(img, 0, 0);
    const { data, width, height } = tctx.getImageData(0, 0, tmp.width, tmp.height);

    let minX = width, minY = height, maxX = 0, maxY = 0;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const idx = (py * width + px) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        const isTransparent = a < 15;
        const isPureWhite = r > 248 && g > 248 && b > 248 && a > 240;
        if (!isTransparent && !isPureWhite) {
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
        }
      }
    }

    if (maxX <= minX || maxY <= minY) {
      setZoom(1.15);
      setOffsetX(0);
      setOffsetY(0);
      return;
    }

    const contentW = maxX - minX + 1;
    const contentH = maxY - minY + 1;
    const scaleRatio = Math.min(img.width / contentW, img.height / contentH) * 0.94;
    setZoom(Math.min(3, Math.max(1, Number(scaleRatio.toFixed(2)))));
    setOffsetX(0);
    setOffsetY(0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setOffsetX(dragStartRef.current.ox + (e.clientX - dragStartRef.current.x));
    setOffsetY(dragStartRef.current.oy + (e.clientY - dragStartRef.current.y));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleConfirmCrop = () => {
    if (!imgRef.current) return;
    const out = document.createElement("canvas");
    out.width = outputWidth;
    out.height = outputHeight;
    const ctx = out.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    const scaleFactor = outputWidth / previewWidth;
    const baseScale = Math.min(outputWidth / img.width, outputHeight / img.height);
    const drawW = img.width * baseScale * zoom;
    const drawH = img.height * baseScale * zoom;
    const x = (outputWidth - drawW) / 2 + offsetX * scaleFactor;
    const y = (outputHeight - drawH) / 2 + offsetY * scaleFactor;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, y, drawW, drawH);

    onConfirm(out.toDataURL("image/png"));
  };

  const titleLabel =
    assetType === "logoDark"
      ? "Crop & Fit Logo Dark (Sidebar Banner)"
      : assetType === "logoLight"
      ? "Crop & Fit Logo Light (Dark Sidebar)"
      : "Crop & Fit Favicon (Square Icon)";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <i className="ph ph-crop text-primary" />
            {titleLabel}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Drag to reposition and use the zoom slider or Auto-Fit so your logo fills the sidebar header cleanly ({outputWidth}×{outputHeight}px).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex justify-center">
            <div
              className={`rounded-xl border-2 border-dashed border-primary/50 overflow-hidden shadow-inner ${
                assetType === "logoLight" ? "bg-slate-950" : "bg-white"
              }`}
              style={{ width: previewWidth, height: previewHeight }}
            >
              <canvas
                ref={canvasRef}
                width={previewWidth}
                height={previewHeight}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="block cursor-grab active:cursor-grabbing touch-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Zoom: {Math.round(zoom * 100)}%</span>
              <div className="flex items-center gap-1.5">
                <Button type="button" size="xs" variant="outline" onClick={handleAutoFit} className="gap-1">
                  <i className="ph ph-magic-wand" />
                  Auto-Fit Logo
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    setZoom(1);
                    setOffsetX(0);
                    setOffsetY(0);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isUploading || !imgLoaded}
            onClick={handleConfirmCrop}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
          >
            <i className={isUploading ? "ph ph-spinner-gap animate-spin" : "ph ph-check-circle"} />
            Crop & Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
