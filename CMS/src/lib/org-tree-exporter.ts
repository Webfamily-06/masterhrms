import { sanitizeDocumentForCanvas, sanitizeOklchColorString } from "./canvas-oklch-converter";

export interface OrgConnectorTreeNode {
  id: string;
  subordinates?: OrgConnectorTreeNode[];
}

export interface ConnectorGeometryResult {
  paths: string[];
  svgWidth: number;
  svgHeight: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null;
}

export interface ImageVerificationRecord {
  url: string;
  loaded: boolean;
  naturalWidth: number;
  naturalHeight: number;
}

export interface OrgTreeExportMetrics {
  format: "png" | "pdf";
  renderer: "svg-foreign-object" | "html2canvas-fallback";
  theme: "light" | "dark";
  stageWidth: number;
  stageHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  pixelRatio: number;
  pdfPages?: number;
  pdfPageWidthPt?: number;
  pdfPageHeightPt?: number;
  totalAvatars: number;
  loadedAvatars: number;
  failedAvatars: number;
  images: ImageVerificationRecord[];
  exportedCardCount: number;
  connectorPathCount: number;
}

const fontDataUrlCache = new Map<string, string>();

const UI_FONT_KEYWORDS = ["public sans", "inter", "geist", "plus jakarta", "roboto", "system-ui"];

/**
 * Computes exact unscaled connector SVG paths and container dimensions directly from
 * live DOM card positions, independent of CSS zoom/pan transforms or active transitions.
 */
export function computeConnectorGeometry(
  container: HTMLElement,
  nodes: OrgConnectorTreeNode[],
  collapsedNodes: Set<string>
): ConnectorGeometryResult {
  const containerRect = container.getBoundingClientRect();
  const actualScaleX =
    container.offsetWidth > 0 && containerRect.width > 0
      ? containerRect.width / container.offsetWidth
      : 1;
  const actualScaleY =
    container.offsetHeight > 0 && containerRect.height > 0
      ? containerRect.height / container.offsetHeight
      : 1;

  const svgWidth = Math.max(container.offsetWidth, container.scrollWidth, 1);
  const svgHeight = Math.max(container.offsetHeight, container.scrollHeight, 1);

  const paths: string[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const trackPoint = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  function traverse(node: OrgConnectorTreeNode) {
    if (collapsedNodes.has(node.id)) return;
    if (!node.subordinates || node.subordinates.length === 0) return;

    const parentEl = container.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(node.id)}"]`);
    if (!parentEl) return;

    const parentRect = parentEl.getBoundingClientRect();
    const parentX =
      (parentRect.left - containerRect.left) / actualScaleX +
      parentRect.width / (2 * actualScaleX);
    const parentBottom = (parentRect.bottom - containerRect.top) / actualScaleY;

    const visibleChildEls: Array<{ el: HTMLElement; node: OrgConnectorTreeNode }> = [];
    for (const sub of node.subordinates) {
      const childEl = container.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(sub.id)}"]`);
      if (childEl) {
        visibleChildEls.push({ el: childEl, node: sub });
      }
    }

    if (visibleChildEls.length === 0) return;

    const childCoords = visibleChildEls.map(({ el }) => {
      const r = el.getBoundingClientRect();
      return {
        x: (r.left - containerRect.left) / actualScaleX + r.width / (2 * actualScaleX),
        top: (r.top - containerRect.top) / actualScaleY,
      };
    });

    trackPoint(parentX, parentBottom);
    for (const c of childCoords) {
      trackPoint(c.x, c.top);
    }

    if (childCoords.length === 1) {
      const child = childCoords[0];
      if (Math.abs(parentX - child.x) < 2) {
        paths.push(
          `M ${parentX.toFixed(1)} ${parentBottom.toFixed(1)} L ${child.x.toFixed(1)} ${child.top.toFixed(1)}`
        );
      } else {
        const midY = (parentBottom + child.top) / 2;
        trackPoint(parentX, midY);
        trackPoint(child.x, midY);
        paths.push(
          `M ${parentX.toFixed(1)} ${parentBottom.toFixed(1)} V ${midY.toFixed(1)} H ${child.x.toFixed(1)} V ${child.top.toFixed(1)}`
        );
      }
    } else {
      const childMinX = Math.min(...childCoords.map((c) => c.x));
      const childMaxX = Math.max(...childCoords.map((c) => c.x));
      const minTop = Math.min(...childCoords.map((c) => c.top));
      const busY = parentBottom + Math.max(16, (minTop - parentBottom) / 2);

      const busLeft = Math.min(childMinX, parentX);
      const busRight = Math.max(childMaxX, parentX);

      trackPoint(busLeft, busY);
      trackPoint(busRight, busY);

      paths.push(`M ${parentX.toFixed(1)} ${parentBottom.toFixed(1)} V ${busY.toFixed(1)}`);
      paths.push(`M ${busLeft.toFixed(1)} ${busY.toFixed(1)} H ${busRight.toFixed(1)}`);
      for (const child of childCoords) {
        paths.push(`M ${child.x.toFixed(1)} ${busY.toFixed(1)} V ${child.top.toFixed(1)}`);
      }
    }

    for (const sub of node.subordinates) {
      traverse(sub);
    }
  }

  for (const root of nodes) {
    traverse(root);
  }

  return {
    paths,
    svgWidth,
    svgHeight,
    bounds: minX <= maxX && minY <= maxY ? { minX, minY, maxX, maxY } : null,
  };
}

