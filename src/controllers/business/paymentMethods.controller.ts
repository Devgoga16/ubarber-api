import type { Request, Response } from "express";
import { z } from "zod";
import { PaymentMethod } from "../../models/PaymentMethod";
import { AppError } from "../../utils/AppError";

const paymentMethodSchema = z.object({
  name: z.string().min(2),
});

export async function listPaymentMethods(req: Request, res: Response): Promise<void> {
  const methods = await PaymentMethod.find({ businessId: req.auth!.businessId }).sort({
    name: 1,
  });
  res.json(methods);
}

export async function createPaymentMethod(req: Request, res: Response): Promise<void> {
  const data = paymentMethodSchema.parse(req.body);
  const method = await PaymentMethod.create({ name: data.name, businessId: req.auth!.businessId! });
  res.status(201).json(method);
}

export async function updatePaymentMethod(req: Request, res: Response): Promise<void> {
  const data = paymentMethodSchema.parse(req.body);
  const method = await PaymentMethod.findOneAndUpdate(
    { _id: req.params.id, businessId: req.auth!.businessId },
    data,
    { new: true }
  );
  if (!method) throw new AppError("Método de pago no encontrado", 404);
  res.json(method);
}

export async function setPaymentMethodStatus(req: Request, res: Response): Promise<void> {
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
  const method = await PaymentMethod.findOneAndUpdate(
    { _id: req.params.id, businessId: req.auth!.businessId },
    { isActive },
    { new: true }
  );
  if (!method) throw new AppError("Método de pago no encontrado", 404);
  res.json(method);
}
