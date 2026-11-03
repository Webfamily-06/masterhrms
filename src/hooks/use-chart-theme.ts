import { useState, useEffect } from "react";

export interface ChartThemeColors {
  background: string;
  text: string;
  mutedText: string;
  border: string;
  grid: string;
  tooltipBg: string;
  tooltipText: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  destructive: string;
}

export interface UseChartThemeResult {
  isDark: boolean;
  mode: "dark" | "light";
  colors: ChartThemeColors;
  apexOptions: Record<string, any>;
}

export function useChartTheme(): UseChartThemeResult {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      document.documentElement.classList.contains("dark") ||
      document.documentElement.getAttribute("data-theme") === "dark"
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkDark = () => {
      const darkActive =
        document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark";
      setIsDark(darkActive);
    };

    checkDark();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "class" || mutation.attributeName === "data-theme")
        ) {
          checkDark();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const mode: "dark" | "light" = isDark ? "dark" : "light";

  const colors: ChartThemeColors = isDark
    ? {
        background: "transparent",
        text: "#f8fafc",
        mutedText: "#94a3b8",
        border: "rgba(255, 255, 255, 0.12)",
        grid: "rgba(255, 255, 255, 0.08)",
        tooltipBg: "#1e293b",
        tooltipText: "#f8fafc",
        primary: "#7367F0",
        secondary: "#a855f7",
        success: "#10b981",
        warning: "#f59e0b",
        destructive: "#ef4444",
      }
    : {
        background: "transparent",
        text: "#0f172a",
        mutedText: "#64748b",
        border: "rgba(0, 0, 0, 0.10)",
        grid: "rgba(0, 0, 0, 0.06)",
        tooltipBg: "#ffffff",
        tooltipText: "#0f172a",
        primary: "#7367F0",
        secondary: "#6366f1",
        success: "#059669",
        warning: "#d97706",
        destructive: "#dc2626",
      };

  const apexOptions = {
    chart: {
      background: "transparent",
      foreColor: colors.mutedText,
      fontFamily: "var(--font-sans, inherit)",
      toolbar: { show: false },
    },
    theme: {
      mode,
    },
    grid: {
      borderColor: colors.grid,
      strokeDashArray: 3,
    },
    xaxis: {
      labels: {
        style: {
          colors: colors.mutedText,
          fontSize: "12px",
        },
      },
      axisBorder: {
        color: colors.border,
      },
      axisTicks: {
        color: colors.border,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: colors.mutedText,
          fontSize: "12px",
        },
      },
    },
    tooltip: {
      theme: mode,
      style: {
        fontSize: "12px",
      },
    },
  };

  return { isDark, mode, colors, apexOptions };
}

