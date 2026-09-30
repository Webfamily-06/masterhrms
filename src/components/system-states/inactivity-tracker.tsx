import { useEffect, useRef } from "react";
import { useCurrentProfile } from "@/lib/session";
import { clearToken } from "@/lib/api";

// 15 Minutes Inactivity -> Redirect to Lock Screen
const LOCK_THRESHOLD_MS = 15 * 60 * 1000;

// 2 Hours Continuous Inactivity -> Complete Session Logout
const HARD_LOGOUT_THRESHOLD_MS = 2 * 60 * 60 * 1000;

const ACTIVITY_THROTTLE_MS = 5000;

export function InactivityTracker() {
  const { data: profile } = useCurrentProfile();
  const lastThrottleRef = useRef<number>(Date.now());

  // Cache user details for the lock screen whenever profile is loaded
  useEffect(() => {
    if (profile?.email) {
      try {
        localStorage.setItem(
          "hrms_locked_user",
          JSON.stringify({
            name: profile.full_name || profile.email.split("@")[0],
            email: profile.email,
            avatar: profile.avatar_url,
          })
        );
      } catch {}
    }
  }, [profile]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initialize last activity timestamp if absent
    if (!localStorage.getItem("hrms_last_activity")) {
      localStorage.setItem("hrms_last_activity", Date.now().toString());
    }

    const updateActivity = () => {
      // If currently on the lock screen, do NOT reset activity timestamp via passive movements.
      // Real activity is only acknowledged once unlocked with valid credentials.
      if (window.location.pathname === "/lock-screen") {
        return;
      }

      const now = Date.now();
      if (now - lastThrottleRef.current > ACTIVITY_THROTTLE_MS) {
        lastThrottleRef.current = now;
        localStorage.setItem("hrms_last_activity", now.toString());
      }
    };

    // Activity listeners
    window.addEventListener("mousemove", updateActivity, { passive: true });
    window.addEventListener("mousedown", updateActivity, { passive: true });
    window.addEventListener("keydown", updateActivity, { passive: true });
    window.addEventListener("touchstart", updateActivity, { passive: true });
    window.addEventListener("scroll", updateActivity, { passive: true });

    // Periodic check interval
    const interval = setInterval(() => {
      const token = localStorage.getItem("hrms_auth_token");
      if (!token) return; // User is already logged out

      const path = window.location.pathname;

      // Ignore public authentication routes
      if (
        path.startsWith("/auth") ||
        path.startsWith("/login") ||
        path.startsWith("/super-login") ||
        path.startsWith("/maintenance") ||
        path.startsWith("/404") ||
        path.startsWith("/error-404") ||
        path.startsWith("/500") ||
        path.startsWith("/error-500")
      ) {
        return;
      }

      const rawLastActivity = localStorage.getItem("hrms_last_activity");
      const lastActivity = rawLastActivity ? parseInt(rawLastActivity, 10) : Date.now();
      const idleTime = Date.now() - lastActivity;

      // 1. HARD LOGOUT: >= 2 hours continuous inactivity
      if (idleTime >= HARD_LOGOUT_THRESHOLD_MS) {
        console.warn("[Session Manager] Continuous inactivity exceeded 2 hours. Auto-logging out session.");
        clearToken();
        localStorage.removeItem("hrms_locked_return_url");
        localStorage.removeItem("hrms_locked_user");
        localStorage.removeItem("hrms_last_activity");
        window.location.href = "/auth?session_expired=inactivity_2h";
        return;
      }

      // 2. AUTO-LOCK: >= 15 minutes inactivity while authenticated
      if (idleTime >= LOCK_THRESHOLD_MS) {
        if (path !== "/lock-screen") {
          console.info("[Session Manager] User inactive for 15 minutes. Redirecting to lock screen.");
          const returnUrl = window.location.pathname + window.location.search;
          if (returnUrl && returnUrl !== "/" && !returnUrl.startsWith("/auth")) {
            localStorage.setItem("hrms_locked_return_url", returnUrl);
          }
          window.location.href = "/lock-screen";
        }
      }
    }, 15000); // Check every 15 seconds

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("mousedown", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      clearInterval(interval);
    };
  }, []);

  return null;
}
