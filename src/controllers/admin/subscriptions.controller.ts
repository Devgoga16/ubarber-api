import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Subscription } from "../../models/Subscription";
import { Plan } from "../../models/Plan";
import { SUBSCRIPTION_STATUSES } from "../../types/roles";
import { AppError } from "../../utils/AppError";

const changePlanSchema = z.object({ planId: z.string().min(1) });
const setStatusSchema = z.object({ status: z.enum(SUBSCRIPTION_STATUSES) });
const registerPaymentSchema = z.object({
  amountCents: z.number().int().min(0),
  paidAt: z.coerce.date().default(() => new Date()),
  note: z.string().optional(),
  extendPeriod: z.boolean().default(true),
});

async function findSubscriptionByBusiness(businessId: string) {
  const subscription = await Subscription.findOne({ businessId });
  if (!subscription) {
    throw new AppError("Suscripción no encontrada para este negocio", 404);
  }
  return subscription;
}

function addPeriod(start: Date, billingPeriod: "monthly" | "yearly"): Date {
  const end = new Date(start);
  if (billingPeriod === "monthly") {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }
  return end;
}

export async function changePlan(req: Request, res: Response): Promise<void> {
  const { planId } = changePlanSchema.parse(req.body);
  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive) {
    throw new AppError("Plan inválido o inactivo", 400);
  }

  const subscription = await findSubscriptionByBusiness(req.params.businessId as string);
  subscription.planId = plan._id;
  await subscription.save();
  res.json(subscription);
}

export async function setStatus(req: Request, res: Response): Promise<void> {
  const { status } = setStatusSchema.parse(req.body);
  const subscription = await findSubscriptionByBusiness(req.params.businessId as string);
  subscription.status = status;
  await subscription.save();
  res.json(subscription);
}

export async function registerPayment(req: Request, res: Response): Promise<void> {
  const data = registerPaymentSchema.parse(req.body);
  const subscription = await findSubscriptionByBusiness(req.params.businessId as string);
  const plan = await Plan.findById(subscription.planId);
  if (!plan) {
    throw new AppError("Plan asociado no encontrado", 400);
  }

  subscription.payments.push({
    amountCents: data.amountCents,
    paidAt: data.paidAt,
    note: data.note,
    registeredBy: new Types.ObjectId(req.auth!.userId),
  });

  if (data.extendPeriod) {
    const base = subscription.currentPeriodEnd > new Date() ? subscription.currentPeriodEnd : new Date();
    subscription.currentPeriodEnd = addPeriod(base, plan.billingPeriod);
    subscription.status = "active";
  }

  await subscription.save();
  res.json(subscription);
}
