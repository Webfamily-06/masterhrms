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
