export const ROLES = ["super_admin", "owner", "manager", "barber"] as const;
export type Role = (typeof ROLES)[number];

export const SUBSCRIPTION_STATUSES = [
  "trial",
  "active",
  "past_due",
  "suspended",
  "cancelled",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const INVOICE_STATUSES = ["pending", "overdue", "paid", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// Días de gracia después del vencimiento de una factura antes de suspender el negocio.
export const INVOICE_GRACE_PERIOD_DAYS = 5;

export const APPOINTMENT_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
