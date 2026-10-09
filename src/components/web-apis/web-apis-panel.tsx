import React, { useState } from "react";
import {
  Database,
  MapPin,
  Copy,
  Check,
  Send,
  Bell,
  Camera,
  Wifi,
  WifiOff,
  FileUp,
  Download,
  RefreshCw,
  Play,
  Square,
  Sparkles,
  ShieldCheck,
  Activity,
  Layers,
  Clock,
  ArrowRight,
  Sliders,
  AlertCircle,
  FileSpreadsheet,
  Zap,
  X,
  FileText,
  Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useLocalStorage,
  useGeolocation,
  useClipboard,
  useNotification,
  useMediaDevices,
  useNetworkStatus,
  useOfflineQueue,
  useFileDropzone,
} from "@/hooks/web-apis";
import {
  storage,
  checkGeofence,
  resilientFetch,
  exportToCsv,
  parseCsv,
  compressImage,
} from "@/lib/web-apis";

export function WebApisRuntimePanel() {
  // 1. Web Storage API State
  const [storageKey, setStorageKey] = useState("hrms_demo_pref");
  const [storageInput, setStorageInput] = useState("Dark Theme / HR Manager");
  const [storageValue, setStorageValue, removeStorageValue] = useLocalStorage(
    storageKey,
    "Initial Demo Value"
  );

  // 2. Geolocation API State
  const geo = useGeolocation({ watch: false, immediate: false });
  const mockOffice = {
    name: "Master HRMS Global HQ",
    latitude: 12.9716, // Bangalore coordinates as example
    longitude: 77.5946,
    radiusMeters: 500,
  };
  const geofenceResult = geo.coordinates
    ? checkGeofence(geo.coordinates, mockOffice)
    : null;

  // 3. Clipboard API State
  const clipboard = useClipboard({
    onSuccess: (txt) => toast.success(`Copied to clipboard: "${txt.slice(0, 30)}..."`),
    onError: (err) => toast.error(err.message),
  });
  const [pasteContent, setPasteContent] = useState<string>("");

  // 4. Resilient Fetch API State
  const [fetchUrl, setFetchUrl] = useState("/api/health");
  const [fetchResult, setFetchResult] = useState<any>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  // 5. Notification API State
  const notif = useNotification();

  // 6. Media Devices API State
  const media = useMediaDevices({ video: true, initialFacingMode: "user" });
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);

  // 7. Network / Offline API State
  const network = useNetworkStatus();
  const offlineQueue = useOfflineQueue();

  // 8. File API State
  const [compressedFileStats, setCompressedFileStats] = useState<{
    originalSize: string;
    compressedSize: string;
    savings: string;
  } | null>(null);
  const dropzone = useFileDropzone({
    validation: { maxSizeBytes: 20 * 1024 * 1024 },
    autoCompressImages: false,
    multiple: true,
    onFilesSelected: async (selected) => {
      const first = selected[0];
      if (first && first.file.type.startsWith("image/")) {
        try {
          const compressed = await compressImage(first.file, { quality: 0.75, maxWidth: 1200 });
          const origKb = (first.file.size / 1024).toFixed(1);
          const compKb = (compressed.size / 1024).toFixed(1);
          const savingsPct = Math.round((1 - compressed.size / first.file.size) * 100);
          setCompressedFileStats({
            originalSize: `${origKb} KB`,
            compressedSize: `${compKb} KB`,
            savings: `${savingsPct}% reduction`,
          });
          toast.success(`Image compressed: saved ${savingsPct}% bandwidth!`);
        } catch {
          toast.success(`Image loaded: ${first.name}`);
        }
      } else if (first) {
        toast.success(`File loaded: ${first.name} (${(first.size / 1024).toFixed(1)} KB)`);
      }
    },
  });

  const handleTestFetch = async () => {
    setFetchLoading(true);
    setFetchResult(null);
    try {
      const data = await resilientFetch(fetchUrl, { timeoutMs: 8000, retries: 2 });
      setFetchResult(data);
      toast.success("Fetch API call succeeded!");
    } catch (err: any) {
      setFetchResult({ error: err.message });
      toast.error(`Fetch failed: ${err.message}`);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (notif.permission !== "granted") {
      const res = await notif.requestPermission();
      if (res !== "granted") {
        toast.error("Notification permission denied");
        return;
      }
    }
    notif.sendNotification({
      title: "Master HRMS Alert",
      body: "Shift Punch-In reminder: Your scheduled shift begins in 15 minutes.",
      icon: "/favicon.webp",
      badge: "/favicon.webp",
      tag: "shift-reminder",
    });
    toast.success("Desktop Notification dispatched!");
  };

  const handleTakeSelfie = async () => {
    const snap = await media.captureSnapshot({ format: "image/jpeg", quality: 0.85 });
    if (snap) {
      setSnapshotPreview(snap.dataUrl);
      toast.success(`Captured Selfie Photo: ${(snap.blob.size / 1024).toFixed(1)} KB`);
    } else {
      toast.error("Failed to capture snapshot. Is the camera running?");
    }
  };

  const handleExportMockCsv = () => {
    const sampleData = [
      { "Employee ID": "EMP-001", Name: "Sarah Connor", Department: "Engineering", Status: "Active" },
      { "Employee ID": "EMP-002", Name: "John Doe", Department: "Human Resources", Status: "Active" },
      { "Employee ID": "EMP-003", Name: "Elena Rostova", Department: "Finance", Status: "On Leave" },
    ];
    exportToCsv(sampleData, `employee_directory_${Date.now()}.csv`);
    toast.success("Exported Employee CSV file!");
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-4 rounded-xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary animate-pulse" />
            <h2 className="text-base font-semibold text-foreground">
              Master HRMS Web APIs Runtime Suite
            </h2>
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs">
              8 Real-time APIs Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Fully reactive, production-grade browser API hooks integrated into application workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-mono">
            {network.isOnline ? (
              <>
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">ONLINE</span>
              </>
            ) : (
              <>
                <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-600 dark:text-rose-400 font-bold">OFFLINE</span>
              </>
            )}
            <span className="text-muted-foreground">({network.effectiveType.toUpperCase()})</span>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card border border-border text-xs">
            <span className="text-muted-foreground">Queue:</span>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {offlineQueue.queueCount} items
            </Badge>
          </div>
        </div>
      </div>

      {/* Grid of the 8 APIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Web Storage API */}
        <Card className="shadow-xs border-border flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Database className="size-4" />
                </div>
                <CardTitle className="text-sm font-semibold">1. Web Storage API</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">localStorage / session</Badge>
            </div>
            <CardDescription className="text-xs">
              Reactive storage with JSON, TTL, & cross-tab sync.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between text-xs">
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Storage Key</label>
                <Input
                  value={storageKey}
                  onChange={(e) => setStorageKey(e.target.value)}
                  className="h-7 text-xs font-mono"
                  placeholder="key"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Value to Store</label>
                <Input
                  value={storageInput}
                  onChange={(e) => setStorageInput(e.target.value)}
                  className="h-7 text-xs"
                  placeholder="value"
                />
              </div>
              <div className="p-2 rounded bg-muted/60 font-mono text-[11px] break-all border border-border">
                <span className="text-muted-foreground">Stored: </span>
                <span className="text-primary font-semibold">{JSON.stringify(storageValue)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => {
                  setStorageValue(storageInput);
                  toast.success(`Saved to key "${storageKey}"`);
                }}
              >
                Save Value
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  removeStorageValue();
                  toast.info(`Removed key "${storageKey}"`);
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. Geolocation API */}
        <Card className="shadow-xs border-border flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <MapPin className="size-4" />
                </div>
                <CardTitle className="text-sm font-semibold">2. Geolocation API</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">GPS & Geofencing</Badge>
            </div>
            <CardDescription className="text-xs">
              Attendance clock-in & geofence validation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between text-xs">
            <div className="space-y-2">
              {geo.loading ? (
                <div className="p-3 rounded bg-muted/40 text-center animate-pulse text-muted-foreground">
                  Acquiring GPS fix...
                </div>
              ) : geo.coordinates ? (
                <div className="p-2 rounded bg-muted/60 font-mono text-[11px] space-y-1 border border-border">
                  <div>Lat: <span className="font-semibold text-foreground">{geo.coordinates.latitude.toFixed(5)}</span></div>
                  <div>Lng: <span className="font-semibold text-foreground">{geo.coordinates.longitude.toFixed(5)}</span></div>
                  <div>Accuracy: <span className="text-emerald-600 font-semibold">{geo.coordinates.accuracy.toFixed(0)}m</span></div>
                  {geofenceResult && (
                    <div className="mt-1 pt-1 border-t border-border">
                      <span className="text-muted-foreground">HQ Distance: </span>
                      <span className="font-bold">{geofenceResult.distanceMeters}m</span>
                      {geofenceResult.isInside ? (
                        <Badge className="ml-1 bg-emerald-500/10 text-emerald-600 text-[10px]">Inside Geofence</Badge>
                      ) : (
                        <Badge className="ml-1 bg-amber-500/10 text-amber-600 text-[10px]">Outside Radius</Badge>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded bg-muted/30 text-center text-muted-foreground text-xs">
                  {geo.error || "Click below to acquire device GPS coordinates."}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="h-7 text-xs flex-1 gap-1"
                onClick={geo.refreshLocation}
                disabled={geo.loading}
              >
                <MapPin className="size-3" /> Get Coordinates
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={geo.isWatching ? geo.stopWatching : geo.startWatching}
              >
                {geo.isWatching ? "Stop Watch" : "Live Watch"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 3. Clipboard API */}
        <Card className="shadow-xs border-border flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Copy className="size-4" />
                </div>
                <CardTitle className="text-sm font-semibold">3. Clipboard API</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">Async & ExecCommand</Badge>
            </div>
            <CardDescription className="text-xs">
              1-click copy employee codes & tokens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between text-xs">
            <div className="space-y-2">
              <div className="p-2.5 rounded bg-muted/60 border border-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Invite Token</div>
                  <div className="font-mono text-xs font-bold text-foreground">HRMS-INV-9824X</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => clipboard.copy("HRMS-INV-9824X")}
                >
                  {clipboard.copied ? (
                    <>
                      <Check className="size-3 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" /> Copy
                    </>
                  )}
                </Button>
              </div>

              {pasteContent && (
                <div className="p-2 rounded bg-muted/40 font-mono text-[11px] truncate border border-border">
                  <span className="text-muted-foreground">Pasted: </span>
                  {pasteContent}
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs w-full"
                onClick={async () => {
                  const txt = await clipboard.read();
                  if (txt) {
                    setPasteContent(txt);
                    toast.success("Read from clipboard successfully!");
                  } else {
                    toast.info("Clipboard is empty or permission denied.");
                  }
                }}
              >
                Read from Clipboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 4. Resilient Fetch API */}
        <Card className="shadow-xs border-border flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Zap className="size-4" />
                </div>
                <CardTitle className="text-sm font-semibold">4. Fetch API</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">Retry & Timeout</Badge>
            </div>
            <CardDescription className="text-xs">
              Resilient HTTP client with backoff retries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between text-xs">
            <div className="space-y-2">
              <Input
                value={fetchUrl}
                onChange={(e) => setFetchUrl(e.target.value)}
                className="h-7 text-xs font-mono"
                placeholder="/api/health"
              />

              <div className="p-2 rounded bg-muted/60 font-mono text-[11px] h-16 overflow-y-auto custom-scrollbar border border-border">
                {fetchLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                    <RefreshCw className="size-3 animate-spin" /> Calling API...
                  </div>
                ) : fetchResult ? (
                  <pre className="text-[10px]">{JSON.stringify(fetchResult, null, 2)}</pre>
                ) : (
                  <span className="text-muted-foreground">Ready to test fetch.</span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button
                size="sm"
                className="h-7 text-xs w-full gap-1"
                onClick={handleTestFetch}
                disabled={fetchLoading}
              >
                <Play className="size-3" /> Execute Resilient Fetch
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 5. Notification API */}
        <Card className="shadow-xs border-border flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Bell className="size-4" />
                </div>
                <CardTitle className="text-sm font-semibold">5. Notification API</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {notif.permission.toUpperCase()}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Browser push & desktop alert notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between text-xs">
            <div className="space-y-2">
              <div className="p-2.5 rounded bg-muted/60 border border-border space-y-1">
                <div className="font-semibold text-foreground text-xs">Shift Reminder Alert</div>
                <div className="text-[11px] text-muted-foreground">
                  Sends desktop notification with sound chime even when tab is backgrounded.
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="h-7 text-xs flex-1 gap-1"
                onClick={handleSendNotification}
              >
                <Bell className="size-3" /> Test Push
              </Button>
              {notif.permission !== "granted" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={notif.requestPermission}
                >
                  Grant
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 6. Media Devices API */}
        <Card className="shadow-xs border-border flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Camera className="size-4" />
                </div>
                <CardTitle className="text-sm font-semibold">6. Media Devices</CardTitle>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] ${media.isActive ? "bg-emerald-500/10 text-emerald-600" : ""}`}
              >
                {media.isActive ? "STREAMING" : "STANDBY"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Webcam feed, selfie punch-in, & ID scanner.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between text-xs">
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden bg-black/90 aspect-video flex items-center justify-center border border-border">
                <video
                  ref={media.videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${media.facingMode === "user" ? "-scale-x-100" : ""}`}
                />
                {!media.isActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-1">
                    <Camera className="size-6 opacity-40" />
                    <span className="text-[11px]">Camera Inactive</span>
                  </div>
                )}
              </div>

              {snapshotPreview && (
                <div className="flex items-center gap-2 p-1.5 rounded bg-muted/60 border border-border">
                  <img src={snapshotPreview} alt="Selfie" className="size-8 rounded object-cover" />
                  <span className="text-[10px] text-muted-foreground">Selfie Captured</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              {media.isActive ? (
                <>
                  <Button
                    size="sm"
                    className="h-7 text-xs flex-1 gap-1"
                    onClick={handleTakeSelfie}
                  >
                    <Camera className="size-3" /> Snap Selfie
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={media.stopCamera}
                  >
                    <Square className="size-3" /> Stop
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="h-7 text-xs w-full gap-1"
                  onClick={() => media.startCamera()}
                >
                  <Play className="size-3" /> Start Camera
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 7. Online / Offline API */}
        <Card className="shadow-xs border-border flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Wifi className="size-4" />
                </div>
                <CardTitle className="text-sm font-semibold">7. Online / Offline</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {network.isOnline ? "CONNECTED" : "OFFLINE"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Network awareness & auto-sync queue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between text-xs">
            <div className="space-y-2">
              <div className="p-2 rounded bg-muted/60 border border-border space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={network.isOnline ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                    {network.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Speed Type:</span>
                  <span>{network.effectiveType.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Queued Actions:</span>
                  <span className="font-bold">{offlineQueue.queueCount}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs flex-1"
                onClick={() => {
                  offlineQueue.enqueue({
                    endpoint: "/api/attendance/clock-in",
                    method: "POST",
                    payload: { note: "Offline Clock-in test", timestamp: Date.now() },
                  });
                  toast.success("Enqueued offline attendance punch!");
                }}
              >
                + Enqueue Punch
              </Button>
              {offlineQueue.queueCount > 0 && (
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => offlineQueue.replay()}
                  disabled={offlineQueue.isReplaying}
                >
                  Sync
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 8. File API */}
        <Card className="shadow-xs border-border flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <FileUp className="size-4" />
                </div>
                <CardTitle className="text-sm font-semibold">8. File API</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">Dropzone & Canvas</Badge>
            </div>
            <CardDescription className="text-xs">
              Drag-and-drop, image compress & CSV export.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between text-xs">
            <div className="space-y-2">
              <input
                type="file"
                ref={dropzone.inputRef}
                onChange={dropzone.handleInputChange}
                style={{ display: "none" }}
                multiple
              />

              <div
                onDragEnter={dropzone.onDragEnter}
                onDragOver={dropzone.onDragOver}
                onDragLeave={dropzone.onDragLeave}
                onDrop={dropzone.onDrop}
                onClick={dropzone.openFileDialog}
                className={`p-3 rounded-lg border-2 border-dashed text-center transition-all cursor-pointer select-none ${
                  dropzone.isDragging
                    ? "border-primary bg-primary/15 scale-[1.02]"
                    : "border-border bg-muted/40 hover:bg-muted/70 hover:border-primary/50"
                }`}
              >
                <FileUp className={`size-5 mx-auto mb-1 transition-transform ${dropzone.isDragging ? "text-primary scale-125 animate-bounce" : "text-muted-foreground"}`} />
                <span className="text-[11px] font-medium text-foreground block">
                  {dropzone.isDragging ? "Drop files to load!" : "Click to browse or drag & drop files"}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Images, CSV, PDF up to 20MB
                </span>
              </div>

              {dropzone.error && (
                <div className="p-2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px]">
                  {dropzone.error}
                </div>
              )}

              {dropzone.isProcessing && (
                <div className="flex items-center justify-center gap-1.5 p-2 rounded bg-muted/50 text-[11px] text-muted-foreground animate-pulse">
                  <RefreshCw className="size-3 animate-spin text-primary" /> Processing & compressing...
                </div>
              )}

              {dropzone.files.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Loaded Files ({dropzone.files.length}):</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dropzone.clearFiles();
                        setCompressedFileStats(null);
                      }}
                      className="text-muted-foreground hover:text-rose-500 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  {dropzone.files.map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      className="flex items-center justify-between gap-2 p-1.5 rounded bg-muted/60 border border-border text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {f.dataUrl ? (
                          <img src={f.dataUrl} alt={f.name} className="size-6 rounded object-cover shrink-0" />
                        ) : (
                          <FileText className="size-4 text-primary shrink-0" />
                        )}
                        <span className="truncate font-mono text-[10px] text-foreground">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dropzone.removeFile(idx);
                          }}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-rose-500 transition-colors"
                          title="Remove file"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {compressedFileStats && (
                <div className="p-2 rounded bg-muted/60 border border-border text-[10px] space-y-0.5 font-mono">
                  <div>Orig: {compressedFileStats.originalSize} ➔ Comp: {compressedFileStats.compressedSize}</div>
                  <div className="text-emerald-600 font-bold">{compressedFileStats.savings}</div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs w-full gap-1"
                onClick={handleExportMockCsv}
              >
                <Download className="size-3" /> Export Employee CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
