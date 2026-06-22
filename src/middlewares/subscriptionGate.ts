import type { NextFunction, Request, Response } from "express";
import { Subscription } from "../models/Subscription";
import { AppError } from "../utils/AppError";

/**
 * Bloquea el acceso de un negocio cuyo estado de suscripción no permite operar.
 * El super_admin nunca pasa por este gate (sus rutas viven fuera de /api/business).
 */
export async function subscriptionGate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.auth?.businessId) {
    throw new AppError("Esta acción requiere un negocio asociado", 403);
  }

  const subscription = await Subscription.findOne({ businessId: req.auth.businessId });
  if (!subscription || !["active", "trial"].includes(subscription.status)) {
    throw new AppError("La suscripción de este negocio no está activa. Contacta al soporte.", 402);
  }

  next();
}
