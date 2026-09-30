import React, { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCurrentProfile } from "@/lib/session";
import { api, setToken, clearToken } from "@/lib/api";
import { resolveDefaultRoute } from "@/lib/auth-navigation";
import { toast } from "sonner";

export const Route = createFileRoute("/lock-screen")({
  component: LockScreenComponent,
  head: () => ({
    meta: [
      { title: "Lock Screen | Dreams ERP" },
      { name: "description", content: "Session locked for security. Enter your password to resume." },
    ],
  }),
});

function LockScreenComponent() {
  const navigate = useNavigate();
  const { data: profile } = useCurrentProfile();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [cachedUser, setCachedUser] = useState<{
    name: string;
    email: string;
    avatar: string | null;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hrms_locked_user");
      if (stored) {
        setCachedUser(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const displayName =
    profile?.full_name ||
    cachedUser?.name ||
    (profile?.email ? profile.email.split("@")[0] : "James Hong");

  const displayEmail = profile?.email || cachedUser?.email || "james@example.com";

  const avatarUrl =
    profile?.avatar_url ||
    cachedUser?.avatar ||
    "/ui-assets/avatar-03.jpg";

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setErrorMessage("Please enter your password to unlock.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await api.post("/auth/unlock", {
        email: displayEmail,
        password,
      });

      if (res.token) {
        setToken(res.token);
        localStorage.setItem("hrms_last_activity", Date.now().toString());

        const returnUrl = localStorage.getItem("hrms_locked_return_url");
        localStorage.removeItem("hrms_locked_return_url");

        toast.success("Welcome back! Session unlocked successfully.");

        if (returnUrl && returnUrl !== "/lock-screen" && !returnUrl.startsWith("/auth")) {
          window.location.href = returnUrl;
        } else {
          const dest = resolveDefaultRoute(res.roles || profile?.roles || []);
          window.location.href = dest;
        }
      } else {
        throw new Error(res.error || "Failed to unlock session.");
      }
    } catch (err: any) {
      const msg = err.message || "Incorrect password. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDifferentUser() {
    clearToken();
    localStorage.removeItem("hrms_locked_return_url");
    localStorage.removeItem("hrms_locked_user");
    localStorage.removeItem("hrms_last_activity");
    navigate({ to: "/auth" });
  }

  return (
    <div className="bg-light dark:bg-slate-950 min-h-screen flex items-center justify-center p-4">
      {/* Start Lock Screen (matching ui/lock-screen.html line 53) */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md shadow-sm w-full max-w-md sm:p-8 p-5">
        <div className="text-center mb-6">
          <div className="block dark:hidden">
            <Link to="/"><img src="/logo.webp" className="h-10 mx-auto mb-4 object-contain" alt="logo" /></Link>
          </div>
          <div className="hidden dark:block">
            <Link to="/"><img src="/logo-white.webp" className="h-10 mx-auto mb-4 object-contain" alt="logo" /></Link>
          </div>
          <img
            src={avatarUrl}
            className="size-16 rounded-full mx-auto mb-3 border border-border-color object-cover"
            alt="user avatar"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/ui-assets/avatar-03.jpg";
            }}
          />
          <h1 className="text-xl font-bold text-title mb-1">{displayName}</h1>
          <p className="text-sm text-default mb-0">{displayEmail}</p>
        </div>

        {errorMessage && (
          <div className="p-2.5 mb-4 text-xs text-danger bg-danger-transparent rounded-md border border-danger/20 text-center font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">Password</label>
              <Link to="/auth" search={{ mode: "forgot" }} className="text-xs text-primary hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoFocus
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-default hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
              >
                <i className={`ph-bold ${showPassword ? "ph-eye-slash" : "ph-eye"} text-sm`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-dark text-white py-2.5 rounded-md text-xs font-semibold hover:bg-primary-hover cursor-pointer transition-colors shadow-xs"
          >
            {loading ? "Unlocking..." : "Unlock Session"}
          </button>

          <p className="text-center text-xs text-default mb-0">
            Not you?{" "}
            <button
              type="button"
              onClick={handleDifferentUser}
              className="text-primary hover:underline font-semibold cursor-pointer"
            >
              Sign in as a different user
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
