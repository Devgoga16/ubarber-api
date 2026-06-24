import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Invoice } from "../../models/Invoice";
import { Subscription } from "../../models/Subscription";
import { Plan } from "../../models/Plan";
import { INVOICE_STATUSES } from "../../types/roles";
import { AppError } from "../../utils/AppError";
import { addPeriod, issueInvoiceForCurrentCycle } from "../../services/billing";

const listInvoicesQuerySchema = z.object({
  status: z.enum(INVOICE_STATUSES).optional(),
});

export async function listInvoices(req: Request, res: Response): Promise<void> {
  const { status } = listInvoicesQuerySchema.parse(req.query);
  const invoices = await Invoice.find(status ? { status } : {})
    .sort({ dueDate: 1 })
    .populate("businessId", "name ownerName ownerEmail")
    .populate("planId", "name priceCents billingPeriod")
    .lean();
  res.json(invoices);
}

export async function listInvoicesForBusiness(req: Request, res: Response): Promise<void> {
  const invoices = await Invoice.find({ businessId: req.params.businessId })
    .sort({ createdAt: -1 })
    .populate("planId", "name priceCents billingPeriod")
    .lean();
  res.json(invoices);
}

export async function payInvoice(req: Request, res: Response): Promise<void> {
  const invoice = await Invoice.findById(req.params.invoiceId);
  if (!invoice) {
    throw new AppError("Factura no encontrada", 404);
  }
  if (invoice.status === "paid") {
    throw new AppError("Esta factura ya fue pagada", 400);
  }

  const subscription = await Subscription.findById(invoice.subscriptionId);
  const plan = await Plan.findById(invoice.planId);
  if (!subscription || !plan) {
    throw new AppError("Suscripción o plan asociado no encontrado", 400);
  }

  invoice.status = "paid";
  invoice.paidAt = new Date();
  invoice.registeredBy = new Types.ObjectId(req.auth!.userId);
  await invoice.save();

  subscription.payments.push({
    amountCents: invoice.amountCents,
    paidAt: invoice.paidAt,
    note: "Pago de factura",
    registeredBy: invoice.registeredBy,
  });

  const base = subscription.currentPeriodEnd > new Date() ? subscription.currentPeriodEnd : new Date();
  subscription.currentPeriodEnd = addPeriod(base, plan.billingPeriod);
  subscription.status = "active";
  await subscription.save();

  await issueInvoiceForCurrentCycle(subscription, plan);

  res.json(invoice);
}