function stripInvalidXmlChars(input: string): string {
  // Remove control characters disallowed in XML 1.0
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, "");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to encode blob as data URL"));
    };
    reader.onerror = () => reject(reader.error || new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

function normalizeSvgRootDimensions(svgText: string): string {
  const svgTagMatch = svgText.match(/<svg\b[^>]*>/i);
  if (!svgTagMatch) return svgText;
  const openTag = svgTagMatch[0];
  const hasNumericWidth = /\bwidth\s*=\s*["']\s*\d+(\.\d+)?(px)?\s*["']/i.test(openTag);
  const hasNumericHeight = /\bheight\s*=\s*["']\s*\d+(\.\d+)?(px)?\s*["']/i.test(openTag);
  if (hasNumericWidth && hasNumericHeight) return svgText;

  const viewBoxMatch = openTag.match(/\bviewBox\s*=\s*["']\s*[+-]?[\d.]+\s+[+-]?[\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  const vbW = viewBoxMatch ? Math.max(64, Math.round(parseFloat(viewBoxMatch[1]) || 256)) : 256;
  const vbH = viewBoxMatch ? Math.max(64, Math.round(parseFloat(viewBoxMatch[2]) || 256)) : 256;

  let updatedTag = openTag
    .replace(/\bwidth\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\bheight\s*=\s*["'][^"']*["']/gi, "");
  updatedTag = updatedTag.replace(/^<svg\b/i, `<svg width="${vbW}" height="${vbH}"`);
  return svgText.replace(openTag, updatedTag);
}

async function waitForImageElement(img: HTMLImageElement, timeoutMs: number = 5000): Promise<void> {
  if (!img.complete) {
    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(done, timeoutMs);
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  }
  if (typeof img.decode === "function" && img.naturalWidth > 0) {
    try {
      await img.decode();
    } catch {}
  }
}

async function loadImageFromSrc(src: string, crossOrigin?: string | null): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin !== undefined && crossOrigin !== null) {
      img.crossOrigin = crossOrigin;
    }
    const timer = setTimeout(() => {
      reject(new Error(`Image load timeout: ${src}`));
    }, 7000);

    img.onload = async () => {
      clearTimeout(timer);
      if (typeof img.decode === "function") {
        try {
          await img.decode();
        } catch {}
      }
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve(img);
      } else {
        reject(new Error(`Image decoded with zero dimensions: ${src}`));
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Image failed to load: ${src}`));
    };
    img.src = src;
  });
}

function renderImageToCoverDataUrl(
  img: HTMLImageElement,
  boxWidth: number,
  boxHeight: number,
  objectFit: string = "cover"
): string {
  const natW = img.naturalWidth || boxWidth;
  const natH = img.naturalHeight || boxHeight;
  const supersample = 4;
  const targetW = Math.max(64, Math.round(boxWidth * supersample));
  const targetH = Math.max(64, Math.round(boxHeight * supersample));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (objectFit === "contain") {
    const scale = Math.min(targetW / natW, targetH / natH);
    const dw = natW * scale;
    const dh = natH * scale;
    ctx.drawImage(img, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
  } else {
    // Exact CSS object-fit: cover center-crop math preserving original aspect ratio
    const srcRatio = natW / natH;
    const dstRatio = targetW / targetH;
    let sx = 0;
    let sy = 0;
    let sw = natW;
    let sh = natH;
    if (srcRatio > dstRatio) {
      sw = natH * dstRatio;
      sx = (natW - sw) / 2;
    } else if (srcRatio < dstRatio) {
      sh = natW / dstRatio;
      sy = (natH - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
  }

  return canvas.toDataURL("image/png");
}

interface ResolvedImageEntry {
  url: string;
  loaded: boolean;
  naturalWidth: number;
  naturalHeight: number;
  dataUrl: string | null;
}

async function resolveSingleImageToDataUrl(
  rawUrl: string,
  boxWidth: number,
  boxHeight: number,
  objectFit: string,
  liveImg?: HTMLImageElement | null
): Promise<ResolvedImageEntry> {
  const resolvedUrl = new URL(rawUrl, window.location.href).href;

  if (resolvedUrl.startsWith("data:")) {
    try {
      const decoded = await loadImageFromSrc(resolvedUrl);
      return {
        url: rawUrl,
        loaded: true,
        naturalWidth: decoded.naturalWidth,
        naturalHeight: decoded.naturalHeight,
        dataUrl: renderImageToCoverDataUrl(decoded, boxWidth, boxHeight, objectFit),
      };
    } catch {
      return { url: rawUrl, loaded: false, naturalWidth: 0, naturalHeight: 0, dataUrl: null };
    }
  }

  const isSameOrigin = resolvedUrl.startsWith(window.location.origin);

  // Strategy 1: Fetch raw bytes/SVG so we avoid any CORS canvas tainting and normalize SVG dimensions
  try {
    const resp = await fetch(resolvedUrl, {
      mode: isSameOrigin ? "same-origin" : "cors",
      credentials: isSameOrigin ? "include" : "omit",
      cache: "force-cache",
    });
    if (resp.ok) {
      const contentType = (resp.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("svg") || resolvedUrl.toLowerCase().includes("/svg")) {
        const rawSvg = await resp.text();
        if (rawSvg.includes("<svg")) {
          const normalizedSvg = normalizeSvgRootDimensions(stripInvalidXmlChars(rawSvg));
          const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizedSvg)}`;
          const decodedSvgImg = await loadImageFromSrc(svgDataUrl);
          const pngDataUrl = renderImageToCoverDataUrl(decodedSvgImg, boxWidth, boxHeight, objectFit);
          return {
            url: rawUrl,
            loaded: true,
            naturalWidth: decodedSvgImg.naturalWidth,
            naturalHeight: decodedSvgImg.naturalHeight,
            dataUrl: pngDataUrl,
          };
        }
      } else {
        const blob = await resp.blob();
        if (blob.size > 0) {
          const objectUrl = URL.createObjectURL(blob);
          try {
            const decodedImg = await loadImageFromSrc(objectUrl);
            const pngDataUrl = renderImageToCoverDataUrl(decodedImg, boxWidth, boxHeight, objectFit);
            return {
              url: rawUrl,
              loaded: true,
              naturalWidth: decodedImg.naturalWidth,
              naturalHeight: decodedImg.naturalHeight,
              dataUrl: pngDataUrl,
            };
          } finally {
            URL.revokeObjectURL(objectUrl);
          }
        }
      }
    }
  } catch {}

  // Strategy 2: Load via CORS-enabled Image element and decode()
  try {
    const corsImg = await loadImageFromSrc(resolvedUrl, "anonymous");
    const pngDataUrl = renderImageToCoverDataUrl(corsImg, boxWidth, boxHeight, objectFit);
    return {
      url: rawUrl,
      loaded: true,
      naturalWidth: corsImg.naturalWidth,
      naturalHeight: corsImg.naturalHeight,
      dataUrl: pngDataUrl,
    };
  } catch {}

  // Strategy 3: Use already-decoded same-origin live DOM image if valid
  if (liveImg && liveImg.complete && liveImg.naturalWidth > 0 && liveImg.naturalHeight > 0) {
    try {
      const pngDataUrl = renderImageToCoverDataUrl(liveImg, boxWidth, boxHeight, objectFit);
      if (pngDataUrl) {
        return {
          url: rawUrl,
          loaded: true,
          naturalWidth: liveImg.naturalWidth,
          naturalHeight: liveImg.naturalHeight,
          dataUrl: pngDataUrl,
        };
      }
    } catch {}
  }

  return {
    url: rawUrl,
    loaded: false,
    naturalWidth: 0,
    naturalHeight: 0,
    dataUrl: null,
  };
}

