import jwt from "jsonwebtoken";
import { getJwtSecret } from "./crypto-config";

const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || "7d";

export interface JwtPayload {
  userId: string;
  email: string;
  tenantId?: string | null;
  roles: string[];
  permissions?: string[];
  sessionId?: string;
  isImpersonating?: boolean;
  impersonatorUserId?: string;
  impersonatorEmail?: string;
}

export interface MfaPendingPayload {
  userId: string;
  email: string;
  mfaPending: true;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: getJwtExpiresIn() as any,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  }) as JwtPayload;
}

export function generateMfaToken(payload: { userId: string; email: string }): string {
  return jwt.sign({ ...payload, mfaPending: true }, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: "5m",
  });
}

export function verifyMfaToken(token: string): MfaPendingPayload {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  }) as MfaPendingPayload;
}
