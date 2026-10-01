import { Request } from "express";
import { rawPrisma as prisma } from "../prisma";

export interface ParsedUserAgent {
  browser_name: string;
  os_name: string;
  device_type: string;
  referrer_host?: string | null;
  referrer_path?: string | null;
}

export function parseUserAgent(userAgentHeader: string | undefined): { browser_name: string; os_name: string; device_type: string } {
  const ua = userAgentHeader || "";
  let browser_name = "Unknown Browser";
  let os_name = "Unknown OS";
  let device_type = "desktop";

  // Device detection
  if (/mobile/i.test(ua)) {
    device_type = "mobile";
  } else if (/tablet|ipad/i.test(ua)) {
    device_type = "tablet";
  }

  // OS detection
  if (/windows/i.test(ua)) os_name = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os_name = "macOS";
  else if (/android/i.test(ua)) os_name = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os_name = "iOS";
  else if (/linux/i.test(ua)) os_name = "Linux";

  // Browser detection
  if (/edg/i.test(ua)) browser_name = "Microsoft Edge";
  else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) browser_name = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser_name = "Mozilla Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser_name = "Apple Safari";
  else if (/opr|opera/i.test(ua)) browser_name = "Opera";

  return { browser_name, os_name, device_type };
}

export async function recordLoginHistory(req: Request, userId: string, createdBy?: string): Promise<any> {
  try {
    const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const ip = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");

    const referrerHeader = (req.headers["referer"] as string) || "";
    let referrer_host: string | null = null;
    let referrer_path: string | null = null;
    if (referrerHeader) {
      try {
        const parsedUrl = new URL(referrerHeader);
        referrer_host = parsedUrl.host;
        referrer_path = parsedUrl.pathname;
      } catch {}
    }

    const { browser_name, os_name, device_type } = parseUserAgent(req.headers["user-agent"]);
    const details = JSON.stringify({
      browser_name,
      os_name,
      device_type,
      referrer_host,
      referrer_path,
    });

    const record = await prisma.loginHistory.create({
      data: {
        userId,
        ip,
        date: new Date(),
        details,
        createdBy: createdBy || userId,
      },
    });
    return record;
  } catch (err) {
    console.warn("Failed to record login history:", err);
    return null;
  }
}