/**
 * Waits for all images in the live export target to load and decode, verifies
 * naturalWidth/naturalHeight, resolves avatar sources to aspect-ratio-accurate
 * PNG data URLs, and maps them cleanly onto the cloned subtree.
 */
async function prepareAndApplyExportImages(
  sourceRoot: HTMLElement,
  clonedRoot: HTMLElement
): Promise<{
  totalAvatars: number;
  loadedAvatars: number;
  failedAvatars: number;
  images: ImageVerificationRecord[];
}> {
  // 1. Wait for all currently mounted <img> elements inside sourceRoot to finish loading & decoding
  const liveImgs = Array.from(sourceRoot.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(liveImgs.map((img) => waitForImageElement(img, 5000)));

  const resolvedMap = new Map<string, ResolvedImageEntry>();
  const verificationRecords: ImageVerificationRecord[] = [];

  // 2. Inspect all [data-avatar-url] avatar slots (covers both loaded <img> and newly-expanded Radix Avatars)
  const sourceAvatars = Array.from(sourceRoot.querySelectorAll<HTMLElement>("[data-avatar-url]"));
  const clonedAvatars = Array.from(clonedRoot.querySelectorAll<HTMLElement>("[data-avatar-url]"));

  let totalAvatars = 0;
  let loadedAvatars = 0;
  let failedAvatars = 0;

  for (let i = 0; i < sourceAvatars.length; i++) {
    const srcAvatar = sourceAvatars[i];
    const cloneAvatar = clonedAvatars[i];
    const avatarUrl = (srcAvatar.getAttribute("data-avatar-url") || "").trim();
    if (!avatarUrl || !cloneAvatar) continue;

    totalAvatars++;
    const liveImg = srcAvatar.querySelector<HTMLImageElement>("img");
    const boxW = srcAvatar.clientWidth || 36;
    const boxH = srcAvatar.clientHeight || 36;
    const cacheKey = `${avatarUrl}::${boxW}x${boxH}::cover`;

    let entry = resolvedMap.get(cacheKey);
    if (!entry) {
      entry = await resolveSingleImageToDataUrl(avatarUrl, boxW, boxH, "cover", liveImg);
      resolvedMap.set(cacheKey, entry);
      verificationRecords.push({
        url: avatarUrl,
        loaded: entry.loaded,
        naturalWidth: entry.naturalWidth,
        naturalHeight: entry.naturalHeight,
      });
    }

    if (entry.loaded && entry.dataUrl) {
      loadedAvatars++;
      const existingCloneImg = cloneAvatar.querySelector<HTMLImageElement>("img");
      if (existingCloneImg) {
        existingCloneImg.removeAttribute("srcset");
        existingCloneImg.removeAttribute("crossorigin");
        existingCloneImg.removeAttribute("loading");
        existingCloneImg.src = entry.dataUrl;
        existingCloneImg.style.width = "100%";
        existingCloneImg.style.height = "100%";
        existingCloneImg.style.objectFit = "cover";
        existingCloneImg.style.display = "block";
      } else {
        // Node was just expanded and Radix Avatar hadn't swapped Fallback -> Image yet
        cloneAvatar.innerHTML = "";
        const injectedImg = clonedRoot.ownerDocument.createElement("img");
        injectedImg.src = entry.dataUrl;
        injectedImg.alt = srcAvatar.getAttribute("data-avatar-alt") || "";
        injectedImg.className = "aspect-square h-full w-full object-cover";
        injectedImg.style.width = "100%";
        injectedImg.style.height = "100%";
        injectedImg.style.objectFit = "cover";
        injectedImg.style.display = "block";
        cloneAvatar.appendChild(injectedImg);
      }
    } else {
      // Image genuinely failed: ensure broken <img> is removed and fallback initials render cleanly
      failedAvatars++;
      const brokenImgs = Array.from(cloneAvatar.querySelectorAll("img"));
      brokenImgs.forEach((b) => b.remove());
      if (!cloneAvatar.textContent?.trim()) {
        const initials = srcAvatar.getAttribute("data-avatar-initials") || "?";
        const fbSpan = clonedRoot.ownerDocument.createElement("span");
        fbSpan.className =
          "flex h-full w-full items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs select-none";
        fbSpan.textContent = initials;
        cloneAvatar.appendChild(fbSpan);
      }
    }
  }

  // 3. Inline any remaining standalone <img> elements outside [data-avatar-url]
  const remainingCloneImgs = Array.from(clonedRoot.querySelectorAll<HTMLImageElement>("img")).filter(
    (img) => !img.closest("[data-avatar-url]")
  );
  const remainingSrcImgs = Array.from(sourceRoot.querySelectorAll<HTMLImageElement>("img")).filter(
    (img) => !img.closest("[data-avatar-url]")
  );

  for (let i = 0; i < remainingCloneImgs.length; i++) {
    const cImg = remainingCloneImgs[i];
    const sImg = remainingSrcImgs[i];
    const src = (sImg?.currentSrc || sImg?.src || cImg.getAttribute("src") || "").trim();
    if (!src || src.startsWith("data:")) continue;

    const boxW = sImg?.clientWidth || cImg.width || 36;
    const boxH = sImg?.clientHeight || cImg.height || 36;
    const fit = sImg ? window.getComputedStyle(sImg).objectFit || "cover" : "cover";
    const entry = await resolveSingleImageToDataUrl(src, boxW, boxH, fit, sImg);
    cImg.removeAttribute("srcset");
    cImg.removeAttribute("crossorigin");
    cImg.removeAttribute("loading");
    if (entry.loaded && entry.dataUrl) {
      cImg.src = entry.dataUrl;
    } else {
      cImg.remove();
    }
  }

  return {
    totalAvatars,
    loadedAvatars,
    failedAvatars,
    images: verificationRecords,
  };
}

async function resolveFontUrlsInRule(cssText: string, baseHref: string): Promise<string> {
  const lower = cssText.toLowerCase();
  const matchesUiFont = UI_FONT_KEYWORDS.some((kw) => lower.includes(kw));
  if (!matchesUiFont) {
    // Strip external icon-font URLs unused by the org tree so SVG stays lightweight & taint-free
    return "";
  }

  const urlRegex = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  const matches = Array.from(cssText.matchAll(urlRegex));
  if (matches.length === 0) return cssText;

  let updated = cssText;
  for (const m of matches) {
    const fullMatch = m[0];
    const rawUrl = m[2].trim();
    if (!rawUrl || rawUrl.startsWith("data:")) continue;

    let absUrl: string;
    try {
      absUrl = new URL(rawUrl, baseHref).href;
    } catch {
      continue;
    }

    let dataUrl = fontDataUrlCache.get(absUrl);
    if (!dataUrl) {
      try {
        const resp = await fetch(absUrl, { cache: "force-cache" });
        if (resp.ok) {
          const blob = await resp.blob();
          dataUrl = await blobToDataUrl(blob);
          fontDataUrlCache.set(absUrl, dataUrl);
        }
      } catch {}
    }

    if (dataUrl) {
      updated = updated.split(fullMatch).join(`url("${dataUrl}")`);
    } else {
      updated = updated.split(fullMatch).join("local('sans-serif')");
    }
  }

  return updated;
}

function stripExternalUrlsFromCssRule(cssText: string): string {
  if (!cssText.includes("url(")) return cssText;
  return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, _q, urlVal: string) => {
    const trimmed = urlVal.trim();
    if (trimmed.startsWith("data:") || trimmed.startsWith("#")) {
      return full;
    }
    return "none";
  });
}

