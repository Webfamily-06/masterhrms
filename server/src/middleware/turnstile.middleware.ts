import { Request, Response, NextFunction } from "express";
import { TurnstileService } from "../services/security/turnstile.service";

/**
 * Express middleware that enforces Cloudflare Turnstile bot verification
 * on public submission endpoints (login, registration, super-login, career apply).
 * 
 * @param actionOrResolver Expected action name (e.g. 'login', 'super_login', 'signup', 'job_apply')
 *                         or a resolver function (req) => string.
 */
export function requireTurnstile(actionOrResolver: string | ((req: Request) => string)) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const expectedAction =
      typeof actionOrResolver === "function" ? actionOrResolver(req) : actionOrResolver;

    // Extract token from standard Cloudflare form field or API JSON payload or header
    const token =
      req.body?.["cf-turnstile-response"] ||
      req.body?.turnstileToken ||
      req.headers["cf-turnstile-response"] ||
      req.headers["x-turnstile-token"];

    const clientIp =
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress;

    const result = await TurnstileService.verify({
      token: typeof token === "string" ? token : undefined,
      action: expectedAction,
      clientIp,
    });

    if (!result.success) {
      const statusCode = result.status === "error" ? 503 : 403;
      return res.status(statusCode).json({
        error: result.reason || "Bot verification challenge required.",
        code: result.code || "TURNSTILE_VERIFICATION_FAILED",
        status: result.status,
      });
    }

    // Attach verification outcome to request for auditing/analytics
    (req as any).turnstile = result;

    next();
  };
}
