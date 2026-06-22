import type { Request, Response } from "express";
import { z } from "zod";
import { Plan } from "../../models/Plan";

const planSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  priceCents: z.number().int().min(0),
  billingPeriod: z.enum(["monthly", "yearly"]),
  limits: z.object({
    maxLocations: z.number().int().min(1),
    maxBarbers: z.number().int().min(1),
    maxAppointmentsPerMonth: z.number().int().min(1),
  }),
  features: z.array(z.string()).default([]),
});

export async function listPlans(_req: Request, res: Response): Promise<void> {
  const plans = await Plan.find().sort({ priceCents: 1 });
  res.json(plans);
}

export async function createPlan(req: Request, res: Response): Promise<void> {
  const data = planSchema.parse(req.body);
  const plan = await Plan.create(data);
  res.status(201).json(plan);
}

export async function updatePlan(req: Request, res: Response): Promise<void> {
  const data = planSchema.partial().parse(req.body);
  const plan = await Plan.findByIdAndUpdate(req.params.id, data, { new: true });
  res.json(plan);
}

export async function setPlanActive(req: Request, res: Response): Promise<void> {
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
  const plan = await Plan.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
  res.json(plan);
}
