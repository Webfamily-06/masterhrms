import { useState, useEffect, useCallback, useRef } from "react";
import type { GeolocationCoordinates, GeolocationState, GeofenceZone } from "./types";

/**
 * Calculate distance between two coordinates in meters using the Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Verify whether given coordinates are inside an authorized geofence radius
 */
export function checkGeofence(
  current: { latitude: number; longitude: number },
  targetZone: GeofenceZone
): { isInside: boolean; distanceMeters: number } {
  const distanceMeters = calculateDistance(
    current.latitude,
    current.longitude,
    targetZone.latitude,
    targetZone.longitude
  );
  return {
    isInside: distanceMeters <= targetZone.radiusMeters,
    distanceMeters,
  };
}

/**
 * One-off Promise-based Geolocation request
 */
export function getCurrentLocation(
  options: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation API is not supported by this browser environment."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        });
      },
      (err) => reject(err),
      options
    );
  });
}

/**
 * Reactive React Hook for Geolocation tracking & watch updates
 */
export function useGeolocation(options: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
  immediate?: boolean;
} = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 0,
    watch = false,
    immediate = true,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    loading: immediate,
    error: null,
    errorCode: null,
    isWatching: false,
  });

  const watchIdRef = useRef<number | null>(null);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setState((prev) => ({
      ...prev,
      coordinates: {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        timestamp: pos.timestamp,
      },
      loading: false,
      error: null,
      errorCode: null,
    }));
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let msg = "Failed to obtain device location.";
    switch (err.code) {
      case err.PERMISSION_DENIED:
        msg = "Location permission denied by user or policy.";
        break;
      case err.POSITION_UNAVAILABLE:
        msg = "Location information is unavailable.";
        break;
      case err.TIMEOUT:
        msg = "Location request timed out.";
        break;
    }
    setState((prev) => ({
      ...prev,
      loading: false,
      error: msg,
      errorCode: err.code,
    }));
  }, []);

  const refreshLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Geolocation is not supported in this browser.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null, errorCode: null }));
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    });
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  const startWatching = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (watchIdRef.current !== null) return;

    setState((prev) => ({ ...prev, isWatching: true, loading: true }));
    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    });
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setState((prev) => ({ ...prev, isWatching: false }));
    }
  }, []);

  useEffect(() => {
    if (watch) {
      startWatching();
    } else if (immediate) {
      refreshLocation();
    }

    return () => {
      stopWatching();
    };
  }, [watch, immediate, startWatching, refreshLocation, stopWatching]);

  return {
    ...state,
    refreshLocation,
    startWatching,
    stopWatching,
  };
}
