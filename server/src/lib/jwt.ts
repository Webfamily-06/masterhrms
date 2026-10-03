import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const getJwtSecret = () => process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || "7d";

export interface JwtPayload {
  userId: string;
  email: string;
  tenantId?: string | null;
  roles: string[];
  permissions?: string[];
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
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() as any });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export function generateMfaToken(payload: { userId: string; email: string }): string {
  return jwt.sign({ ...payload, mfaPending: true }, getJwtSecret(), { expiresIn: "5m" });
}

export function verifyMfaToken(token: string): MfaPendingPayload {
  return jwt.verify(token, getJwtSecret()) as MfaPendingPayload;
}
