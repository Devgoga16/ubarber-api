import type { Request, Response } from "express";
import { Plan } from "../../models/Plan";

export async function listPublicPlans(_req: Request, res: Response): Promise<void> {
  const plans = await Plan.find({ isActive: true })
    .sort({ sortOrder: 1, priceCents: 1 })
    .select("name description priceCents billingPeriod limits features highlighted whatsappEnabled");
  res.json(plans);
}
