/**
 * Convenient re-exports of all 8 Browser Web API React hooks
 */
export {
  useLocalStorage,
  useSessionStorage,
  useGeolocation,
  useClipboard,
  useFetch,
  useNotification,
  useMediaDevices,
  useNetworkStatus,
  useOfflineQueue,
  useFileDropzone,
} from "@/lib/web-apis";

export type {
  GeolocationCoordinates,
  GeolocationState,
  GeofenceZone,
  ClipboardState,
  ClipboardOptions,
  FetchState,
  ResilientFetchOptions,
  BrowserNotificationPayload,
  NotificationPermissionStatus,
  MediaDeviceItem,
  MediaDeviceState,
  SnapshotOptions,
  NetworkStatusState,
  QueuedOfflineAction,
  FileValidationOptions,
  FileProcessingResult,
  ImageCompressionOptions,
} from "@/lib/web-apis";
