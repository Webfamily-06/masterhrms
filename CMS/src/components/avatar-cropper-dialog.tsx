import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw, Check, X, Crop } from "lucide-react";

interface AvatarCropperDialogProps {
  isOpen: boolean;
  imageSrc: string | null;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
  title?: string;
}

export function AvatarCropperDialog({
  isOpen,
  imageSrc,
  onCropComplete,
  onCancel,
  title = "Crop Profile Picture",
}: AvatarCropperDialogProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset parameters when image changes or modal opens
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageSrc;
      img.onload = () => {
        imgRef.current = img;
        drawCanvas();
      };
    }
  }, [isOpen, imageSrc]);

  // Redraw canvas on transform change
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Draw background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    // Move to center
    ctx.translate(size / 2 + position.x, size / 2 + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate aspect ratio fit
    const aspect = img.width / img.height;
    let drawWidth = size;
    let drawHeight = size;

    if (aspect > 1) {
      drawWidth = size * aspect;
    } else {
      drawHeight = size / aspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // Draw circular mask overlay
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2, true);
    ctx.fill();

    // Draw circle border guide
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, [zoom, rotation, position]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Generate Cropped Image
  const handleSaveCrop = () => {
    const img = imgRef.current;
    if (!img) return;

    // Create high-res export canvas (400x400)
    const exportSize = 400;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Scale factor from preview (300) to export (400)
    const scaleFactor = exportSize / 300;

    // Clip to circle
    ctx.beginPath();
    ctx.arc(exportSize / 2, exportSize / 2, exportSize / 2 - 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.save();
    ctx.translate(exportSize / 2 + position.x * scaleFactor, exportSize / 2 + position.y * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom * scaleFactor, zoom * scaleFactor);

    const aspect = img.width / img.height;
    let drawWidth = 300;
    let drawHeight = 300;
    if (aspect > 1) {
      drawWidth = 300 * aspect;
    } else {
      drawHeight = 300 / aspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    const croppedDataUrl = exportCanvas.toDataURL("image/jpeg", 0.92);
    onCropComplete(croppedDataUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black text-foreground">
            <Crop className="size-5 text-emerald-600" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Drag to reposition and use the zoom slider to fit your photo in the circle.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-2">
          {/* Interactive Crop Canvas Viewport */}
          <div
            className="relative cursor-move rounded-2xl overflow-hidden border-2 border-emerald-500/30 shadow-md select-none touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <canvas ref={canvasRef} className="block w-[280px] h-[280px] sm:w-[300px] sm:h-[300px]" />
          </div>

          {/* Zoom & Rotation Controls */}
          <div className="w-full space-y-3 px-2">
            <div className="flex items-center gap-3">
              <ZoomOut className="size-4 text-muted-foreground shrink-0" />
              <Slider
                value={[zoom]}
                min={0.5}
                max={3.0}
                step={0.05}
                onValueChange={(val) => setZoom(val[0])}
                className="flex-1"
              />
              <ZoomIn className="size-4 text-muted-foreground shrink-0" />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Zoom: {Math.round(zoom * 100)}%</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="h-7 text-xs gap-1 font-semibold text-emerald-600 hover:bg-emerald-50"
              >
                <RotateCw className="size-3.5" /> Rotate 90°
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t flex justify-between gap-2">
          <Button size="sm" variant="outline" onClick={onCancel} className="text-xs font-semibold">
            <X className="size-3.5 mr-1" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSaveCrop}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          >
            <Check className="size-3.5 mr-1" /> Apply Crop & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
