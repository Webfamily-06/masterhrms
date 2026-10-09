/**
 * Master HRMS Web APIs — Unified Types
 * Standardized interfaces for the 8 Browser Web APIs
 */

// 1. Web Storage API Types
export interface StorageOptions<T> {
  ttlMs?: number; // Optional Time-to-Live in milliseconds
  serializer?: (value: T) => string;
  deserializer?: (raw: string) => T;
  onError?: (error: Error) => void;
  syncCrossTab?: boolean; // Listen to window storage events
}

export interface StoredItem<T> {
  value: T;
  expiry?: number; // timestamp in ms
}

// 2. Geolocation API Types
export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface GeolocationState {
  coordinates: GeolocationCoordinates | null;
  loading: boolean;
  error: string | null;
  errorCode: number | null; // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
  isWatching: boolean;
}

export interface GeofenceZone {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  name: string;
}

// 3. Clipboard API Types
export interface ClipboardState {
  copied: boolean;
  text: string;
  error: string | null;
  isSupported: boolean;
}

export interface ClipboardOptions {
  resetTimeoutMs?: number;
  onSuccess?: (text: string) => void;
  onError?: (err: Error) => void;
}

// 4. Fetch API Types
export interface ResilientFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface FetchState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRetrying: boolean;
  attempt: number;
}

// 5. Notification API Types
export type NotificationPermissionStatus = "default" | "granted" | "denied" | "unsupported";

export interface BrowserNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  silent?: boolean;
  requireInteraction?: boolean;
  onClick?: () => void;
}

// 6. Media Devices API Types
export interface MediaDeviceItem {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
  groupId: string;
}

export interface MediaDeviceState {
  stream: MediaStream | null;
  isActive: boolean;
  facingMode: "user" | "environment";
  devices: MediaDeviceItem[];
  error: string | null;
  hasPermission: boolean;
  torchActive: boolean;
}

export interface SnapshotOptions {
  format?: "image/jpeg" | "image/png" | "image/webp";
  quality?: number; // 0.1 to 1.0
  maxWidth?: number;
  maxHeight?: number;
}

// 7. Online / Offline API Types
export interface NetworkConnectionInfo {
  downlink?: number;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  rtt?: number;
  saveData?: boolean;
}

export interface NetworkStatusState {
  isOnline: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number | null;
  rtt: number | null;
  since: Date;
}

export interface QueuedOfflineAction<T = any> {
  id: string;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  payload: T;
  timestamp: number;
  attempts: number;
  status: "pending" | "syncing" | "failed";
}

// 8. File API Types
export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[]; // MIME types e.g. ["image/jpeg", "application/pdf"]
  allowedExtensions?: string[]; // e.g. [".jpg", ".pdf"]
}

export interface FileProcessingResult {
  file: File;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  arrayBuffer?: ArrayBuffer;
  text?: string;
}

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 - 1.0
  format?: "image/jpeg" | "image/png" | "image/webp";
}
