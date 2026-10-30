"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  Lock,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Shield,
  Clock,
  ExternalLink,
} from "lucide-react";

const SYSTEM_FONT_STACK =
  "var(--font-sans), 'Public Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

interface PublicFileMetadata {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  formattedSize: string;
  category: string;
  updatedAt: string;
}

export default function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<PublicFileMetadata | null>(null);
  const [allowDownload, setAllowDownload] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Unwrap params
  useEffect(() => {
    Promise.resolve(params).then((resolved) => {
      setToken(resolved.token);
    });
  }, [params]);

  // Fetch Link Info
  useEffect(() => {
    if (!token) return;

    async function fetchLink() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:4000/api/v1/public/files/link/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "This link is expired or invalid.");
          setLoading(false);
          return;
        }

        setFile(data.file);
        setAllowDownload(data.allowDownload);
        setRequiresPassword(data.requiresPassword);
        setLoading(false);
      } catch (e: any) {
        setError("Failed to connect to the file server.");
        setLoading(false);
      }
    }

    fetchLink();
  }, [token]);

  // Verify Password
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsVerifyingPassword(true);
    setPasswordError(null);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/public/files/link/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "Incorrect password.");
        setIsVerifyingPassword(false);
        return;
      }

      setFile(data.file);
      setAllowDownload(data.allowDownload);
      setRequiresPassword(false); // Unlocked!
      setIsVerifyingPassword(false);
    } catch {
      setPasswordError("Failed to verify password.");
      setIsVerifyingPassword(false);
    }
  };

  // Download File
  const handleDownload = async () => {
    if (!token) return;
    setIsDownloading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/public/files/link/${token}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() || undefined }),
      });
      const data = await res.json();

      if (!res.ok || !data.downloadUrl) {
        alert(data.error || "Download authorization failed.");
        setIsDownloading(false);
        return;
      }

      // Trigger download
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.setAttribute("download", data.fileName || file?.fileName || "download");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      style={{ fontFamily: SYSTEM_FONT_STACK }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between"
    >
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/FILE-MANAGER/Explorer.ico" alt="MasterHRMS" className="size-6 object-contain" />
          <span className="font-semibold text-sm tracking-tight">MasterHRMS File Share</span>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Shield className="size-3.5 text-emerald-500" />
          <span>Encrypted Transfer</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4">
        {loading ? (
          <div className="text-center space-y-3">
            <Loader2 className="size-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs text-slate-500">Accessing secure file link...</p>
          </div>
        ) : error ? (
          /* Error / Expired State */
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-lg space-y-4">
            <div className="size-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="size-7" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Link Unavailable or Expired
              </h2>
              <p className="text-xs text-slate-500 mt-1.5">{error}</p>
            </div>
            <p className="text-[11px] text-slate-400">
              The owner may have revoked access or the time-limited link has passed its expiration date.
            </p>
          </div>
        ) : requiresPassword ? (
          /* Password Prompt State */
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="size-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 mx-auto flex items-center justify-center">
              <Lock className="size-6" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Password Protected File
              </h2>
              <p className="text-xs text-slate-500">
                This link is protected. Please enter the password to view and download "{file?.fileName}".
              </p>
            </div>

            <form onSubmit={handleVerifyPassword} className="space-y-3">
              <div className="space-y-1">
                <input
                  type="password"
                  placeholder="Enter password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-[11px] text-rose-500 font-medium">{passwordError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isVerifyingPassword || !password.trim()}
                className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {isVerifyingPassword && <Loader2 className="size-3.5 animate-spin" />}
                Unlock File
              </button>
            </form>
          </div>
        ) : file ? (
          /* Active File Card Ready to Download */
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                <img
                  src={
                    file.fileName.endsWith(".pdf")
                      ? "/FILE-MANAGER/pdf.svg"
                      : file.fileName.endsWith(".xlsx") || file.fileName.endsWith(".csv")
                      ? "/FILE-MANAGER/excel.svg"
                      : file.fileName.endsWith(".docx") || file.fileName.endsWith(".doc")
                      ? "/FILE-MANAGER/docx_icon.svg"
                      : "/FILE-MANAGER/Blank.ico"
                  }
                  alt=""
                  className="size-8 object-contain"
                />
              </div>
              <div className="truncate flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={file.fileName}>
                  {file.fileName}
                </h3>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="font-mono">{file.formattedSize}</span>
                  <span>•</span>
                  <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>File Category</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">{file.category}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>MIME Type</span>
                <span className="font-mono text-slate-900 dark:text-slate-200 text-[11px] truncate max-w-[200px]">
                  {file.mimeType}
                </span>
              </div>
            </div>

            {allowDownload ? (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Preparing Download...</span>
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    <span>Download File ({file.formattedSize})</span>
                  </>
                )}
              </button>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs text-center">
                This file is shared in preview-only mode. Direct downloads are restricted by the owner.
              </div>
            )}
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-3 text-center text-[11px] text-slate-400">
        Secured by MasterHRMS Enterprise File Management
      </footer>
    </div>
  );
}
