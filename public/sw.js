/**
 * MasterHRMS Controlled PWA Service Worker (Batch 5C)
 * 
 * Strict Security Principles:
 * 1. Zero caching of /api/* endpoints (all payroll, financial, employee, and tenant API calls bypass cache entirely).
 * 2. Zero caching of /uploads/* (private documents, payslips, and uploaded assets remain network-only).
 * 3. Zero caching of live SSR HTML navigations (prevents caching authenticated or tenant-specific state).
 * 4. Strictly whitelisted static asset caching (immutable hashed JS/CSS, verified brand icons, fonts).
 * 5. Automatic cleanup of outdated service worker cache versions during activate.
 */

const CACHE_NAME = "masterhrms-static-v1";

// Minimal allowlist of verified, physical static assets in public/
const PRECACHE_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.webp",
  "/assets/img/logo-small.svg",
  "/assets/img/apple-icon.png",
  "/assets/img/favicon.png",
];

// File extensions eligible for runtime static caching
const STATIC_EXTENSION_REGEX = /\.(?:js|css|svg|png|webp|woff2?|ttf|eot)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn("[SW] Precache failed during install:", err);
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            // Delete only obsolete caches owned by this service worker
            if (name.startsWith("masterhrms-") && name !== CACHE_NAME) {
              return caches.delete(name);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Rule 1: Non-GET requests bypass CacheStorage entirely
  if (req.method !== "GET") {
    return;
  }

  const url = new URL(req.url);

  // Rule 2: Only intercept same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Rule 3: STRICT API & PRIVATE ASSET BYPASS
  // Any request to /api/* or /uploads/* must NEVER touch CacheStorage
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) {
    return;
  }

  // Rule 4: Navigation requests (HTML documents)
  // Per security specification 3.C: Do NOT cache or return live SSR responses
  // to avoid storing authenticated or tenant-specific state. Allow normal network navigation.
  if (req.mode === "navigate") {
    return;
  }

  // Rule 5: Static Asset Caching (Hashed bundles and static media only)
  const isPrecached = PRECACHE_ASSETS.includes(url.pathname);
  const isStaticChunk =
    (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/ui-assets/")) &&
    STATIC_EXTENSION_REGEX.test(url.pathname);

  if (isPrecached || isStaticChunk) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cachedResponse) => {
          // Fetch from network to refresh cache in background (Stale-While-Revalidate)
          const fetchPromise = fetch(req)
            .then((networkResponse) => {
              // Safety checks before caching:
              // - HTTP 200 OK
              // - Standard basic response (not opaque)
              // - Must NOT set cookies or contain private credentials
              if (
                networkResponse.status === 200 &&
                networkResponse.type === "basic" &&
                !networkResponse.headers.has("set-cookie")
              ) {
                cache.put(req, networkResponse.clone()).catch(() => {});
              }
              return networkResponse;
            })
            .catch(() => {
              // Network failed; return cached response if available
              return cachedResponse;
            });

          // Return cached response immediately if available, else await network
          return cachedResponse || fetchPromise;
        })
      )
    );
  }
});
