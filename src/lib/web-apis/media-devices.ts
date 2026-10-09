import { useState, useEffect, useCallback, useRef } from "react";
import type { MediaDeviceItem, MediaDeviceState, SnapshotOptions } from "./types";

/**
 * Check if MediaDevices API is supported
 */
export function isMediaDevicesSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Enumerate audio and video input devices
 */
export async function getConnectedMediaDevices(): Promise<MediaDeviceItem[]> {
  if (!isMediaDevicesSupported() || !navigator.mediaDevices.enumerateDevices) {
    return [];
  }
  try {
    const list = await navigator.mediaDevices.enumerateDevices();
    return list.map((d) => ({
      deviceId: d.deviceId,
      kind: d.kind,
      label: d.label || `${d.kind} (${d.deviceId.slice(0, 5)}...)`,
      groupId: d.groupId,
    }));
  } catch {
    return [];
  }
}

/**
 * Reactive React Hook for Camera / Video stream capture & Selfie Snapshots
 */
export function useMediaDevices(options: {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
  initialFacingMode?: "user" | "environment";
} = {}) {
  const {
    video = true,
    audio = false,
    initialFacingMode = "user",
  } = options;

  const [state, setState] = useState<MediaDeviceState>({
    stream: null,
    isActive: false,
    facingMode: initialFacingMode,
    devices: [],
    error: null,
    hasPermission: false,
    torchActive: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState((prev) => ({
      ...prev,
      stream: null,
      isActive: false,
      torchActive: false,
    }));
  }, []);

  const startCamera = useCallback(
    async (facingModeOverride?: "user" | "environment") => {
      if (!isMediaDevicesSupported()) {
        setState((prev) => ({
          ...prev,
          error: "Media Devices API is not supported on this browser or platform.",
        }));
        return null;
      }

      stopCamera();

      const targetFacingMode = facingModeOverride || state.facingMode;
      const videoConstraints: MediaTrackConstraints =
        typeof video === "object"
          ? { ...video, facingMode: targetFacingMode }
          : { facingMode: targetFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: video ? videoConstraints : false,
          audio,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        const devList = await getConnectedMediaDevices();

        setState((prev) => ({
          ...prev,
          stream,
          isActive: true,
          facingMode: targetFacingMode,
          devices: devList,
          error: null,
          hasPermission: true,
        }));

        return stream;
      } catch (err: any) {
        const msg =
          err.name === "NotAllowedError"
            ? "Camera permission denied."
            : err.name === "NotFoundError"
            ? "No camera found on this device."
            : err.message || "Failed to access camera.";

        setState((prev) => ({
          ...prev,
          error: msg,
          isActive: false,
          hasPermission: false,
        }));
        return null;
      }
    },
    [video, audio, state.facingMode, stopCamera]
  );

  const toggleFacingMode = useCallback(async () => {
    const nextMode = state.facingMode === "user" ? "environment" : "user";
    if (state.isActive) {
      await startCamera(nextMode);
    } else {
      setState((prev) => ({ ...prev, facingMode: nextMode }));
    }
  }, [state.facingMode, state.isActive, startCamera]);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const capabilities = (videoTrack.getCapabilities?.() || {}) as any;
      if (capabilities.torch) {
        const nextTorch = !state.torchActive;
        await (videoTrack.applyConstraints as any)({
          advanced: [{ torch: nextTorch }],
        });
        setState((prev) => ({ ...prev, torchActive: nextTorch }));
      }
    } catch {
      // Torch not supported
    }
  }, [state.torchActive]);

  /**
   * Capture still frame from live video stream (e.g. for Attendance Selfie or ID Badge)
   */
  const captureSnapshot = useCallback(
    async (
      snapshotOpts: SnapshotOptions = {}
    ): Promise<{ dataUrl: string; blob: Blob; file: File } | null> => {
      const vid = videoRef.current;
      if (!vid || !streamRef.current || vid.videoWidth === 0) {
        return null;
      }

      const {
        format = "image/jpeg",
        quality = 0.85,
        maxWidth = 1280,
        maxHeight = 720,
      } = snapshotOpts;

      const canvas = document.createElement("canvas");
      let w = vid.videoWidth;
      let h = vid.videoHeight;

      if (w > maxWidth || h > maxHeight) {
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // If user camera, flip horizontally for mirror preview fidelity
      if (state.facingMode === "user") {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(vid, 0, 0, w, h);
      const dataUrl = canvas.toDataURL(format, quality);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), format, quality)
      );

      if (!blob) return null;

      const ext = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg";
      const file = new File([blob], `selfie_${Date.now()}.${ext}`, { type: format });

      return { dataUrl, blob, file };
    },
    [state.facingMode]
  );

  // Auto clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    ...state,
    videoRef,
    startCamera,
    stopCamera,
    toggleFacingMode,
    toggleTorch,
    captureSnapshot,
  };
}
