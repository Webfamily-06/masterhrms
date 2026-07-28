import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "", variant = "ghost", size = "icon" }: { className?: string; variant?: "ghost" | "outline" | "default"; size?: "icon" | "sm" | "default" }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial dark class or localStorage
    const saved = localStorage.getItem("theme");
    const hasDarkClass = document.documentElement.classList.contains("dark");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches) || hasDarkClass) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function toggleTheme() {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
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
