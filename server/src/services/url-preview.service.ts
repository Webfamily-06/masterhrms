import dns from "dns";
import net from "net";
import { URL } from "url";

export interface UrlPreviewMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export function isPrivateOrReservedIp(rawIp: string): boolean {
  if (!rawIp) return true;
  const ip = rawIp.trim().toLowerCase();

  // Unwrap IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1 or ::ffff:7f00:1
  if (ip.startsWith("::ffff:")) {
    const mapped = ip.slice("::ffff:".length);
    if (net.isIPv4(mapped)) {
      return isPrivateOrReservedIp(mapped);
    }
    const hexMatch = mapped.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hexMatch) {
      const hi = parseInt(hexMatch[1], 16);
      const lo = parseInt(hexMatch[2], 16);
      const v4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
      return isPrivateOrReservedIp(v4);
    }
    return true;
  }

  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b, c] = parts;
    if (a === 0 || a === 10 || a === 127) return true; // 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8
    if (a === 169 && b === 254) return true; // Link-local & cloud IMDS 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF / TEST-NET-1
    if (a === 198 && (b === 18 || b === 19)) return true; // Benchmarking
    if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
    if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
    if (a >= 224) return true; // Multicast & broadcast/reserved
    return false;
  }

  if (net.isIPv6(ip)) {
    if (
      ip === "::1" ||
      ip === "::" ||
      ip.startsWith("fe8") ||
      ip.startsWith("fe9") ||
      ip.startsWith("fea") ||
      ip.startsWith("feb") ||
      ip.startsWith("fc") ||
      ip.startsWith("fd") ||
      ip.startsWith("ff") ||
      ip.startsWith("2001:db8:")
    ) {
      return true;
    }
    return false;
  }

  return true;
}

function escapeHtml(str: string): string {
  return str
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function assertSafePublicUrl(rawUrl: string): Promise<URL | null> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return null;
  }

  if (parsedUrl.username || parsedUrl.password) {
    return null;
  }

  const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal" ||
    hostname === "metadata"
  ) {
    return null;
  }

  if (net.isIP(hostname)) {
    return isPrivateOrReservedIp(hostname) ? null : parsedUrl;
  }

  const records = await dns.promises.lookup(hostname, { all: true }).catch(() => []);
  if (!records || records.length === 0) {
    return null;
  }

  for (const rec of records) {
    if (!rec.address || isPrivateOrReservedIp(rec.address)) {
      return null;
    }
  }

  return parsedUrl;
}

export class UrlPreviewService {
  public static sanitizeClientPreviews(rawPreviews: any): UrlPreviewMetadata[] | null {
    if (!Array.isArray(rawPreviews) || rawPreviews.length === 0) return null;
    const sanitized: UrlPreviewMetadata[] = [];
    for (const item of rawPreviews.slice(0, 3)) {
      if (!item || typeof item !== "object" || typeof item.url !== "string") continue;
      let parsed: URL;
      try {
        parsed = new URL(item.url.trim());
      } catch {
        continue;
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      let safeImage: string | null = null;
      if (typeof item.image === "string" && item.image.trim()) {
        try {
          const imgUrl = new URL(item.image.trim());
          if (imgUrl.protocol === "http:" || imgUrl.protocol === "https:") {
            safeImage = imgUrl.toString().slice(0, 1000);
          }
        } catch {
          safeImage = null;
        }
      }
      sanitized.push({
        url: parsed.toString().slice(0, 1000),
        title: typeof item.title === "string" ? escapeHtml(item.title.trim()).slice(0, 200) : null,
        description: typeof item.description === "string" ? escapeHtml(item.description.trim()).slice(0, 400) : null,
        image: safeImage,
        siteName: typeof item.siteName === "string" ? escapeHtml(item.siteName.trim()).slice(0, 100) : null,
      });
    }
    return sanitized.length > 0 ? sanitized : null;
  }

  public static async fetchPreview(rawUrl: string): Promise<UrlPreviewMetadata | null> {
    try {
      if (!rawUrl || typeof rawUrl !== "string") return null;

      let currentUrl = await assertSafePublicUrl(rawUrl);
      if (!currentUrl) return null;

      let response: Response | null = null;
      const MAX_REDIRECTS = 3;

      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        try {
          response = await fetch(currentUrl.toString(), {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; MasterHRMSBot/1.0)",
              Accept: "text/html,application/xhtml+xml",
            },
            redirect: "manual",
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (!location || hop === MAX_REDIRECTS) return null;
          let nextCandidate: string;
          try {
            nextCandidate = new URL(location, currentUrl.toString()).toString();
          } catch {
            return null;
          }
          const validatedRedirect = await assertSafePublicUrl(nextCandidate);
          if (!validatedRedirect) return null;
          currentUrl = validatedRedirect;
          continue;
        }
        break;
      }

      if (!response || !response.ok) return null;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        return null;
      }

      const reader = response.body?.getReader();
      if (!reader) return null;

      let html = "";
      let totalBytes = 0;
      const MAX_BYTES = 256 * 1024;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          html += new TextDecoder("utf-8").decode(value, { stream: true });
          if (totalBytes >= MAX_BYTES) {
            reader.cancel();
            break;
          }
        }
      }

      const getMeta = (property: string, name?: string): string | null => {
        const propRegex = new RegExp(
          `<meta[^>]+(?:property|name)=["'](?:${property}|${name || property})["'][^>]+content=["']([^"']+)["']`,
          "i"
        );
        const match = html.match(propRegex);
        if (match && match[1]) return match[1].trim();

        const contentFirstRegex = new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:${property}|${name || property})["']`,
          "i"
        );
        const match2 = html.match(contentFirstRegex);
        return match2 && match2[1] ? match2[1].trim() : null;
      };

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const rawTitle = getMeta("og:title", "title") || (titleMatch ? titleMatch[1].trim() : null);
      const rawDesc = getMeta("og:description", "description");
      const rawImage = getMeta("og:image", "image");
      const rawSiteName = getMeta("og:site_name");

      if (!rawTitle && !rawDesc) return null;

      let resolvedImage: string | null = null;
      if (rawImage) {
        try {
          const candidateImg = new URL(rawImage, currentUrl.origin);
          if (candidateImg.protocol === "http:" || candidateImg.protocol === "https:") {
            resolvedImage = candidateImg.toString();
          }
        } catch {
          resolvedImage = null;
        }
      }

      return {
        url: currentUrl.toString(),
        title: rawTitle ? escapeHtml(rawTitle).slice(0, 200) : null,
        description: rawDesc ? escapeHtml(rawDesc).slice(0, 400) : null,
        image: resolvedImage,
        siteName: rawSiteName ? escapeHtml(rawSiteName).slice(0, 100) : currentUrl.hostname,
      };
    } catch {
      return null;
    }
  }
}