async function collectSelfContainedStyles(doc: Document): Promise<string> {
  const chunks: string[] = [];
  const sheets = Array.from(doc.styleSheets);

  for (const sheet of sheets) {
    const baseHref = sheet.href || doc.location.href;
    let rules: CSSRule[] = [];
    try {
      rules = Array.from(sheet.cssRules || []);
    } catch {
      // Cross-origin stylesheet fallback
      if (sheet.href) {
        try {
          const resp = await fetch(sheet.href, { mode: "cors", cache: "force-cache" });
          if (resp.ok) {
            const rawCss = await resp.text();
            chunks.push(stripExternalUrlsFromCssRule(rawCss));
          }
        } catch {}
      }
      continue;
    }

    for (const rule of rules) {
      if (rule.type === CSSRule.FONT_FACE_RULE) {
        const inlinedFontRule = await resolveFontUrlsInRule(rule.cssText, baseHref);
        if (inlinedFontRule) chunks.push(inlinedFontRule);
      } else {
        let text = rule.cssText;
        if (text.includes(":root")) {
          text = text.replace(/:root(?![a-zA-Z0-9_-])/g, ":root, .org-export-stage");
        }
        chunks.push(stripExternalUrlsFromCssRule(text));
      }
    }
  }

  chunks.push(`
    .org-export-stage, .org-export-stage * {
      transition: none !important;
      animation: none !important;
    }
  `);

  return stripInvalidXmlChars(chunks.join("\n"));
}

function collectRootCssVariables(doc: Document): string {
  const pairs: string[] = [];
  const seen = new Set<string>();

  const extractFrom = (el: HTMLElement | null) => {
    if (!el) return;
    const computed = window.getComputedStyle(el);
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      if (prop.startsWith("--") && !seen.has(prop)) {
        const val = computed.getPropertyValue(prop).trim();
        if (val) {
          seen.add(prop);
          pairs.push(`${prop}: ${val};`);
        }
      }
    }
  };

  // Prefer body overrides first, then documentElement
  extractFrom(doc.body);
  extractFrom(doc.documentElement);

  return pairs.join(" ");
}

interface UnscaledBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function measureCompleteContentBounds(
  sourceRoot: HTMLElement,
  connectorBounds: ConnectorGeometryResult["bounds"]
): {
  sourceWidth: number;
  sourceHeight: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cardBoxes: UnscaledBox[];
} {
  const rootRect = sourceRoot.getBoundingClientRect();
  const scaleX =
    sourceRoot.offsetWidth > 0 && rootRect.width > 0 ? rootRect.width / sourceRoot.offsetWidth : 1;
  const scaleY =
    sourceRoot.offsetHeight > 0 && rootRect.height > 0
      ? rootRect.height / sourceRoot.offsetHeight
      : 1;

  const sourceWidth = Math.max(sourceRoot.offsetWidth, sourceRoot.scrollWidth, 1);
  const sourceHeight = Math.max(sourceRoot.offsetHeight, sourceRoot.scrollHeight, 1);

  const cardNodes = Array.from(
    sourceRoot.querySelectorAll<HTMLElement>(
      "[data-node-id], [data-dept-card], [data-dept-root], [data-orphan-badge]"
    )
  );

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const cardBoxes: UnscaledBox[] = [];

  for (const el of cardNodes) {
    const r = el.getBoundingClientRect();
    const left = (r.left - rootRect.left) / scaleX;
    const top = (r.top - rootRect.top) / scaleY;
    const right = left + r.width / scaleX;
    const bottom = top + r.height / scaleY;

    cardBoxes.push({ left, top, right, bottom });

    // Include 8px margin around cards to preserve -top-1.5 / -bottom-1.5 anchor dots and box-shadows
    if (left - 8 < minX) minX = left - 8;
    if (top - 8 < minY) minY = top - 8;
    if (right + 8 > maxX) maxX = right + 8;
    if (bottom + 8 > maxY) maxY = bottom + 8;
  }

  if (connectorBounds) {
    if (connectorBounds.minX - 4 < minX) minX = connectorBounds.minX - 4;
    if (connectorBounds.minY - 4 < minY) minY = connectorBounds.minY - 4;
    if (connectorBounds.maxX + 4 > maxX) maxX = connectorBounds.maxX + 4;
    if (connectorBounds.maxY + 4 > maxY) maxY = connectorBounds.maxY + 4;
  }

  if (minX > maxX || minY > maxY) {
    minX = 0;
    minY = 0;
    maxX = sourceWidth;
    maxY = sourceHeight;
  }

  return { sourceWidth, sourceHeight, minX, minY, maxX, maxY, cardBoxes };
}

