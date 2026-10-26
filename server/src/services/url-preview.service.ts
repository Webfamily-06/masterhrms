import dns from "dns";
import { URL } from "url";

export interface UrlPreviewMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

function isPrivateIp(ip: string): boolean {
  // IPv4 loopback
  if (ip.startsWith("127.")) return true;
  // IPv4 link-local
  if (ip.startsWith("169.254.")) return true;
  // IPv4 RFC1918 Private
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  const parts = ip.split(".").map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }
  // 0.0.0.0 / broadcast
  if (ip === "0.0.0.0" || ip === "255.255.255.255") return true;

  // IPv6 checks
  const lowerIp = ip.toLowerCase();
  if (lowerIp === "::1" || lowerIp === "::" || lowerIp.startsWith("fe80:") || lowerIp.startsWith("fc00:") || lowerIp.startsWith("fd")) {
    return true;
  }

  return false;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class UrlPreviewService {
  public static async fetchPreview(rawUrl: string): Promise<UrlPreviewMetadata | null> {
    try {
      if (!rawUrl || typeof rawUrl !== "string") return null;

      const trimmed = rawUrl.trim();
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(trimmed);
      } catch {
        return null;
      }

      // 1. Strict protocol validation
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return null;
      }

      const hostname = parsedUrl.hostname.toLowerCase();

      // 2. Reject obvious internal names
      if (
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal") ||
        hostname === "127.0.0.1" ||
        hostname === "0.0.0.0" ||
        hostname === "::1"
      ) {
        return null;
      }

      // 3. DNS resolution & SSRF protection
      const lookupResult = await dns.promises.lookup(hostname).catch(() => null);
      if (!lookupResult || !lookupResult.address) {
        return null;
      }

      if (isPrivateIp(lookupResult.address)) {
        return null;
      }

      // 4. Safe HTTP fetch with timeout and size limit
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MasterHRMSBot/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) return null;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        return null;
      }

      // Limit response body reading to 256KB
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

      // 5. Extract OpenGraph / Meta information
      const getMeta = (property: string, name?: string): string | null => {
        const propRegex = new RegExp(`<meta[^>]+(?:property|name)=["'](?:${property}|${name || property})["'][^>]+content=["']([^"']+)["']`, "i");
        const match = html.match(propRegex);
        if (match && match[1]) return match[1].trim();

        // Also check content first format
        const contentFirstRegex = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:${property}|${name || property})["']`, "i");
        const match2 = html.match(contentFirstRegex);
        return match2 && match2[1] ? match2[1].trim() : null;
      };

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const rawTitle = getMeta("og:title", "title") || (titleMatch ? titleMatch[1].trim() : null);
      const rawDesc = getMeta("og:description", "description");
      const rawImage = getMeta("og:image", "image");
      const rawSiteName = getMeta("og:site_name");

      if (!rawTitle && !rawDesc) return null;

      // Ensure image URL is absolute
      let resolvedImage: string | null = null;
      if (rawImage) {
        try {
          resolvedImage = new URL(rawImage, parsedUrl.origin).toString();
        } catch {
          resolvedImage = null;
        }
      }

      return {
        url: parsedUrl.toString(),
        title: rawTitle ? escapeHtml(rawTitle.slice(0, 150)) : null,
        description: rawDesc ? escapeHtml(rawDesc.slice(0, 300)) : null,
        image: resolvedImage,
        siteName: rawSiteName ? escapeHtml(rawSiteName.slice(0, 80)) : parsedUrl.hostname,
      };
    } catch {
      return null;
    }
  }
}
