import { z } from "zod";

export type SettingScopeType = "PLATFORM" | "TENANT" | "USER";

export type SettingValueType =
  | "string"
  | "number"
  | "boolean"
  | "color"
  | "media"
  | "secret"
  | "json";

export interface SettingDefinition<T = any> {
  key: string;
  group: string;
  label: string;
  help?: string;
  type: SettingValueType;
  default: T;
  scopes: SettingScopeType[];
  isSecret?: boolean;
  validation?: (value: any) => { valid: boolean; error?: string };
  applyStrategy: "INSTANT" | "NEXT_REQUEST" | "NEEDS_RESTART";
  realtimeTopic?: string;
}

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const SETTINGS_REGISTRY: Record<string, SettingDefinition> = {
  // ─── Branding & Identity ───────────────────────────────────────
  "branding.app_name": {
    key: "branding.app_name",
    group: "branding",
    label: "Application Name",
    help: "Public display name of the platform shown in headers, page titles, and notification emails.",
    type: "string",
    default: "Master HRMS",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      if (typeof val !== "string" || val.trim().length === 0) {
        return { valid: false, error: "Application name is required" };
      }
      if (val.length > 100) {
        return { valid: false, error: "Application name cannot exceed 100 characters" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "branding.support_email": {
    key: "branding.support_email",
    group: "branding",
    label: "Support Email",
    help: "Contact email shown to users for support, helpdesk escalation, and inquiries.",
    type: "string",
    default: "support@masterhrms.com",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof val !== "string" || !emailRegex.test(val)) {
        return { valid: false, error: "Valid support email address is required" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "branding.primary_color": {
    key: "branding.primary_color",
    group: "branding",
    label: "Primary Accent Color",
    help: "Brand accent color used across buttons, active states, banners, and theme highlights.",
    type: "color",
    default: "#2563EB",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      if (typeof val !== "string" || !hexColorRegex.test(val)) {
        return { valid: false, error: "Must be a valid hex color code (e.g. #FF6B00 or #10B981)" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "branding.logo_light_id": {
    key: "branding.logo_light_id",
    group: "branding",
    label: "Light Theme Logo",
    help: "Logo displayed on dark navigation bars and headers in light mode.",
    type: "media",
    default: null,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "branding.logo_dark_id": {
    key: "branding.logo_dark_id",
    group: "branding",
    label: "Dark Theme Logo",
    help: "Logo displayed on light backgrounds and in dark mode.",
    type: "media",
    default: null,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "branding.favicon_id": {
    key: "branding.favicon_id",
    group: "branding",
    label: "Favicon",
    help: "Browser tab icon (32x32, 64x64, .ico or .png recommended).",
    type: "media",
    default: null,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "branding.footer_text": {
    key: "branding.footer_text",
    group: "branding",
    label: "Footer Copyright Text",
    help: "Copyright and legal disclaimer appearing in portals and transactional emails.",
    type: "string",
    default: "© 2026 Master HRMS. All rights reserved.",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      if (typeof val !== "string") return { valid: false, error: "Footer text must be string" };
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  // ─── Currency & Locale (Base defaults) ─────────────────────────
  "locale.default_currency": {
    key: "locale.default_currency",
    group: "locale",
    label: "Default Currency",
    help: "Default platform ISO currency code.",
    type: "string",
    default: "INR",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "locale.currency_symbol": {
    key: "locale.currency_symbol",
    group: "locale",
    label: "Currency Symbol",
    help: "Display symbol for primary currency.",
    type: "string",
    default: "₹",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "locale.timezone": {
    key: "locale.timezone",
    group: "locale",
    label: "System Timezone",
    help: "Standard timezone used for timestamps and scheduler.",
    type: "string",
    default: "Asia/Kolkata",
    scopes: ["PLATFORM", "TENANT", "USER"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "locale.date_format": {
    key: "locale.date_format",
    group: "locale",
    label: "Date Format",
    help: "Default display format for calendar dates.",
    type: "string",
    default: "DD/MM/YYYY",
    scopes: ["PLATFORM", "TENANT", "USER"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "locale.time_format": {
    key: "locale.time_format",
    group: "locale",
    label: "Time Format",
    help: "12-hour or 24-hour clock.",
    type: "string",
    default: "12",
    scopes: ["PLATFORM", "TENANT", "USER"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
};

export function getSettingDefinition(key: string): SettingDefinition | undefined {
  return SETTINGS_REGISTRY[key];
}

export function getGroupDefinitions(group: string): SettingDefinition[] {
  return Object.values(SETTINGS_REGISTRY).filter((def) => def.group === group);
}

export function validateSettingValue(key: string, value: any, scope?: SettingScopeType): { valid: boolean; error?: string } {
  const def = getSettingDefinition(key);
  if (!def) {
    return { valid: false, error: `Unrecognized setting key: ${key}` };
  }
  // Scope access check
  if (scope && !def.scopes.includes(scope)) {
    return { valid: false, error: `Setting '${key}' cannot be configured in '${scope}' scope` };
  }
  // In TENANT scope, setting value to null or empty string resets the override to platform default
  if (scope === "TENANT" && (value === null || value === undefined || value === "")) {
    return { valid: true };
  }
  // If the setting default is null and value is null, it's valid
  if (value === null && def.default === null) {
    return { valid: true };
  }
  if (def.validation) {
    return def.validation(value);
  }
  return { valid: true };
}
