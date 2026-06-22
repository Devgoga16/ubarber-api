import type { Request, Response } from "express";
import { Business } from "../../models/Business";
import { ensureBusinessSlug } from "../../services/businessSlug";
import { AppError } from "../../utils/AppError";

export async function getPublicLinkInfo(req: Request, res: Response): Promise<void> {
  const business = await Business.findById(req.auth!.businessId);
  if (!business) {
    throw new AppError("Negocio no encontrado", 404);
  }
  const slug = await ensureBusinessSlug(business);
  res.json({ slug, businessName: business.name });
}
