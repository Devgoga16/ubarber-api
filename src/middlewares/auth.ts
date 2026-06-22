import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken, type AuthTokenPayload } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import type { Role } from "../types/roles";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError("No autenticado", 401);
  }

  const token = header.slice("Bearer ".length);
  try {
    req.auth = verifyAuthToken(token);
    next();
  } catch {
    throw new AppError("Token inválido o expirado", 401);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw new AppError("No tienes permisos para esta acción", 403);
    }
    next();
  };
}
