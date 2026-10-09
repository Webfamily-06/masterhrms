import { useState, useCallback, useRef } from "react";
import type {
  FileValidationOptions,
  FileProcessingResult,
  ImageCompressionOptions,
} from "./types";

/**
 * Read File using FileReader API
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error("Failed to read file as Data URL"));
    reader.readAsDataURL(file);
  });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error("Failed to read file as text"));
    reader.readAsText(file);
  });
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error("Failed to read file as ArrayBuffer"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validate file according to size, mime type, and extension
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  const { maxSizeBytes = 10 * 1024 * 1024, allowedTypes, allowedExtensions } = options;

  if (file.size > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds the maximum limit of ${maxMb} MB. (Actual: ${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
    };
  }

  if (allowedTypes && allowedTypes.length > 0) {
    const matched = allowedTypes.some((t) => {
      if (t.endsWith("/*")) {
        const prefix = t.slice(0, -1);
        return file.type.startsWith(prefix);
      }
      return file.type === t;
    });
    if (!matched) {
      return {
        valid: false,
        error: `File type "${file.type || "unknown"}" is not permitted. Allowed: ${allowedTypes.join(", ")}`,
      };
    }
  }

  if (allowedExtensions && allowedExtensions.length > 0) {
    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = allowedExtensions.some((ext) => fileNameLower.endsWith(ext.toLowerCase()));
    if (!hasValidExt) {
      return {
        valid: false,
        error: `File extension is not allowed. Permitted: ${allowedExtensions.join(", ")}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Client-Side Image Compression using HTML Canvas / OffscreenCanvas
 * Shrinks multi-megabyte camera photos to ~100-300KB before network upload
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
    format = "image/jpeg",
  } = options;

  const dataUrl = await readFileAsDataUrl(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;

      if (w > maxWidth || h > maxHeight) {
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const ext = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg";
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, `.${ext}`), {
            type: format,
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        format,
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUrl;
  });
}

/**
 * Export Javascript Objects/Array directly to CSV and trigger file download
 */
export function exportToCsv(
  data: Record<string, any>[],
  filename = `export_${Date.now()}.csv`
): void {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const val = row[header] ?? "";
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(",")
  );

  const csvContent = [headers.map((h) => `"${h}"`).join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse CSV text into array of key-value objects
 */
export function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim());
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.replace(/^["']|["']$/g, "").trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || "";
    });
    results.push(obj);
  }

  return results;
}

/**
 * Reactive React Hook for Drag-and-Drop file handling & validation
 */
export function useFileDropzone(options: {
  validation?: FileValidationOptions;
  autoCompressImages?: boolean;
  multiple?: boolean;
  onFilesSelected?: (files: FileProcessingResult[]) => void;
} = {}) {
  const { validation, autoCompressImages = false, multiple = true, onFilesSelected } = options;

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [files, setFiles] = useState<FileProcessingResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef<number>(0);

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setError(null);
      setIsProcessing(true);
      const fileArr = Array.from(fileList);
      const results: FileProcessingResult[] = [];

      try {
        for (let file of fileArr) {
          if (validation) {
            const valResult = validateFile(file, validation);
            if (!valResult.valid) {
              setError(valResult.error || "File validation failed");
              setIsProcessing(false);
              return;
            }
          }

          if (autoCompressImages && file.type.startsWith("image/")) {
            try {
              file = await compressImage(file);
            } catch {
              // keep original if compression fails
            }
          }

          const dataUrl = file.type.startsWith("image/")
            ? await readFileAsDataUrl(file).catch(() => undefined)
            : undefined;

          results.push({
            file,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            dataUrl,
          });
        }

        setFiles((prev) => (multiple ? [...prev, ...results] : results));
        onFilesSelected?.(results);
      } catch (err: any) {
        setError(err.message || "Failed to process files");
      } finally {
        setIsProcessing(false);
      }
    },
    [validation, autoCompressImages, multiple, onFilesSelected]
  );

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [processFiles]
  );

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = "";
      }
    },
    [processFiles]
  );

  const clearFiles = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    isDragging,
    isProcessing,
    files,
    error,
    inputRef,
    openFileDialog,
    handleInputChange,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    processFiles,
    clearFiles,
    removeFile,
  };
}