/**
 * Finds split positions along an axis that fall strictly in gaps between cards
 * so multi-page PDF pagination never slices an employee card in half.
 */
function computeCardSafeSplitPoints(
  totalLength: number,
  maxSliceLength: number,
  intervals: Array<{ start: number; end: number }>
): number[] {
  if (totalLength <= maxSliceLength) return [0, totalLength];

  const cuts: number[] = [0];
  let cursor = 0;

  while (cursor + maxSliceLength < totalLength) {
    const target = cursor + maxSliceLength;
    const minCandidate = cursor + maxSliceLength * 0.45;

    // Candidate midpoints in gaps before `target`
    const sorted = intervals
      .filter((iv) => iv.end > cursor && iv.start < target)
      .sort((a, b) => a.start - b.start);

    // Merge overlapping intervals
    const merged: Array<{ start: number; end: number }> = [];
    for (const iv of sorted) {
      if (merged.length === 0 || iv.start > merged[merged.length - 1].end) {
        merged.push({ start: iv.start, end: iv.end });
      } else {
        merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, iv.end);
      }
    }

    let chosenCut: number | null = null;
    // Check if `target` itself is not inside any merged card interval
    const straddling = merged.find((iv) => iv.start < target && iv.end > target);
    if (!straddling) {
      chosenCut = target;
    } else if (straddling.start - 12 >= minCandidate) {
      chosenCut = Math.floor(straddling.start - 12);
    } else {
      // Search backward through gaps between merged intervals
      for (let i = merged.length - 1; i > 0; i--) {
        const gapMid = (merged[i - 1].end + merged[i].start) / 2;
        if (gapMid >= minCandidate && gapMid < target) {
          chosenCut = Math.floor(gapMid);
          break;
        }
      }
    }

    const nextCut = chosenCut && chosenCut > cursor + 100 ? chosenCut : target;
    cuts.push(nextCut);
    cursor = nextCut;
  }

  cuts.push(totalLength);
  return cuts;
}

export interface ExportOrgTreeOptions {
  format: "png" | "pdf";
  sourceRoot: HTMLElement;
  treeContainerEl: HTMLElement | null;
  canvasViewportEl: HTMLElement | null;
  orgChartNodes: OrgConnectorTreeNode[];
}

