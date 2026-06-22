import type { Request, Response } from "express";
import { z } from "zod";
import { Service } from "../../models/Service";
import { AppError } from "../../utils/AppError";

const serviceSchema = z.object({
  name: z.string().min(2),
  durationMinutes: z.number().int().min(5),
  priceCents: z.number().int().min(0),
  locationIds: z.array(z.string()).min(1),
  photo: z.string().optional(),
});

export async function listServices(req: Request, res: Response): Promise<void> {
  const services = await Service.find({ businessId: req.auth!.businessId }).sort({ name: 1 });
  res.json(services);
}

export async function createService(req: Request, res: Response): Promise<void> {
  const data = serviceSchema.parse(req.body);
  const service = await Service.create({ ...data, businessId: req.auth!.businessId! });
  res.status(201).json(service);
}

export async function updateService(req: Request, res: Response): Promise<void> {
  const data = serviceSchema.partial().parse(req.body);
  const service = await Service.findOneAndUpdate(
    { _id: req.params.id, businessId: req.auth!.businessId },
    data,
    { new: true }
  );
  if (!service) {
    throw new AppError("Servicio no encontrado", 404);
  }
  res.json(service);
}

const setStatusSchema = z.object({ isActive: z.boolean() });

export async function setServiceStatus(req: Request, res: Response): Promise<void> {
  const { isActive } = setStatusSchema.parse(req.body);
  const service = await Service.findOneAndUpdate(
    { _id: req.params.id, businessId: req.auth!.businessId },
    { isActive },
    { new: true }
  );
  if (!service) {
    throw new AppError("Servicio no encontrado", 404);
  }
  res.json(service);
}
