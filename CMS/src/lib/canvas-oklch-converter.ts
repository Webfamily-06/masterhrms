/**
 * Mathematical CSS Color 4 (OKLCH, OKLab, color(srgb/display-p3)) to sRGB Converter
 * for Canvas / DOM export pipelines.
 */

export function oklchToRgb(l: number, c: number, h: number, a: number = 1): string {
  const hRad = (h * Math.PI) / 180;
  const aVal = c * Math.cos(hRad);
  const bVal = c * Math.sin(hRad);
  return oklabToRgb(l, aVal, bVal, a);
}

export function oklabToRgb(L: number, aVal: number, bVal: number, alpha: number = 1): string {
  const lPrime = L + 0.3963377774 * aVal + 0.2158037573 * bVal;
  const mPrime = L - 0.1055613458 * aVal - 0.0638541728 * bVal;
  const sPrime = L - 0.0894841775 * aVal - 1.2914855480 * bVal;

  const l3 = lPrime * lPrime * lPrime;
  const m3 = mPrime * mPrime * mPrime;
  const s3 = sPrime * sPrime * sPrime;

  const rLin = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  return linearRgbToCss(rLin, gLin, bLin, alpha);
}

function linearRgbToCss(rLin: number, gLin: number, bLin: number, alpha: number = 1): string {
  const toSrgb = (x: number): number => {
    const clamped = Math.max(0, Math.min(1, x));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const r = Math.round(toSrgb(rLin) * 255);
  const g = Math.round(toSrgb(gLin) * 255);
  const b = Math.round(toSrgb(bLin) * 255);
  return formatRgba(r, g, b, alpha);
}

function formatRgba(r: number, g: number, b: number, alpha: number = 1): string {
  const rc = Math.max(0, Math.min(255, Math.round(r)));
  const gc = Math.max(0, Math.min(255, Math.round(g)));
  const bc = Math.max(0, Math.min(255, Math.round(b)));
  if (alpha >= 0.999) {
    return `rgb(${rc}, ${gc}, ${bc})`;
  }
  const cleanAlpha = Math.max(0, Math.min(1, Math.round(alpha * 1000) / 1000));
  return `rgba(${rc}, ${gc}, ${bc}, ${cleanAlpha})`;
}

function parseAlphaToken(aStr?: string): number {
  if (!aStr || aStr === "none") return 1;
  const trimmed = aStr.trim();
  const val = parseFloat(trimmed);
  if (Number.isNaN(val)) return 1;
  return trimmed.endsWith("%") ? val / 100 : val;
}

function parseChannelToken(token: string, scaleIfPercent: number = 1): number {
  if (!token || token === "none") return 0;
  const trimmed = token.trim();
  const val = parseFloat(trimmed);
  if (Number.isNaN(val)) return 0;
  return trimmed.endsWith("%") ? (val / 100) * scaleIfPercent : val;
}

/**
 * Replaces oklch(...), oklab(...), and color(srgb / srgb-linear / display-p3 ...)
 * occurrences in a CSS string with standard rgb()/rgba().
 */
export function sanitizeOklchColorString(input: string): string {
  if (!input || typeof input !== "string") return input;
  if (!input.includes("oklch") && !input.includes("oklab") && !input.includes("color(")) {
    return input;
  }

  // 1. Match oklch(L C H [/ A]) including 'none' and signed angles
  let res = input.replace(
    /oklch\(\s*([^\s/)]+)\s+([^\s/)]+)\s+([^\s/)]+)(?:\s*\/\s*([^\s)]+))?\s*\)/gi,
    (_match, lStr, cStr, hStr, aStr) => {
      const l = parseChannelToken(lStr, 1);
      const c = parseChannelToken(cStr, 0.4);
      let h = 0;
      if (hStr && hStr !== "none") {
        h = parseFloat(hStr) || 0;
        if (hStr.endsWith("rad")) h = (h * 180) / Math.PI;
        else if (hStr.endsWith("turn")) h = h * 360;
        else if (hStr.endsWith("grad")) h = (h * 360) / 400;
      }
      const a = parseAlphaToken(aStr);
      return oklchToRgb(l, c, h, a);
    }
  );

  // 2. Match oklab(L a b [/ A])
  res = res.replace(
    /oklab\(\s*([^\s/)]+)\s+([^\s/)]+)\s+([^\s/)]+)(?:\s*\/\s*([^\s)]+))?\s*\)/gi,
    (_match, lStr, aStr, bStr, alphaStr) => {
      const l = parseChannelToken(lStr, 1);
      const aVal = parseChannelToken(aStr, 0.4);
      const bVal = parseChannelToken(bStr, 0.4);
      const alpha = parseAlphaToken(alphaStr);
      return oklabToRgb(l, aVal, bVal, alpha);
    }
  );

  // 3. Match color(srgb | srgb-linear | display-p3 r g b [/ a]) emitted by Chrome for color-mix()
  res = res.replace(
    /color\(\s*(srgb-linear|srgb|display-p3)\s+([^\s/)]+)\s+([^\s/)]+)\s+([^\s/)]+)(?:\s*\/\s*([^\s)]+))?\s*\)/gi,
    (_match, space, c1Str, c2Str, c3Str, alphaStr) => {
      const c1 = parseChannelToken(c1Str, 1);
      const c2 = parseChannelToken(c2Str, 1);
      const c3 = parseChannelToken(c3Str, 1);
      const alpha = parseAlphaToken(alphaStr);
      const sp = String(space).toLowerCase();
      if (sp === "srgb-linear") {
        return linearRgbToCss(c1, c2, c3, alpha);
      }
      // srgb and display-p3 (clamped to sRGB gamut)
      return formatRgba(c1 * 255, c2 * 255, c3 * 255, alpha);
    }
  );

  return res;
}

