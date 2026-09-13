import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type Role = "SUPER_ADMIN" | "MASTER_ADMIN" | "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

export interface AuthPayload {
  userId: string;
  role: Role;
  email: string;
  schoolId: string | null;
}

export const PLATFORM_ROLES: Role[] = ["SUPER_ADMIN", "MASTER_ADMIN"];

// A platform admin "stepping into" a school (via ?schoolId=...) gets the same
// write access a school ADMIN has, scoped to that one school.
export const ADMIN_OR_PLATFORM: Role[] = ["ADMIN", "SUPER_ADMIN", "MASTER_ADMIN"];

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }
  const token = header.slice("Bearer ".length);
  try {
    req.user = jwt.verify(token, JWT_SECRET) as AuthPayload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// School-scoped roles are locked to their own school. Platform roles
// (SUPER_ADMIN / MASTER_ADMIN) have no school of their own but may drill
// into any one school's data by passing ?schoolId=... on the request.
export function resolveSchoolId(req: Request): string | undefined {
  if (PLATFORM_ROLES.includes(req.user!.role)) {
    const { schoolId } = req.query;
    return typeof schoolId === "string" ? schoolId : undefined;
  }
  return req.user!.schoolId ?? undefined;
}
