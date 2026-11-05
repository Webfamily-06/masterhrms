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

// ── Web Push Notification & Incoming Call Lifecycle Handlers ──

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (err) {
    try {
      payload = JSON.parse(event.data.text());
    } catch {
      payload = { title: "MasterHRMS", body: event.data.text() };
    }
  }

  const type = payload.type || payload.data?.type;
  const callId = payload.callId || payload.data?.callId;

  // Case 1: Cancellation or dismissal of a call
  if (type === "CALL_CANCELLED" || type === "call:cancelled" || type === "call:timeout" || type === "call:rejected") {
    event.waitUntil(
      self.registration
        .getNotifications({ tag: `call_${callId}` })
        .then((notifications) => {
          notifications.forEach((n) => n.close());
        })
        .then(() => {
          // Broadcast to all open clients so foreground call UI closes
          return self.clients.matchAll({ type: "window", includeUncontrolled: true });
        })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "CALL_CANCELLED_PUSH",
              callId,
              reason: payload.reason || "cancelled",
            });
          });
        })
    );
    return;
  }

  // Case 2: Incoming Audio / Video Call
  if (type === "CALL_INCOMING" || type === "call:incoming") {
    const callerName = payload.callerName || payload.data?.callerName || "A colleague";
    const callType = (payload.callType || payload.data?.callType || "audio").toLowerCase();
    const isVideo = callType === "video";
    const actionUrl = payload.actionUrl || payload.data?.actionUrl || `/chat?callId=${callId}&action=incoming`;

    const title = `Incoming ${isVideo ? "Video" : "Audio"} Call`;
    const options = {
      body: `${callerName} is calling you via MasterHRMS...`,
      icon: payload.callerAvatar || "/assets/img/logo-small.svg",
      badge: "/assets/img/favicon.png",
      tag: `call_${callId}`,
      renotify: true,
      requireInteraction: true, // Keep notification visible until user answers or caller hangs up
      silent: false,
      vibrate: [500, 250, 500, 250, 500, 250, 500, 250, 500],
      data: {
        type: "CALL_INCOMING",
        callId,
        callerId: payload.callerId || payload.data?.callerId,
        callerName,
        callerAvatar: payload.callerAvatar || payload.data?.callerAvatar,
        callType,
        threadId: payload.threadId || payload.data?.threadId,
        tenantId: payload.tenantId || payload.data?.tenantId,
        actionUrl,
        receivedAt: Date.now(),
      },
      actions: [
        {
          action: "accept",
          title: "Accept",
        },
        {
          action: "reject",
          title: "Decline",
        },
      ],
    };

    event.waitUntil(
      self.registration
        .showNotification(title, options)
        .then(() => {
          // Inform open windows immediately
          return self.clients.matchAll({ type: "window", includeUncontrolled: true });
        })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "CALL_INCOMING_PUSH",
              callId,
              callerId: payload.callerId,
              callerName,
              callerAvatar: payload.callerAvatar,
              callType,
              actionUrl,
            });
          });
        })
    );
    return;
  }

  // Case 3: Standard generic platform notifications (Leave, Attendance, Calendar, Todo, Payroll, Chat, System)
  const standardTitle = payload.title || "MasterHRMS Alert";
  const targetUrl = payload.actionUrl || payload.linkTo || payload.url || (payload.data?.actionUrl) || (payload.data?.linkTo) || (payload.data?.url) || "/";
  const notifId = payload.id || payload.notificationId || (payload.data?.id);
  const tag = payload.tag || (notifId ? `notif_${notifId}` : "masterhrms-alert");

  const standardOptions = {
    body: payload.body || payload.message || "",
    icon: payload.icon || "/assets/img/logo-small.svg",
    badge: "/assets/img/favicon.png",
    tag,
    renotify: true,
    data: {
      type: payload.type || payload.module || "SYSTEM",
      id: notifId,
      tenantId: payload.tenantId,
      actionUrl: targetUrl,
      url: targetUrl,
      linkTo: targetUrl,
      receivedAt: Date.now(),
      ...(payload.data || {}),
    },
  };

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Broadcast payload to all open clients so in-app drawer updates immediately
      clients.forEach((c) => {
        c.postMessage({
          type: "PUSH_NOTIFICATION_RECEIVED",
          payload,
        });
      });

      // Deduplication: If a client window is currently visible and focused,
      // the in-app notification drawer & toast already display the alert.
      // Suppress duplicate OS notification popup.
      const hasFocusedClient = clients.some((c) => c.focused);
      if (hasFocusedClient) {
        return Promise.resolve();
      }

      // Display native OS notification when app is in another tab, minimized, or closed
      return self.registration.showNotification(standardTitle, standardOptions);
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action; // "accept" | "reject" | "" (clicked body)
  const callId = data.callId;

  // If user explicitly clicked "Decline" / "reject" action
  if (action === "reject" && callId) {
    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
          clients.forEach((c) => {
            c.postMessage({ type: "CALL_ACTION_REJECT", callId });
          });
          return fetch(`/api/calls/${encodeURIComponent(callId)}/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "declined_from_notification" }),
          }).catch(() => {});
        })
    );
    return;
  }

  // Resolve target application route (supporting role-aware routes: /hr/*, /me/*, /tenant/*, /super/*, /chat)
  let targetPath = callId
    ? `/chat?callId=${encodeURIComponent(callId)}`
    : (data.actionUrl || data.url || data.linkTo || "/");

  // Sanitize any accidental autoAccept parameter
  targetPath = targetPath.replace(/([?&])autoAccept=true&?/, "$1").replace(/[?&]$/, "");

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Find existing client window
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            client.postMessage({
              type: "NOTIFICATION_CLICK_NAVIGATE",
              callId,
              targetPath,
              actionUrl: targetPath,
              data,
            });

            // If the client is not currently on targetPath, navigate
            const clientUrl = new URL(client.url);
            if (targetPath && targetPath !== "/" && !clientUrl.pathname.includes(targetPath.split("?")[0])) {
              if ("navigate" in client) {
                return client.navigate(targetPath);
              }
            }
            return;
          }
        }
        // If no open client exists, open a new window to the target route
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetPath);
        }
      })
  );
});

self.addEventListener("notificationclose", (event) => {
  const data = event.notification.data || {};
  if (data.type === "CALL_INCOMING" && data.callId) {
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((c) => {
        c.postMessage({ type: "CALL_NOTIFICATION_CLOSED", callId: data.callId });
      });
    });
  }
});
