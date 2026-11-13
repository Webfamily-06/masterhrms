/**
 * Mathematical OKLCH & OKLab to sRGB Converter for html2canvas & Canvas export.
 * Solves: "Attempting to parse an unsupported color function 'oklch'"
 * 
 * Works purely with standard colorimetry math (OKLCH -> OKLab -> LMS -> Linear sRGB -> Gamma sRGB)
 * without depending on browser Canvas context fillStyle (which preserves oklch in Chrome 120+).
 */

export function oklchToRgb(l: number, c: number, h: number, a: number = 1): string {
  // Convert hue degrees to radians
  const hRad = (h * Math.PI) / 180;
  const aVal = c * Math.cos(hRad);
  const bVal = c * Math.sin(hRad);

  return oklabToRgb(l, aVal, bVal, a);
}

export function oklabToRgb(L: number, aVal: number, bVal: number, alpha: number = 1): string {
  // Oklab -> LMS
  const lPrime = L + 0.3963377774 * aVal + 0.2158037573 * bVal;
  const mPrime = L - 0.1055613458 * aVal - 0.0638541728 * bVal;
  const sPrime = L - 0.0894841775 * aVal - 1.2914855480 * bVal;

  const l3 = lPrime * lPrime * lPrime;
  const m3 = mPrime * mPrime * mPrime;
  const s3 = sPrime * sPrime * sPrime;

  // LMS -> Linear sRGB
  const rLin = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  // Gamma correction to standard sRGB [0, 255]
  const toSrgb = (x: number): number => {
    const clamped = Math.max(0, Math.min(1, x));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const r = Math.round(toSrgb(rLin) * 255);
  const g = Math.round(toSrgb(gLin) * 255);
  const b = Math.round(toSrgb(bLin) * 255);

  if (alpha >= 0.999) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  const cleanAlpha = Math.max(0, Math.min(1, Math.round(alpha * 100) / 100));
  return `rgba(${r}, ${g}, ${b}, ${cleanAlpha})`;
}

/**
 * Replaces any oklch(...) or oklab(...) occurrences in a CSS string with rgb()/rgba()
 */
export function sanitizeOklchColorString(input: string): string {
  if (!input || typeof input !== "string") return input;
  if (!input.includes("oklch") && !input.includes("oklab")) return input;

  // 1. Match oklch(L C H [/ A])
  let res = input.replace(
    /oklch\(\s*([0-9.]+%?)\s+([0-9.]+%?)\s+([0-9.]+(?:deg|rad|turn|grad)?)(?:\s*(?:\/|\s)\s*([0-9.]+%?))?\s*\)/gi,
    (_match, lStr, cStr, hStr, aStr) => {
      let l = parseFloat(lStr);
      if (lStr.endsWith("%")) l = l / 100;

      let c = parseFloat(cStr);
      if (cStr.endsWith("%")) c = (c / 100) * 0.4;

      let h = parseFloat(hStr);
      if (hStr.endsWith("rad")) h = (h * 180) / Math.PI;
      else if (hStr.endsWith("turn")) h = h * 360;
      else if (hStr.endsWith("grad")) h = (h * 360) / 400;

      let a = 1;
      if (aStr) {
        a = parseFloat(aStr);
        if (aStr.endsWith("%")) a = a / 100;
      }

      return oklchToRgb(l, c, h, a);
    }
  );

  // 2. Match oklab(L a b [/ A])
  res = res.replace(
    /oklab\(\s*([0-9.]+%?)\s+([+-]?[0-9.]+%?)\s+([+-]?[0-9.]+%?)(?:\s*(?:\/|\s)\s*([0-9.]+%?))?\s*\)/gi,
    (_match, lStr, aStr, bStr, alphaStr) => {
      let l = parseFloat(lStr);
      if (lStr.endsWith("%")) l = l / 100;

      let aVal = parseFloat(aStr);
      if (aStr.endsWith("%")) aVal = (aVal / 100) * 0.4;

      let bVal = parseFloat(bStr);
      if (bStr.endsWith("%")) bVal = (bVal / 100) * 0.4;

      let alpha = 1;
      if (alphaStr) {
        alpha = parseFloat(alphaStr);
        if (alphaStr.endsWith("%")) alpha = alpha / 100;
      }

      return oklabToRgb(l, aVal, bVal, alpha);
    }
  );

  return res;
}

const CRITICAL_COLOR_PROPERTIES = [
  "color",
  "background-color",
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

/**
 * Prepares the cloned DOM inside html2canvas onclone hook:
 * 1. Explicitly sets documentElement and body background to #ffffff and text to #0f172a.
 * 2. Rewrites common CSS custom properties on documentElement/body so computed styles resolve to RGB.
 * 3. Rewrites all <style> blocks replacing oklch/oklab with sRGB.
 * 4. Rewrites inline styles and SVG presentation attributes across all elements.
 * 5. Inspects computed styles and embeds converted colors as explicit inline styles.
 * 6. Ensures image crossOrigin and decoding readiness.
 */
export function sanitizeDocumentForCanvas(clonedDoc: Document, clonedEl: HTMLElement): void {
  const win = clonedDoc.defaultView || window;

  // 1. Explicitly sanitize documentElement and body background & text colors
  if (clonedDoc.documentElement) {
    clonedDoc.documentElement.style.setProperty("background-color", "#ffffff", "important");
    clonedDoc.documentElement.style.setProperty("color", "#0f172a", "important");
  }
  if (clonedDoc.body) {
    clonedDoc.body.style.setProperty("background-color", "#ffffff", "important");
    clonedDoc.body.style.setProperty("color", "#0f172a", "important");
  }

  // 2. Normalize common Tailwind / Radix CSS variables on documentElement & body
  const commonThemeVars = [
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--primary",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--destructive",
    "--border",
    "--input",
    "--ring",
    "--sidebar-background",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-border",
    "--sidebar-ring",
  ];
  try {
    const rootComputed = win.getComputedStyle(clonedDoc.documentElement);
    commonThemeVars.forEach((cssVar) => {
      const val = rootComputed.getPropertyValue(cssVar);
      if (val && (val.includes("oklch") || val.includes("oklab"))) {
        const clean = sanitizeOklchColorString(val);
        clonedDoc.documentElement.style.setProperty(cssVar, clean);
        if (clonedDoc.body) {
          clonedDoc.body.style.setProperty(cssVar, clean);
        }
      }
    });
  } catch {}

  // 3. Sanitize all <style> blocks in the cloned document
  const styleTags = clonedDoc.querySelectorAll("style");
  styleTags.forEach((styleTag) => {
    try {
      if (styleTag.textContent && (styleTag.textContent.includes("oklch") || styleTag.textContent.includes("oklab"))) {
        styleTag.textContent = sanitizeOklchColorString(styleTag.textContent);
      }
    } catch {}
  });

  // 4. Traverse all elements in clonedDoc
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

    // A. Inline style attribute
    const rawStyle = el.getAttribute("style");
    if (rawStyle && (rawStyle.includes("oklch") || rawStyle.includes("oklab"))) {
      el.setAttribute("style", sanitizeOklchColorString(rawStyle));
    }

    // B. SVG attributes
    const svgAttrs = ["fill", "stroke", "stop-color", "flood-color"];
    svgAttrs.forEach((attr) => {
      const val = el.getAttribute(attr);
      if (val && (val.includes("oklch") || val.includes("oklab"))) {
        el.setAttribute(attr, sanitizeOklchColorString(val));
      }
    });

    // C. Computed styles inspection
    try {
      const elWin = el.ownerDocument.defaultView || win;
      const computed = elWin.getComputedStyle(el);
      if (computed) {
        CRITICAL_COLOR_PROPERTIES.forEach((prop) => {
          const val = computed.getPropertyValue(prop);
          if (val && (val.includes("oklch") || val.includes("oklab"))) {
            const cleanVal = sanitizeOklchColorString(val);
            el.style.setProperty(prop, cleanVal, "important");
          }
        });
      }
    } catch {}

    // D. Image cross-origin handling
    if (el.tagName && el.tagName.toLowerCase() === "img") {
      const img = el as HTMLImageElement;
      if (!img.crossOrigin && img.src && !img.src.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
    }
  });
}