const CRITICAL_COLOR_PROPERTIES = [
  "color",
  "background-color",
  "background-image",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "box-shadow",
  "fill",
  "stroke",
  "stop-color",
  "flood-color",
] as const;

function hasUnsupportedColorFunction(val: string): boolean {
  return (
    Boolean(val) &&
    (val.includes("oklch") || val.includes("oklab") || val.includes("color(") || val.includes("color-mix"))
  );
}

/**
 * Sanitizes a cloned DOM tree for legacy canvas parsers while preserving the active
 * light/dark theme and avoiding destructive mutations on already-decoded images.
 */
export function sanitizeDocumentForCanvas(clonedDoc: Document, clonedEl: HTMLElement): void {
  const win = clonedDoc.defaultView || window;
  const isDark = clonedDoc.documentElement?.classList.contains("dark");

  const fallbackBg = isDark ? "#0b1120" : "#f8fafc";
  const fallbackFg = isDark ? "#f8fafc" : "#0f172a";

  if (clonedDoc.documentElement) {
    clonedDoc.documentElement.style.setProperty("background-color", fallbackBg);
    clonedDoc.documentElement.style.setProperty("color", fallbackFg);
  }
  if (clonedDoc.body) {
    clonedDoc.body.style.setProperty("background-color", fallbackBg);
    clonedDoc.body.style.setProperty("color", fallbackFg);
  }

  try {
    const rootComputed = win.getComputedStyle(clonedDoc.documentElement);
    for (let i = 0; i < rootComputed.length; i++) {
      const prop = rootComputed[i];
      if (prop.startsWith("--")) {
        const val = rootComputed.getPropertyValue(prop);
        if (hasUnsupportedColorFunction(val)) {
          const clean = sanitizeOklchColorString(val);
          clonedDoc.documentElement.style.setProperty(prop, clean);
          clonedDoc.body?.style.setProperty(prop, clean);
        }
      }
    }
  } catch {}

  const styleTags = clonedDoc.querySelectorAll("style");
  styleTags.forEach((styleTag) => {
    try {
      if (styleTag.textContent && hasUnsupportedColorFunction(styleTag.textContent)) {
        styleTag.textContent = sanitizeOklchColorString(styleTag.textContent);
      }
    } catch {}
  });

  const allElements = [
    clonedDoc.documentElement,
    ...(clonedDoc.body ? [clonedDoc.body] : []),
    clonedEl,
    ...Array.from(clonedDoc.querySelectorAll("*")),
  ] as HTMLElement[];

  const visited = new Set<HTMLElement>();
  allElements.forEach((el) => {
    if (!el || visited.has(el)) return;
    visited.add(el);

    const rawStyle = el.getAttribute("style");
    if (rawStyle && hasUnsupportedColorFunction(rawStyle)) {
      el.setAttribute("style", sanitizeOklchColorString(rawStyle));
    }

    const svgAttrs = ["fill", "stroke", "stop-color", "flood-color"];
    svgAttrs.forEach((attr) => {
      const val = el.getAttribute(attr);
      if (val && hasUnsupportedColorFunction(val)) {
        el.setAttribute(attr, sanitizeOklchColorString(val));
      }
    });

    try {
      const elWin = el.ownerDocument.defaultView || win;
      const computed = elWin.getComputedStyle(el);
      if (computed) {
        CRITICAL_COLOR_PROPERTIES.forEach((prop) => {
          const val = computed.getPropertyValue(prop);
          if (val && hasUnsupportedColorFunction(val)) {
            el.style.setProperty(prop, sanitizeOklchColorString(val), "important");
          }
        });
      }
    } catch {}
  });
}
