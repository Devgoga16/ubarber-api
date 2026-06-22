import type { Request, Response } from "express";
import { z } from "zod";
import { Location } from "../../models/Location";
import { assertCanCreateLocation } from "../../services/planLimits";
import { AppError } from "../../utils/AppError";

const weeklyHoursSchema = z.object({
  day: z.number().int().min(0).max(6),
  openTime: z.string(),
  closeTime: z.string(),
  closed: z.boolean().default(false),
});

const locationSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  phone: z.string().optional(),
  hours: z.array(weeklyHoursSchema).default([]),
});

export async function listLocations(req: Request, res: Response): Promise<void> {
  const locations = await Location.find({ businessId: req.auth!.businessId }).sort({ createdAt: 1 });
  res.json(locations);
}

export async function createLocation(req: Request, res: Response): Promise<void> {
  const businessId = req.auth!.businessId!;
  await assertCanCreateLocation(businessId);
  const data = locationSchema.parse(req.body);
  const location = await Location.create({ ...data, businessId });
  res.status(201).json(location);
}

export async function updateLocation(req: Request, res: Response): Promise<void> {
  const data = locationSchema.partial().parse(req.body);
  const location = await Location.findOneAndUpdate(
    { _id: req.params.id, businessId: req.auth!.businessId },
    data,
    { new: true }
  );
  if (!location) {
    throw new AppError("Sede no encontrada", 404);
  }
  res.json(location);
}

const setStatusSchema = z.object({ isActive: z.boolean() });

export async function setLocationStatus(req: Request, res: Response): Promise<void> {
  const { isActive } = setStatusSchema.parse(req.body);
  const businessId = req.auth!.businessId!;

  if (isActive) {
    await assertCanCreateLocation(businessId);
  }

  const location = await Location.findOneAndUpdate(
    { _id: req.params.id, businessId },
    { isActive },
    { new: true }
  );
  if (!location) {
    throw new AppError("Sede no encontrada", 404);
  }
  res.json(location);
}
