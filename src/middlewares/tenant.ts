import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

/**
 * Exige que el usuario autenticado pertenezca a un negocio (no super_admin)
 * y expone businessId en un lugar fijo para los controllers.
 */
export function requireBusinessContext(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth?.businessId) {
    throw new AppError("Esta acción requiere un negocio asociado", 403);
  }
  next();
}
