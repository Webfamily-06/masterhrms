import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({
  className = "",
  variant = "ghost",
  size = "icon",
}: {
  className?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "icon" | "sm" | "default";
}) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check initial dark class or localStorage - default is dark mode
    const saved = localStorage.getItem("theme");
    const isLight = saved === "light";
    if (isLight) {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      setIsDark(true);
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (typeof e.detail?.isDark === "boolean") {
        setIsDark(e.detail.isDark);
      } else {
        setIsDark(document.documentElement.classList.contains("dark"));
      }
    };
    window.addEventListener("theme-change", handleThemeChange);
    return () => window.removeEventListener("theme-change", handleThemeChange);
  }, []);

  function toggleTheme() {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
    }
    window.dispatchEvent(new CustomEvent("theme-change", { detail: { isDark: nextDark } }));
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`relative shrink-0 rounded-lg transition-all hover:bg-accent ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle Light/Dark Theme"
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400 transition-transform duration-300 rotate-0 scale-100" />
      ) : (
        <Moon className="size-4 text-slate-700 dark:text-slate-200 transition-transform duration-300 rotate-0 scale-100" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
