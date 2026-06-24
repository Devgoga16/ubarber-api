import { Invoice } from "../models/Invoice";
import { Subscription, type SubscriptionDocument } from "../models/Subscription";
import type { PlanDocument } from "../models/Plan";
import { INVOICE_GRACE_PERIOD_DAYS } from "../types/roles";

export function addPeriod(start: Date, billingPeriod: "monthly" | "yearly"): Date {
  const end = new Date(start);
  if (billingPeriod === "monthly") {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }
  return end;
}

/** Crea la factura pendiente del ciclo actual de una suscripción (vence al final del período). */
export async function issueInvoiceForCurrentCycle(
  subscription: SubscriptionDocument,
  plan: PlanDocument
): Promise<void> {
  await Invoice.create({
    businessId: subscription.businessId,
    subscriptionId: subscription._id,
    planId: plan._id,
    amountCents: plan.priceCents,
    issuedAt: new Date(),
    dueDate: subscription.currentPeriodEnd,
    status: "pending",
  });
}

/**
 * Corre diariamente: marca como "overdue" las facturas vencidas y suspende la suscripción
 * de los negocios que superaron los 5 días de gracia sin pagar.
 */
export async function runBillingSweep(): Promise<void> {
  const now = new Date();

  await Invoice.updateMany(
    { status: "pending", dueDate: { $lt: now } },
    { $set: { status: "overdue" } }
  );

  const overdueInvoices = await Invoice.find({ status: "overdue" });
  const graceCutoff = new Date(now.getTime() - INVOICE_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  const subscriptionIdsToSuspend = overdueInvoices
    .filter((invoice) => invoice.dueDate < graceCutoff)
    .map((invoice) => invoice.subscriptionId);

  if (subscriptionIdsToSuspend.length > 0) {
    await Subscription.updateMany(
      { _id: { $in: subscriptionIdsToSuspend }, status: { $nin: ["suspended", "cancelled"] } },
      { $set: { status: "suspended" } }
    );
  }

  const pastDueSubscriptionIds = overdueInvoices
    .filter((invoice) => invoice.dueDate >= graceCutoff)
    .map((invoice) => invoice.subscriptionId);

  if (pastDueSubscriptionIds.length > 0) {
    await Subscription.updateMany(
      { _id: { $in: pastDueSubscriptionIds }, status: "active" },
      { $set: { status: "past_due" } }
    );
  }
}
