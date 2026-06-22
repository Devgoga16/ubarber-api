import type { Request, Response } from "express";
import { z } from "zod";
import { Business } from "../../models/Business";
import { generateTrustCode } from "../../services/deposit";
import { AppError } from "../../utils/AppError";

export async function getDepositSettings(req: Request, res: Response): Promise<void> {
  const business = await Business.findById(req.auth!.businessId);
  if (!business) {
    throw new AppError("Negocio no encontrado", 404);
  }
  if (!business.trustCode) {
    business.trustCode = generateTrustCode();
    await business.save();
  }
  res.json({
    depositEnabled: business.depositEnabled,
    depositScope: business.depositScope,
    depositType: business.depositType,
    depositValueCents: business.depositValueCents,
    depositValuePercent: business.depositValuePercent,
    trustCode: business.trustCode,
  });
}

const updateDepositSettingsSchema = z.object({
  depositEnabled: z.boolean(),
  depositScope: z.enum(["global", "per_service"]),
  depositType: z.enum(["percentage", "fixed"]),
  depositValueCents: z.number().int().min(0),
  depositValuePercent: z.number().min(0).max(100),
});

export async function updateDepositSettings(req: Request, res: Response): Promise<void> {
  const data = updateDepositSettingsSchema.parse(req.body);
  const business = await Business.findByIdAndUpdate(req.auth!.businessId, data, { new: true });
  if (!business) {
    throw new AppError("Negocio no encontrado", 404);
  }
  res.json({
    depositEnabled: business.depositEnabled,
    depositScope: business.depositScope,
    depositType: business.depositType,
    depositValueCents: business.depositValueCents,
    depositValuePercent: business.depositValuePercent,
    trustCode: business.trustCode,
  });
}

export async function regenerateTrustCode(req: Request, res: Response): Promise<void> {
  const business = await Business.findByIdAndUpdate(
    req.auth!.businessId,
    { trustCode: generateTrustCode() },
    { new: true }
  );
  if (!business) {
    throw new AppError("Negocio no encontrado", 404);
  }
  res.json({ trustCode: business.trustCode });
}