export async function exportOrganizationTreeVisual(
  options: ExportOrgTreeOptions
): Promise<OrgTreeExportMetrics> {
  const { format, sourceRoot, treeContainerEl, canvasViewportEl, orgChartNodes } = options;
  const doc = sourceRoot.ownerDocument;

  if ((doc as any).fonts?.ready) {
    try {
      await (doc as any).fonts.ready;
    } catch {}
  }

  const isDark = doc.documentElement.classList.contains("dark");
  const stageBg = isDark ? "#0b1120" : "#f8fafc";
  const dotColor = isDark ? "#334155" : "#cbd5e1";

  // 1. Compute exact unscaled connector geometry for the expanded tree
  const connectorGeometry =
    treeContainerEl && orgChartNodes.length > 0
      ? computeConnectorGeometry(treeContainerEl, orgChartNodes, new Set())
      : null;

  // Compute connector bounds relative to sourceRoot (in case sourceRoot wraps treeContainerEl + orphans)
  let rootRelativeConnectorBounds: ConnectorGeometryResult["bounds"] = null;
  if (connectorGeometry?.bounds && treeContainerEl) {
    const rootRect = sourceRoot.getBoundingClientRect();
    const treeRect = treeContainerEl.getBoundingClientRect();
    const sx =
      sourceRoot.offsetWidth > 0 && rootRect.width > 0 ? rootRect.width / sourceRoot.offsetWidth : 1;
    const sy =
      sourceRoot.offsetHeight > 0 && rootRect.height > 0
        ? rootRect.height / sourceRoot.offsetHeight
        : 1;
    const dx = (treeRect.left - rootRect.left) / sx;
    const dy = (treeRect.top - rootRect.top) / sy;
    rootRelativeConnectorBounds = {
      minX: connectorGeometry.bounds.minX + dx,
      minY: connectorGeometry.bounds.minY + dy,
      maxX: connectorGeometry.bounds.maxX + dx,
      maxY: connectorGeometry.bounds.maxY + dy,
    };
  }

  // 2. Measure exact unscaled complete tree bounds
  const { sourceWidth, sourceHeight, minX, minY, maxX, maxY, cardBoxes } =
    measureCompleteContentBounds(sourceRoot, rootRelativeConnectorBounds);

  const EXPORT_PADDING = 36;
  const stageWidth = Math.ceil(maxX - minX + EXPORT_PADDING * 2);
  const stageHeight = Math.ceil(maxY - minY + EXPORT_PADDING * 2);
  const offsetX = Math.round(EXPORT_PADDING - minX);
  const offsetY = Math.round(EXPORT_PADDING - minY);

  // 3. Clone sourceRoot without touching live DOM
  const clonedRoot = sourceRoot.cloneNode(true) as HTMLElement;
  clonedRoot.style.width = `${sourceWidth}px`;
  clonedRoot.style.height = `${sourceHeight}px`;
  clonedRoot.style.minWidth = `${sourceWidth}px`;
  clonedRoot.style.maxWidth = "none";
  clonedRoot.style.margin = "0";
  clonedRoot.style.transform = "none";
  clonedRoot.style.overflow = "visible";

  // Preserve exact multi-column grid widths in Department View regardless of stageWidth
  const liveGrids = Array.from(sourceRoot.querySelectorAll<HTMLElement>("[data-dept-grid]"));
  const clonedGrids = Array.from(clonedRoot.querySelectorAll<HTMLElement>("[data-dept-grid]"));
  liveGrids.forEach((lg, idx) => {
    const cg = clonedGrids[idx];
    if (cg) {
      const cs = window.getComputedStyle(lg);
      cg.style.gridTemplateColumns = cs.gridTemplateColumns;
      cg.style.width = `${lg.offsetWidth}px`;
    }
  });

  // 4. Synchronize SVG connector paths & explicit viewBox/stroke inside the cloned tree container
  let connectorPathCount = 0;
  if (connectorGeometry && treeContainerEl) {
    const clonedTreeContainer =
      sourceRoot === treeContainerEl
        ? clonedRoot
        : clonedRoot.querySelector<HTMLElement>("[data-tree-container]") || clonedRoot;

    // Read exact live stroke color from rendered path so theme stroke opacity is preserved
    const livePath = treeContainerEl.querySelector<SVGPathElement>("svg[data-tree-connectors] path");
    let resolvedStroke = isDark ? "rgba(129, 140, 248, 0.8)" : "rgba(99, 102, 241, 0.8)";
    if (livePath) {
      const liveStroke = window.getComputedStyle(livePath).stroke;
      if (liveStroke && liveStroke !== "none") {
        resolvedStroke = sanitizeOklchColorString(liveStroke);
      }
    }

    let clonedSvg = clonedTreeContainer.querySelector<SVGSVGElement>("svg[data-tree-connectors]");
    if (!clonedSvg && connectorGeometry.paths.length > 0) {
      clonedSvg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
      clonedSvg.setAttribute("data-tree-connectors", "true");
      clonedTreeContainer.insertBefore(clonedSvg, clonedTreeContainer.firstChild);
    }

    if (clonedSvg) {
      clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clonedSvg.setAttribute("width", String(connectorGeometry.svgWidth));
      clonedSvg.setAttribute("height", String(connectorGeometry.svgHeight));
      clonedSvg.setAttribute(
        "viewBox",
        `0 0 ${connectorGeometry.svgWidth} ${connectorGeometry.svgHeight}`
      );
      clonedSvg.setAttribute("overflow", "visible");
      clonedSvg.style.position = "absolute";
      clonedSvg.style.top = "0";
      clonedSvg.style.left = "0";
      clonedSvg.style.width = `${connectorGeometry.svgWidth}px`;
      clonedSvg.style.height = `${connectorGeometry.svgHeight}px`;
      clonedSvg.style.overflow = "visible";
      clonedSvg.style.pointerEvents = "none";
      clonedSvg.style.zIndex = "0";

      clonedSvg.innerHTML = "";
      for (const d of connectorGeometry.paths) {
        const pathEl = doc.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", d);
        pathEl.setAttribute("fill", "none");
        pathEl.setAttribute("stroke", resolvedStroke);
        pathEl.setAttribute("stroke-width", "2");
        pathEl.setAttribute("stroke-linecap", "round");
        pathEl.setAttribute("stroke-linejoin", "round");
        clonedSvg.appendChild(pathEl);
      }
      connectorPathCount = connectorGeometry.paths.length;
    }
  }

  // 5. Verify, decode, and inline all employee profile photos and icons as aspect-ratio-accurate PNG data URLs
  const imageStats = await prepareAndApplyExportImages(sourceRoot, clonedRoot);

  // 6. Determine safe HiDPI pixel ratio (target 2x–2.5x, capped safely below browser canvas memory limits)
  const MAX_CANVAS_SIDE = 12288;
  const MAX_CANVAS_AREA = 67_108_864; // 8192 x 8192
  const desiredScale = Math.max(2, Math.min(2.5, window.devicePixelRatio || 2));
  const pixelRatio = Math.max(
    1,
    Math.min(
      desiredScale,
      MAX_CANVAS_SIDE / stageWidth,
      MAX_CANVAS_SIDE / stageHeight,
      Math.sqrt(MAX_CANVAS_AREA / (stageWidth * stageHeight))
    )
  );

  const canvasWidth = Math.max(1, Math.round(stageWidth * pixelRatio));
  const canvasHeight = Math.max(1, Math.round(stageHeight * pixelRatio));

  let exportCanvas: HTMLCanvasElement | null = null;
  let rendererUsed: "svg-foreign-object" | "html2canvas-fallback" = "svg-foreign-object";

  // 7. Primary High-Fidelity Renderer: Browser-Native SVG <foreignObject> with Embedded Fonts & Styles
  try {
    const embeddedCss = await collectSelfContainedStyles(doc);
    const rootCssVars = collectRootCssVariables(doc);
    const htmlClass = doc.documentElement.className || "";
    const bodyFont = window.getComputedStyle(doc.body).fontFamily;

    const svgNS = "http://www.w3.org/2000/svg";
    const svgEl = doc.createElementNS(svgNS, "svg");
    svgEl.setAttribute("xmlns", svgNS);
    svgEl.setAttribute("width", String(stageWidth));
    svgEl.setAttribute("height", String(stageHeight));
    svgEl.setAttribute("viewBox", `0 0 ${stageWidth} ${stageHeight}`);

    const defsEl = doc.createElementNS(svgNS, "defs");
    const styleEl = doc.createElementNS(svgNS, "style");
    styleEl.textContent = embeddedCss;
    defsEl.appendChild(styleEl);
    svgEl.appendChild(defsEl);

    const foreignObj = doc.createElementNS(svgNS, "foreignObject");
    foreignObj.setAttribute("x", "0");
    foreignObj.setAttribute("y", "0");
    foreignObj.setAttribute("width", String(stageWidth));
    foreignObj.setAttribute("height", String(stageHeight));

    const stageDiv = doc.createElement("div");
    stageDiv.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    stageDiv.className = `org-export-stage ${htmlClass} font-sans`.trim();
    stageDiv.style.cssText = [
      rootCssVars,
      `position: relative`,
      `width: ${stageWidth}px`,
      `height: ${stageHeight}px`,
      `overflow: hidden`,
      `box-sizing: border-box`,
      `font-family: ${bodyFont}`,
      `color-scheme: ${isDark ? "dark" : "light"}`,
      `background-color: ${stageBg}`,
      `background-image: radial-gradient(${dotColor} 1px, transparent 1px)`,
      `background-size: 24px 24px`,
      `-webkit-font-smoothing: antialiased`,
    ].join("; ");

    if (canvasViewportEl) {
      const vpBg = sanitizeOklchColorString(window.getComputedStyle(canvasViewportEl).backgroundColor);
      if (vpBg && vpBg !== "rgba(0, 0, 0, 0)" && vpBg !== "transparent") {
        // Blend subtle viewport tint cleanly over solid theme base
        const tintLayer = doc.createElement("div");
        tintLayer.style.cssText = `position:absolute;inset:0;background-color:${vpBg};pointer-events:none;z-index:0;`;
        stageDiv.appendChild(tintLayer);
      }
    }

    const innerStage = doc.createElement("div");
    innerStage.style.cssText = [
      `position: absolute`,
      `left: ${offsetX}px`,
      `top: ${offsetY}px`,
      `width: ${sourceWidth}px`,
      `height: ${sourceHeight}px`,
      `overflow: visible`,
      `z-index: 1`,
    ].join("; ");
    innerStage.appendChild(clonedRoot);
    stageDiv.appendChild(innerStage);

    foreignObj.appendChild(stageDiv);
    svgEl.appendChild(foreignObj);

    const serializedSvg = stripInvalidXmlChars(new XMLSerializer().serializeToString(svgEl));
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializedSvg)}`;

    const rasterImg = await loadImageFromSrc(svgDataUrl);
    const canvas = doc.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to initialize 2D canvas context");

    ctx.fillStyle = stageBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(rasterImg, 0, 0, canvasWidth, canvasHeight);

    // Verify canvas is non-tainted
    canvas.toDataURL("image/png", 0.1);
    exportCanvas = canvas;
  } catch (svgErr) {
    console.warn("SVG foreignObject export encountered fallback condition:", svgErr);
    rendererUsed = "html2canvas-fallback";
    exportCanvas = await renderHtml2CanvasFallback(
      doc,
      clonedRoot,
      stageWidth,
      stageHeight,
      offsetX,
      offsetY,
      sourceWidth,
      sourceHeight,
      pixelRatio,
      stageBg,
      dotColor
    );
  }

  const exportedCardCount = clonedRoot.querySelectorAll("[data-node-id], [data-dept-card]").length;
  const dateStamp = new Date().toISOString().slice(0, 10);

  let pdfPages: number | undefined;
  let pdfPageWidthPt: number | undefined;
  let pdfPageHeightPt: number | undefined;

  if (format === "png") {
    const blob = await new Promise<Blob | null>((resolve) =>
      exportCanvas!.toBlob((b) => resolve(b), "image/png")
    );
    const url = blob ? URL.createObjectURL(blob) : exportCanvas.toDataURL("image/png");
    const link = doc.createElement("a");
    link.download = `organization-tree-${dateStamp}.png`;
    link.href = url;
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
    if (blob) {
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  } else {
    const pdfResult = await saveCanvasAsFidelityPdf(
      exportCanvas,
      stageWidth,
      stageHeight,
      offsetX,
      offsetY,
      cardBoxes,
      isDark,
      stageBg,
      `organization-tree-${dateStamp}.pdf`
    );
    pdfPages = pdfResult.pages;
    pdfPageWidthPt = pdfResult.pageWidthPt;
    pdfPageHeightPt = pdfResult.pageHeightPt;
  }

  const metrics: OrgTreeExportMetrics = {
    format,
    renderer: rendererUsed,
    theme: isDark ? "dark" : "light",
    stageWidth,
    stageHeight,
    canvasWidth: exportCanvas.width,
    canvasHeight: exportCanvas.height,
    pixelRatio,
    pdfPages,
    pdfPageWidthPt,
    pdfPageHeightPt,
    totalAvatars: imageStats.totalAvatars,
    loadedAvatars: imageStats.loadedAvatars,
    failedAvatars: imageStats.failedAvatars,
    images: imageStats.images,
    exportedCardCount,
    connectorPathCount,
  };

  if (typeof window !== "undefined") {
    (window as any).__LAST_ORG_EXPORT_METRICS__ = metrics;
  }

  return metrics;
}

async function renderHtml2CanvasFallback(
  doc: Document,
  clonedRoot: HTMLElement,
  stageWidth: number,
  stageHeight: number,
  offsetX: number,
  offsetY: number,
  sourceWidth: number,
  sourceHeight: number,
  pixelRatio: number,
  stageBg: string,
  dotColor: string
): Promise<HTMLCanvasElement> {
  const host = doc.createElement("div");
  host.style.cssText = [
    `position: fixed`,
    `left: -99999px`,
    `top: 0`,
    `width: ${stageWidth}px`,
    `height: ${stageHeight}px`,
    `background-color: ${stageBg}`,
    `background-image: radial-gradient(${dotColor} 1px, transparent 1px)`,
    `background-size: 24px 24px`,
    `overflow: hidden`,
    `z-index: -1`,
    `pointer-events: none`,
  ].join("; ");

  const inner = doc.createElement("div");
  inner.style.cssText = `position:absolute;left:${offsetX}px;top:${offsetY}px;width:${sourceWidth}px;height:${sourceHeight}px;overflow:visible;`;
  inner.appendChild(clonedRoot);
  host.appendChild(inner);
  doc.body.appendChild(host);

  try {
    const html2canvasMod = await import("html2canvas");
    const html2canvas = html2canvasMod.default || html2canvasMod;
    return await html2canvas(host, {
      scale: pixelRatio,
      useCORS: true,
      allowTaint: false,
      backgroundColor: stageBg,
      width: stageWidth,
      height: stageHeight,
      windowWidth: Math.max(stageWidth, window.innerWidth),
      windowHeight: Math.max(stageHeight, window.innerHeight),
      logging: false,
      onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
        sanitizeDocumentForCanvas(clonedDoc, clonedEl);
      },
    });
  } finally {
    host.remove();
  }
}

async function saveCanvasAsFidelityPdf(
  canvas: HTMLCanvasElement,
  stageWidth: number,
  stageHeight: number,
  offsetX: number,
  offsetY: number,
  cardBoxes: UnscaledBox[],
  isDark: boolean,
  stageBg: string,
  filename: string
): Promise<{ pages: number; pageWidthPt: number; pageHeightPt: number }> {
  const { jsPDF } = await import("jspdf");

  const PX_TO_PT = 0.75; // Standard 96 CSS dpi -> 72 PDF pt/inch
  const MARGIN_PT = 24;
  const HEADER_PT = 34;
  const MAX_SINGLE_PAGE_PT = 12000; // Safely within PDF 14,400 pt architectural limit

  const contentWidthPt = Math.round(stageWidth * PX_TO_PT);
  const contentHeightPt = Math.round(stageHeight * PX_TO_PT);

  const desiredPageWidthPt = Math.max(595, contentWidthPt + MARGIN_PT * 2);
  const desiredPageHeightPt = Math.max(420, contentHeightPt + MARGIN_PT * 2 + HEADER_PT);

  const bgRgb = isDark ? [11, 17, 32] : [248, 250, 252];
  const titleRgb = isDark ? [241, 245, 249] : [15, 23, 42];
  const metaRgb = isDark ? [148, 163, 184] : [100, 116, 139];
  const dateLabel = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  if (desiredPageWidthPt <= MAX_SINGLE_PAGE_PT && desiredPageHeightPt <= MAX_SINGLE_PAGE_PT) {
    const orientation = desiredPageWidthPt >= desiredPageHeightPt ? "landscape" : "portrait";
    const pdf = new jsPDF({
      orientation,
      unit: "pt",
      format: [desiredPageWidthPt, desiredPageHeightPt],
      compress: true,
    });

    pdf.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
    pdf.rect(0, 0, desiredPageWidthPt, desiredPageHeightPt, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(titleRgb[0], titleRgb[1], titleRgb[2]);
    pdf.text("Organization Hierarchy Structure", MARGIN_PT, MARGIN_PT + 12);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(metaRgb[0], metaRgb[1], metaRgb[2]);
    pdf.text(
      `Generated on ${dateLabel}  •  MasterHRMS Complete Hierarchy Export`,
      MARGIN_PT,
      MARGIN_PT + 25
    );

    const xOffset = MARGIN_PT + Math.max(0, (desiredPageWidthPt - MARGIN_PT * 2 - contentWidthPt) / 2);
    const yOffset =
      MARGIN_PT +
      HEADER_PT +
      Math.max(0, (desiredPageHeightPt - MARGIN_PT * 2 - HEADER_PT - contentHeightPt) / 2);

    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", xOffset, yOffset, contentWidthPt, contentHeightPt, undefined, "FAST");
    pdf.save(filename);

    return {
      pages: 1,
      pageWidthPt: desiredPageWidthPt,
      pageHeightPt: desiredPageHeightPt,
    };
  }

  // Deliberate Card-Safe Pagination for extremely large enterprise hierarchies (> 12,000 pt)
  const maxSliceStagePxX = Math.floor(1600 / PX_TO_PT);
  const maxSliceStagePxY = Math.floor(1100 / PX_TO_PT);

  const stageCardIntervalsX = cardBoxes.map((b) => ({
    start: b.left + offsetX,
    end: b.right + offsetX,
  }));
  const stageCardIntervalsY = cardBoxes.map((b) => ({
    start: b.top + offsetY,
    end: b.bottom + offsetY,
  }));

  const xSplits = computeCardSafeSplitPoints(stageWidth, maxSliceStagePxX, stageCardIntervalsX);
  const ySplits = computeCardSafeSplitPoints(stageHeight, maxSliceStagePxY, stageCardIntervalsY);

  const cols = xSplits.length - 1;
  const rows = ySplits.length - 1;
  const totalPages = cols * rows;
  const scaleRatioX = canvas.width / stageWidth;
  const scaleRatioY = canvas.height / stageHeight;

  const firstSliceW = Math.round((xSplits[1] - xSplits[0]) * PX_TO_PT) + MARGIN_PT * 2;
  const firstSliceH = Math.round((ySplits[1] - ySplits[0]) * PX_TO_PT) + MARGIN_PT * 2 + HEADER_PT;

  const pdf = new jsPDF({
    orientation: firstSliceW >= firstSliceH ? "landscape" : "portrait",
    unit: "pt",
    format: [Math.max(595, firstSliceW), Math.max(420, firstSliceH)],
    compress: true,
  });

  const sliceCanvas = document.createElement("canvas");
  const sliceCtx = sliceCanvas.getContext("2d");
  let pageIndex = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pageIndex++;
      const stageX0 = xSplits[c];
      const stageX1 = xSplits[c + 1];
      const stageY0 = ySplits[r];
      const stageY1 = ySplits[r + 1];

      const sliceStageW = stageX1 - stageX0;
      const sliceStageH = stageY1 - stageY0;
      const slicePtW = Math.round(sliceStageW * PX_TO_PT);
      const slicePtH = Math.round(sliceStageH * PX_TO_PT);
      const pageW = Math.max(595, slicePtW + MARGIN_PT * 2);
      const pageH = Math.max(420, slicePtH + MARGIN_PT * 2 + HEADER_PT);

      if (pageIndex > 1) {
        pdf.addPage([pageW, pageH], pageW >= pageH ? "landscape" : "portrait");
      }

      pdf.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
      pdf.rect(0, 0, pageW, pageH, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(titleRgb[0], titleRgb[1], titleRgb[2]);
      pdf.text("Organization Hierarchy Structure", MARGIN_PT, MARGIN_PT + 12);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(metaRgb[0], metaRgb[1], metaRgb[2]);
      pdf.text(
        `Generated on ${dateLabel}  •  Section (Row ${r + 1}/${rows}, Col ${c + 1}/${cols})  •  Page ${pageIndex} of ${totalPages}`,
        MARGIN_PT,
        MARGIN_PT + 25
      );

      const srcX = Math.round(stageX0 * scaleRatioX);
      const srcY = Math.round(stageY0 * scaleRatioY);
      const srcW = Math.max(1, Math.round(sliceStageW * scaleRatioX));
      const srcH = Math.max(1, Math.round(sliceStageH * scaleRatioY));

      sliceCanvas.width = srcW;
      sliceCanvas.height = srcH;
      if (sliceCtx) {
        sliceCtx.fillStyle = stageBg;
        sliceCtx.fillRect(0, 0, srcW, srcH);
        sliceCtx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      }

      pdf.addImage(
        sliceCanvas.toDataURL("image/png"),
        "PNG",
        MARGIN_PT,
        MARGIN_PT + HEADER_PT,
        slicePtW,
        slicePtH,
        undefined,
        "FAST"
      );
    }
  }

  pdf.save(filename);
  return {
    pages: totalPages,
    pageWidthPt: Math.max(595, firstSliceW),
    pageHeightPt: Math.max(420, firstSliceH),
  };
}
