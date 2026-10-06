import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { prisma, rawPrisma } from "../prisma";

export interface EmployeeAuthRequest extends AuthRequest {
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentId: string | null;
    designationId: string | null;
    managerId: string | null;
    status: string;
  };
}

/**
 * requireEmployee - Middleware for Employee Self-Service (ESS)
 * Derives the caller employee record securely from req.user (JWT identity)
 * without trusting client-supplied employeeId.
 */
export async function requireEmployee(
  req: EmployeeAuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || !req.user.tenantId) {
    return res.status(401).json({ error: "Unauthorized: Missing user authentication or tenant context" });
  }

  const db = rawPrisma || prisma;
  const userId = req.user.userId;
  const tenantId = req.user.tenantId;

  try {
    const employee = await db.employee.findFirst({
      where: {
        tenantId,
        userId,
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        departmentId: true,
        designationId: true,
        managerId: true,
        status: true,
      },
    });

    if (!employee) {
      return res.status(403).json({
        error: "Forbidden: No employee profile is linked to this account in the current workspace.",
        code: "EMPLOYEE_PROFILE_REQUIRED",
      });
    }

    req.employee = employee;
    next();
  } catch (err: any) {
    console.error("[requireEmployee] Error looking up employee profile:", err);
    return res.status(500).json({ error: "Failed to resolve employee identity" });
  }
}
