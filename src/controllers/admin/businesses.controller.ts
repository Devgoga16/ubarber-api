import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Business } from "../../models/Business";
import { User } from "../../models/User";
import { Plan } from "../../models/Plan";
import { Subscription } from "../../models/Subscription";
import { AppError } from "../../utils/AppError";
import { ensureBusinessSlug } from "../../services/businessSlug";
import { addPeriod, issueInvoiceForCurrentCycle } from "../../services/billing";
import { deleteBusinessCascade } from "../../services/businessDeletion";

const createBusinessSchema = z.object({
  businessName: z.string().min(2),
  phone: z.string().optional(),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(6),
  planId: z.string().min(1),
});

export async function createBusiness(req: Request, res: Response): Promise<void> {
  const data = createBusinessSchema.parse(req.body);

  const plan = await Plan.findById(data.planId);
  if (!plan || !plan.isActive) {
    throw new AppError("Plan inválido o inactivo", 400);
  }

  const existingOwner = await User.findOne({ email: data.ownerEmail.toLowerCase() });
  if (existingOwner) {
    throw new AppError("Ya existe un usuario con ese email", 409);
  }

  const business = await Business.create({
    name: data.businessName,
    ownerName: data.ownerName,
    ownerEmail: data.ownerEmail,
    phone: data.phone,
  });
  await ensureBusinessSlug(business);

  const passwordHash = await bcrypt.hash(data.ownerPassword, 10);
  const owner = await User.create({
    businessId: business._id,
    name: data.ownerName,
    email: data.ownerEmail,
    passwordHash,
    role: "owner",
    locationIds: [],
  });

  const now = new Date();
  const subscription = await Subscription.create({
    businessId: business._id,
    planId: plan._id,
    status: "trial",
    currentPeriodStart: now,
    currentPeriodEnd: addPeriod(now, plan.billingPeriod),
    payments: [],
  });

  await issueInvoiceForCurrentCycle(subscription, plan);

  res.status(201).json({ business, owner: { id: owner._id, email: owner.email }, subscription });
}

export async function listBusinesses(_req: Request, res: Response): Promise<void> {
  const businesses = await Business.find().sort({ createdAt: -1 }).lean();
  const subscriptions = await Subscription.find({
    businessId: { $in: businesses.map((b) => b._id) },
  })
    .populate("planId")
    .lean();

  const subscriptionByBusiness = new Map(subscriptions.map((s) => [s.businessId.toString(), s]));

  res.json(
    businesses.map((business) => ({
      ...business,
      subscription: subscriptionByBusiness.get(business._id.toString()) ?? null,
    }))
  );
}

export async function getBusiness(req: Request, res: Response): Promise<void> {
  const business = await Business.findById(req.params.id).lean();
  if (!business) {
    throw new AppError("Negocio no encontrado", 404);
  }
  const subscription = await Subscription.findOne({ businessId: business._id }).populate("planId");
  res.json({ ...business, subscription });
}

export async function deleteBusiness(req: Request, res: Response): Promise<void> {
  const business = await Business.findById(req.params.id);
  if (!business) {
    throw new AppError("Negocio no encontrado", 404);
  }

  await deleteBusinessCascade(business._id.toString());
  res.status(204).send();
}
