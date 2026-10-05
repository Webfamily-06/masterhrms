import { useState, useEffect } from "react";

/**
 * Returns whether dark mode is currently active.
 * Defaults to true (Dark Mode by default).
 */
export function isDarkModeActive(): boolean {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem("theme");
  if (saved === "light") return false;
  if (saved === "dark") return true;
  return document.documentElement.classList.contains("dark") || true;
}

/**
 * React hook that dynamically observes dark / light theme mode changes across the entire app.
 * By default, the application is in dark mode unless explicitly toggled to light.
 */
export function useThemeMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("theme");
    if (saved === "light") return false;
    return true; // Default to dark mode!
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const check = () => {
      const saved = localStorage.getItem("theme");
      if (saved === "light") {
        setIsDark(false);
      } else if (saved === "dark") {
        setIsDark(true);
      } else {
        const hasDarkClass = document.documentElement.classList.contains("dark");
        setIsDark(hasDarkClass);
      }
    };

    check();

    const observer = new MutationObserver(() => {
      const hasDarkClass = document.documentElement.classList.contains("dark");
      setIsDark(hasDarkClass);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const handleThemeChange = (e: any) => {
      if (typeof e.detail?.isDark === "boolean") {
        setIsDark(e.detail.isDark);
      } else {
        check();
      }
    };

    window.addEventListener("theme-change", handleThemeChange);
    window.addEventListener("storage", (e) => {
      if (e.key === "theme") check();
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("theme-change", handleThemeChange);
    };
  }, []);

  return { isDark };
}
