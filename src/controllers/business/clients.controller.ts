import type { Request, Response } from "express";
import { z } from "zod";
import { Client } from "../../models/Client";
import { AppError } from "../../utils/AppError";

const clientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

export async function listClients(req: Request, res: Response): Promise<void> {
  const { search } = req.query;
  const filter: Record<string, unknown> = { businessId: req.auth!.businessId };
  if (typeof search === "string" && search.trim()) {
    filter.$or = [
      { name: { $regex: search.trim(), $options: "i" } },
      { phone: { $regex: search.trim(), $options: "i" } },
    ];
  }
  const clients = await Client.find(filter).sort({ name: 1 });
  res.json(clients);
}

export async function createClient(req: Request, res: Response): Promise<void> {
  const data = clientSchema.parse(req.body);
  const businessId = req.auth!.businessId!;

  const existing = await Client.findOne({ businessId, phone: data.phone });
  if (existing) {
    throw new AppError("Ya existe un cliente con ese teléfono", 409);
  }

  const client = await Client.create({ ...data, businessId });
  res.status(201).json(client);
}

export async function updateClient(req: Request, res: Response): Promise<void> {
  const data = clientSchema.partial().parse(req.body);
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, businessId: req.auth!.businessId },
    data,
    { new: true }
  );
  if (!client) {
    throw new AppError("Cliente no encontrado", 404);
  }
  res.json(client);
}

const setStatusSchema = z.object({ isActive: z.boolean() });

export async function setClientStatus(req: Request, res: Response): Promise<void> {
  const { isActive } = setStatusSchema.parse(req.body);
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, businessId: req.auth!.businessId },
    { isActive },
    { new: true }
  );
  if (!client) {
    throw new AppError("Cliente no encontrado", 404);
  }
  res.json(client);
}
